# Week 3: Transfers, Inventory & Resilience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the complete transfer workflow (8-status state machine with dispute handling), inventory module (sessions, counting, variance, validation), alert system (stock alerts + transfer alerts + in-app notifications), and network resilience (IndexedDB offline queue with auto-retry).

**Architecture:** Services follow the existing pattern in `stock.ts` — synchronous Drizzle transactions with real DB, business logic centralized in `src/lib/server/services/`. All state transitions enforce RBAC via guards from `src/lib/server/auth/guards.ts`. Alerts are triggered as side-effects after stock/transfer operations. Offline queue uses IndexedDB (`idb` package already installed) for movement/inventory operations only.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, Drizzle ORM (better-sqlite3), Zod 4, Vitest (server project, real DB), idb (IndexedDB wrapper), existing RBAC system.

**Test Pattern:** All tests use real DB (no mocking). `beforeEach` seeds fixed test data, `afterAll` cleans up. Synchronous DB transactions (NOT async). Use `expect(() => ...).toThrow()` (NOT `.rejects`). Fixed IDs: `'test-user-001'`, `'test-wh-001'`, `'test-wh-002'`, `'test-prod-001'`.

**Run commands:**
- Tests: `pnpm test:unit -- --run --project server`
- Single file: `pnpm test:unit -- --run --project server src/path/to/test.ts`
- Type check: `pnpm check`
- Dev server: `pnpm dev`

---

## Task Overview

| # | Task | Type | Est. |
|---|------|------|------|
| 1 | Audit Service | service + tests | 15 min |
| 2 | Alert Service | service + tests | 20 min |
| 3 | Transfer Validators | validators + tests | 10 min |
| 4 | Transfer Service (state machine) | service + tests | 40 min |
| 5 | Transfer API Routes | API endpoints | 30 min |
| 6 | Transfer Frontend Pages | UI pages | 30 min |
| 7 | Inventory Validators | validators + tests | 10 min |
| 8 | Inventory Service | service + tests | 25 min |
| 9 | Inventory API Routes | API endpoints | 20 min |
| 10 | Inventory Frontend Pages | UI pages | 25 min |
| 11 | Alert API Routes + UI | API + page | 20 min |
| 12 | Alert Integration (triggers) | wiring alerts into stock/transfer | 15 min |
| 13 | Network Resilience (offline queue + store) | client services + store | 25 min |
| 14 | Integration Tests + Wiring | cross-service tests | 15 min |

---

## Task 1: Audit Service

**Files:**
- Create: `src/lib/server/services/audit.ts`
- Test: `src/lib/server/services/audit.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/server/services/audit.test.ts
import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { auditLogs, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { auditService } from './audit';

function seedTestData() {
	db.delete(auditLogs).run();
	db.delete(user).run();
	db.insert(user)
		.values({
			id: 'test-user-001',
			name: 'Test User',
			email: 'test@example.com',
			emailVerified: false,
			role: 'admin',
			isActive: true
		})
		.run();
}

describe('auditService', () => {
	beforeEach(() => seedTestData());
	afterAll(() => {
		db.delete(auditLogs).run();
		db.delete(user).run();
	});

	test('log creates an audit log entry', () => {
		auditService.log({
			userId: 'test-user-001',
			action: 'create',
			entityType: 'product',
			entityId: 'prod-001',
			newValues: { name: 'Widget', sku: 'W-001' }
		});

		const logs = db.select().from(auditLogs).all();
		expect(logs).toHaveLength(1);
		expect(logs[0].userId).toBe('test-user-001');
		expect(logs[0].action).toBe('create');
		expect(logs[0].entityType).toBe('product');
		expect(logs[0].entityId).toBe('prod-001');
		expect(JSON.parse(logs[0].newValues!)).toEqual({ name: 'Widget', sku: 'W-001' });
		expect(logs[0].oldValues).toBeNull();
	});

	test('log stores both old and new values for updates', () => {
		auditService.log({
			userId: 'test-user-001',
			action: 'update',
			entityType: 'warehouse',
			entityId: 'wh-001',
			oldValues: { name: 'Old Name' },
			newValues: { name: 'New Name' }
		});

		const logs = db.select().from(auditLogs).all();
		expect(logs).toHaveLength(1);
		expect(JSON.parse(logs[0].oldValues!)).toEqual({ name: 'Old Name' });
		expect(JSON.parse(logs[0].newValues!)).toEqual({ name: 'New Name' });
	});

	test('log stores IP address when provided', () => {
		auditService.log({
			userId: 'test-user-001',
			action: 'login',
			entityType: 'user',
			entityId: 'test-user-001',
			ipAddress: '192.168.1.1'
		});

		const logs = db.select().from(auditLogs).all();
		expect(logs).toHaveLength(1);
		expect(logs[0].ipAddress).toBe('192.168.1.1');
	});

	test('getByEntity returns logs for specific entity', () => {
		auditService.log({
			userId: 'test-user-001',
			action: 'create',
			entityType: 'product',
			entityId: 'prod-001'
		});
		auditService.log({
			userId: 'test-user-001',
			action: 'update',
			entityType: 'product',
			entityId: 'prod-001'
		});
		auditService.log({
			userId: 'test-user-001',
			action: 'create',
			entityType: 'product',
			entityId: 'prod-002'
		});

		const logs = auditService.getByEntity('product', 'prod-001');
		expect(logs).toHaveLength(2);
	});
});
```

### Step 2: Run tests to verify they fail

Run: `pnpm test:unit -- --run --project server src/lib/server/services/audit.test.ts`
Expected: FAIL — module './audit' not found

### Step 3: Write the implementation

```typescript
// src/lib/server/services/audit.ts
import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';
import { and, eq, desc } from 'drizzle-orm';

type AuditAction = 'create' | 'update' | 'delete' | 'movement' | 'transfer' | 'inventory' | 'login';
type EntityType = 'product' | 'warehouse' | 'user' | 'movement' | 'transfer' | 'inventory' | 'alert';

interface LogInput {
	userId: string;
	action: AuditAction;
	entityType: EntityType;
	entityId: string;
	oldValues?: Record<string, unknown>;
	newValues?: Record<string, unknown>;
	ipAddress?: string;
}

export const auditService = {
	log(data: LogInput) {
		db.insert(auditLogs)
			.values({
				userId: data.userId,
				action: data.action,
				entityType: data.entityType,
				entityId: data.entityId,
				oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
				newValues: data.newValues ? JSON.stringify(data.newValues) : null,
				ipAddress: data.ipAddress ?? null
			})
			.run();
	},

	getByEntity(entityType: EntityType, entityId: string) {
		return db
			.select()
			.from(auditLogs)
			.where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
			.orderBy(desc(auditLogs.createdAt))
			.all();
	}
};
```

### Step 4: Run tests to verify they pass

Run: `pnpm test:unit -- --run --project server src/lib/server/services/audit.test.ts`
Expected: 4 tests PASS

### Step 5: Commit

```bash
git add src/lib/server/services/audit.ts src/lib/server/services/audit.test.ts
git commit -m "feat(audit): add audit service with logging and entity query"
```

---

## Task 2: Alert Service

**Files:**
- Create: `src/lib/server/services/alerts.ts`
- Test: `src/lib/server/services/alerts.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/server/services/alerts.test.ts
import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { alerts, user, warehouses, products, productWarehouse } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { alertService } from './alerts';

function seedTestData() {
	db.delete(alerts).run();
	db.delete(productWarehouse).run();
	db.delete(products).run();
	db.delete(warehouses).run();
	db.delete(user).run();

	db.insert(user)
		.values([
			{
				id: 'test-user-001',
				name: 'Admin User',
				email: 'admin@test.com',
				emailVerified: false,
				role: 'admin',
				isActive: true
			},
			{
				id: 'test-user-002',
				name: 'Manager User',
				email: 'manager@test.com',
				emailVerified: false,
				role: 'manager',
				isActive: true
			}
		])
		.run();

	db.insert(warehouses)
		.values({ id: 'test-wh-001', name: 'Warehouse A', isActive: true })
		.run();

	db.insert(products)
		.values({
			id: 'test-prod-001',
			sku: 'SKU-001',
			name: 'Test Product',
			minStock: 10,
			isActive: true
		})
		.run();
}

describe('alertService', () => {
	beforeEach(() => seedTestData());
	afterAll(() => {
		db.delete(alerts).run();
		db.delete(productWarehouse).run();
		db.delete(products).run();
		db.delete(warehouses).run();
		db.delete(user).run();
	});

	test('createAlert inserts an alert record', () => {
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-001',
			message: 'Stock bas: Test Product dans Warehouse A',
			productId: 'test-prod-001',
			warehouseId: 'test-wh-001'
		});

		const allAlerts = db.select().from(alerts).all();
		expect(allAlerts).toHaveLength(1);
		expect(allAlerts[0].type).toBe('low_stock');
		expect(allAlerts[0].userId).toBe('test-user-001');
		expect(allAlerts[0].isRead).toBe(false);
	});

	test('getUserAlerts returns only alerts for specific user', () => {
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-001',
			message: 'Alert for user 1'
		});
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-002',
			message: 'Alert for user 2'
		});

		const user1Alerts = alertService.getUserAlerts('test-user-001');
		expect(user1Alerts).toHaveLength(1);
		expect(user1Alerts[0].message).toBe('Alert for user 1');
	});

	test('getUnreadCount returns count of unread alerts', () => {
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-001',
			message: 'Unread 1'
		});
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-001',
			message: 'Unread 2'
		});

		expect(alertService.getUnreadCount('test-user-001')).toBe(2);
	});

	test('markAsRead marks a single alert as read', () => {
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-001',
			message: 'To be read'
		});

		const allAlerts = db.select().from(alerts).all();
		alertService.markAsRead(allAlerts[0].id, 'test-user-001');

		const updated = db.select().from(alerts).where(eq(alerts.id, allAlerts[0].id)).get();
		expect(updated!.isRead).toBe(true);
		expect(updated!.readAt).not.toBeNull();
	});

	test('markAsRead does not mark another user alert', () => {
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-002',
			message: 'Not mine'
		});

		const allAlerts = db.select().from(alerts).all();
		alertService.markAsRead(allAlerts[0].id, 'test-user-001');

		const unchanged = db.select().from(alerts).where(eq(alerts.id, allAlerts[0].id)).get();
		expect(unchanged!.isRead).toBe(false);
	});

	test('markAllAsRead marks all user alerts as read', () => {
		alertService.createAlert({
			type: 'low_stock',
			userId: 'test-user-001',
			message: 'A1'
		});
		alertService.createAlert({
			type: 'transfer_pending',
			userId: 'test-user-001',
			message: 'A2'
		});

		alertService.markAllAsRead('test-user-001');
		expect(alertService.getUnreadCount('test-user-001')).toBe(0);
	});

	test('createStockAlert creates targeted alerts for admins', () => {
		alertService.createStockAlert('test-prod-001', 'test-wh-001', 5, 10);

		const adminAlerts = alertService.getUserAlerts('test-user-001');
		expect(adminAlerts.length).toBeGreaterThanOrEqual(1);
		expect(adminAlerts[0].type).toBe('low_stock');
		expect(adminAlerts[0].productId).toBe('test-prod-001');
	});

	test('createStockAlert deduplicates unread alerts', () => {
		alertService.createStockAlert('test-prod-001', 'test-wh-001', 5, 10);
		alertService.createStockAlert('test-prod-001', 'test-wh-001', 3, 10);

		const adminAlerts = alertService
			.getUserAlerts('test-user-001')
			.filter((a) => a.type === 'low_stock' && a.productId === 'test-prod-001');
		expect(adminAlerts).toHaveLength(1);
	});
});
```

### Step 2: Run tests to verify they fail

Run: `pnpm test:unit -- --run --project server src/lib/server/services/alerts.test.ts`
Expected: FAIL — module './alerts' not found

### Step 3: Write the implementation

```typescript
// src/lib/server/services/alerts.ts
import { db } from '$lib/server/db';
import { alerts, user, userWarehouses } from '$lib/server/db/schema';
import { and, eq, desc, sql, count } from 'drizzle-orm';
import type { Role } from '$lib/server/auth/rbac';
import { hasGlobalScope } from '$lib/server/auth/rbac';

type AlertType =
	| 'low_stock'
	| 'transfer_pending'
	| 'transfer_approved'
	| 'transfer_shipped'
	| 'transfer_received'
	| 'transfer_dispute'
	| 'inventory_started';

interface CreateAlertInput {
	type: AlertType;
	userId: string;
	message: string;
	productId?: string;
	warehouseId?: string;
	transferId?: string;
}

export const alertService = {
	createAlert(data: CreateAlertInput) {
		db.insert(alerts)
			.values({
				type: data.type,
				userId: data.userId,
				message: data.message,
				productId: data.productId ?? null,
				warehouseId: data.warehouseId ?? null,
				transferId: data.transferId ?? null,
				isRead: false
			})
			.run();
	},

	getUserAlerts(userId: string, limit = 50, offset = 0) {
		return db
			.select()
			.from(alerts)
			.where(eq(alerts.userId, userId))
			.orderBy(desc(alerts.createdAt))
			.limit(limit)
			.offset(offset)
			.all();
	},

	getUnreadCount(userId: string): number {
		const result = db
			.select({ count: count() })
			.from(alerts)
			.where(and(eq(alerts.userId, userId), eq(alerts.isRead, false)))
			.get();
		return result?.count ?? 0;
	},

	markAsRead(alertId: string, userId: string) {
		db.update(alerts)
			.set({ isRead: true, readAt: sql`datetime('now')` })
			.where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)))
			.run();
	},

	markAllAsRead(userId: string) {
		db.update(alerts)
			.set({ isRead: true, readAt: sql`datetime('now')` })
			.where(and(eq(alerts.userId, userId), eq(alerts.isRead, false)))
			.run();
	},

	createStockAlert(productId: string, warehouseId: string, currentQty: number, threshold: number) {
		// Get admin users who should receive this alert
		const adminUsers = db
			.select({ id: user.id, role: user.role })
			.from(user)
			.where(
				and(
					eq(user.isActive, true),
					sql`${user.role} IN ('admin', 'admin_manager', 'admin_viewer')`
				)
			)
			.all();

		// Get managers assigned to this warehouse
		const warehouseManagers = db
			.select({ userId: userWarehouses.userId })
			.from(userWarehouses)
			.where(eq(userWarehouses.warehouseId, warehouseId))
			.all();

		const targetUserIds = new Set([
			...adminUsers.map((u) => u.id),
			...warehouseManagers.map((uw) => uw.userId)
		]);

		const message = `Stock bas: quantite ${currentQty} sous le seuil de ${threshold}`;

		for (const userId of targetUserIds) {
			// Deduplicate: skip if unread alert already exists for same product/warehouse/user
			const existing = db
				.select()
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, userId),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, productId),
						eq(alerts.warehouseId, warehouseId),
						eq(alerts.isRead, false)
					)
				)
				.get();

			if (!existing) {
				this.createAlert({
					type: 'low_stock',
					userId,
					message,
					productId,
					warehouseId
				});
			}
		}
	},

	createTransferAlert(
		transferId: string,
		type: AlertType,
		message: string,
		targetUserIds: string[]
	) {
		for (const userId of targetUserIds) {
			this.createAlert({ type, userId, message, transferId });
		}
	}
};
```

### Step 4: Run tests to verify they pass

Run: `pnpm test:unit -- --run --project server src/lib/server/services/alerts.test.ts`
Expected: 7 tests PASS

### Step 5: Commit

```bash
git add src/lib/server/services/alerts.ts src/lib/server/services/alerts.test.ts
git commit -m "feat(alerts): add alert service with stock alerts, deduplication, and read tracking"
```

---

## Task 3: Transfer Validators

**Files:**
- Create: `src/lib/validators/transfer.ts`
- Test: `src/lib/validators/transfer.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/validators/transfer.test.ts
import { describe, test, expect } from 'vitest';
import {
	createTransferSchema,
	receiveTransferSchema,
	rejectTransferSchema,
	resolveDisputeSchema
} from './transfer';

describe('createTransferSchema', () => {
	test('validates a valid transfer request', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-002',
			items: [{ productId: 'prod-001', quantityRequested: 10 }],
			notes: 'Urgent'
		});
		expect(result.success).toBe(true);
	});

	test('rejects same source and destination', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-001',
			items: [{ productId: 'prod-001', quantityRequested: 10 }]
		});
		expect(result.success).toBe(false);
	});

	test('rejects empty items array', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-002',
			items: []
		});
		expect(result.success).toBe(false);
	});

	test('rejects zero quantity', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-002',
			items: [{ productId: 'prod-001', quantityRequested: 0 }]
		});
		expect(result.success).toBe(false);
	});
});

describe('receiveTransferSchema', () => {
	test('validates full reception', () => {
		const result = receiveTransferSchema.safeParse({
			items: [{ transferItemId: 'ti-001', quantityReceived: 10 }]
		});
		expect(result.success).toBe(true);
	});

	test('validates partial reception with anomaly notes', () => {
		const result = receiveTransferSchema.safeParse({
			items: [
				{ transferItemId: 'ti-001', quantityReceived: 7, anomalyNotes: '3 units damaged' }
			]
		});
		expect(result.success).toBe(true);
	});
});

describe('rejectTransferSchema', () => {
	test('requires rejection reason', () => {
		const result = rejectTransferSchema.safeParse({ reason: '' });
		expect(result.success).toBe(false);
	});

	test('validates with reason', () => {
		const result = rejectTransferSchema.safeParse({ reason: 'Stock needed locally' });
		expect(result.success).toBe(true);
	});
});

describe('resolveDisputeSchema', () => {
	test('validates resolution with comment', () => {
		const result = resolveDisputeSchema.safeParse({
			resolution: 'Adjusted stock to match received quantities',
			adjustStock: true
		});
		expect(result.success).toBe(true);
	});

	test('requires resolution comment', () => {
		const result = resolveDisputeSchema.safeParse({ resolution: '', adjustStock: true });
		expect(result.success).toBe(false);
	});
});
```

### Step 2: Run tests to verify they fail

Run: `pnpm test:unit -- --run --project server src/lib/validators/transfer.test.ts`
Expected: FAIL

### Step 3: Write the implementation

```typescript
// src/lib/validators/transfer.ts
import { z } from 'zod';

const transferItemSchema = z.object({
	productId: z.string().min(1),
	quantityRequested: z.number().int().positive()
});

export const createTransferSchema = z
	.object({
		sourceWarehouseId: z.string().min(1),
		destinationWarehouseId: z.string().min(1),
		items: z.array(transferItemSchema).min(1),
		notes: z.string().max(1000).optional()
	})
	.refine((data) => data.sourceWarehouseId !== data.destinationWarehouseId, {
		message: 'Source and destination warehouses must be different'
	});

const receiveItemSchema = z.object({
	transferItemId: z.string().min(1),
	quantityReceived: z.number().int().min(0),
	anomalyNotes: z.string().max(1000).optional()
});

export const receiveTransferSchema = z.object({
	items: z.array(receiveItemSchema).min(1)
});

export const rejectTransferSchema = z.object({
	reason: z.string().min(1).max(1000)
});

export const resolveDisputeSchema = z.object({
	resolution: z.string().min(1).max(2000),
	adjustStock: z.boolean()
});

export type CreateTransfer = z.infer<typeof createTransferSchema>;
export type ReceiveTransfer = z.infer<typeof receiveTransferSchema>;
export type RejectTransfer = z.infer<typeof rejectTransferSchema>;
export type ResolveDispute = z.infer<typeof resolveDisputeSchema>;
```

### Step 4: Run tests to verify they pass

Run: `pnpm test:unit -- --run --project server src/lib/validators/transfer.test.ts`
Expected: All PASS

### Step 5: Commit

```bash
git add src/lib/validators/transfer.ts src/lib/validators/transfer.test.ts
git commit -m "feat(transfer): add transfer Zod validators with refinements"
```

---

## Task 4: Transfer Service (State Machine)

This is the most complex task. The transfer service implements an 8-status state machine with RBAC enforcement.

**Files:**
- Create: `src/lib/server/services/transfers.ts`
- Test: `src/lib/server/services/transfers.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/server/services/transfers.test.ts
import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import {
	transfers,
	transferItems,
	user,
	warehouses,
	products,
	productWarehouse,
	movements
} from '$lib/server/db/schema';
import { transferService } from './transfers';
import { stockService } from './stock';

function seedTestData() {
	db.delete(transferItems).run();
	db.delete(transfers).run();
	db.delete(movements).run();
	db.delete(productWarehouse).run();
	db.delete(products).run();
	db.delete(warehouses).run();
	db.delete(user).run();

	db.insert(user)
		.values([
			{
				id: 'test-user-001',
				name: 'Admin',
				email: 'admin@test.com',
				emailVerified: false,
				role: 'admin',
				isActive: true
			},
			{
				id: 'test-user-002',
				name: 'Manager Source',
				email: 'manager-src@test.com',
				emailVerified: false,
				role: 'manager',
				isActive: true
			},
			{
				id: 'test-user-003',
				name: 'Manager Dest',
				email: 'manager-dest@test.com',
				emailVerified: false,
				role: 'manager',
				isActive: true
			}
		])
		.run();

	db.insert(warehouses)
		.values([
			{ id: 'test-wh-001', name: 'Source WH', isActive: true },
			{ id: 'test-wh-002', name: 'Dest WH', isActive: true }
		])
		.run();

	db.insert(products)
		.values([
			{
				id: 'test-prod-001',
				sku: 'SKU-001',
				name: 'Product A',
				purchasePrice: 1000,
				minStock: 5,
				isActive: true
			},
			{
				id: 'test-prod-002',
				sku: 'SKU-002',
				name: 'Product B',
				purchasePrice: 2000,
				minStock: 3,
				isActive: true
			}
		])
		.run();

	// Seed stock in source warehouse
	db.insert(productWarehouse)
		.values([
			{
				productId: 'test-prod-001',
				warehouseId: 'test-wh-001',
				quantity: 50,
				pump: 1000
			},
			{
				productId: 'test-prod-002',
				warehouseId: 'test-wh-001',
				quantity: 30,
				pump: 2000
			}
		])
		.run();
}

describe('transferService', () => {
	beforeEach(() => seedTestData());
	afterAll(() => {
		db.delete(transferItems).run();
		db.delete(transfers).run();
		db.delete(movements).run();
		db.delete(productWarehouse).run();
		db.delete(products).run();
		db.delete(warehouses).run();
		db.delete(user).run();
	});

	test('createTransfer creates a pending transfer with items', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [
				{ productId: 'test-prod-001', quantityRequested: 10 },
				{ productId: 'test-prod-002', quantityRequested: 5 }
			],
			notes: 'Test transfer'
		});

		expect(transfer.status).toBe('pending');
		expect(transfer.sourceWarehouseId).toBe('test-wh-001');

		const items = db
			.select()
			.from(transferItems)
			.where(
				require('drizzle-orm').eq(transferItems.transferId, transfer.id)
			)
			.all();
		expect(items).toHaveLength(2);
	});

	test('approve changes status from pending to approved', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});

		const approved = transferService.approve(transfer.id, 'test-user-001');
		expect(approved.status).toBe('approved');
		expect(approved.approvedBy).toBe('test-user-001');
	});

	test('reject changes status from pending to rejected with reason', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});

		const rejected = transferService.reject(transfer.id, 'test-user-001', 'Not needed');
		expect(rejected.status).toBe('rejected');
		expect(rejected.rejectionReason).toBe('Not needed');
	});

	test('ship decrements source stock and sets status to shipped', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});
		transferService.approve(transfer.id, 'test-user-001');

		const shipped = transferService.ship(transfer.id, 'test-user-002');
		expect(shipped.status).toBe('shipped');

		const stock = stockService.checkMinStock('test-prod-001', 'test-wh-001');
		expect(stock!.currentQty).toBe(40); // 50 - 10
	});

	test('receive increments destination stock and sets status to received', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});
		transferService.approve(transfer.id, 'test-user-001');
		transferService.ship(transfer.id, 'test-user-002');

		const received = transferService.receive(transfer.id, 'test-user-003', {
			items: [
				{
					transferItemId: '',  // will be looked up in test
					quantityReceived: 10
				}
			]
		});
		expect(received.status).toBe('received');

		const destStock = stockService.checkMinStock('test-prod-001', 'test-wh-002');
		expect(destStock!.currentQty).toBe(10);
	});

	test('partial receive sets status to partially_received then disputed', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});
		transferService.approve(transfer.id, 'test-user-001');
		transferService.ship(transfer.id, 'test-user-002');

		const result = transferService.receive(transfer.id, 'test-user-003', {
			items: [
				{
					transferItemId: '',  // will be looked up
					quantityReceived: 7,
					anomalyNotes: '3 damaged in transit'
				}
			]
		});
		// partially_received automatically transitions to disputed
		expect(result.status).toBe('disputed');
	});

	test('cancel from pending succeeds', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});

		const cancelled = transferService.cancel(transfer.id, 'test-user-002');
		expect(cancelled.status).toBe('cancelled');
	});

	test('cancel after shipped throws error', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});
		transferService.approve(transfer.id, 'test-user-001');
		transferService.ship(transfer.id, 'test-user-002');

		expect(() => transferService.cancel(transfer.id, 'test-user-001')).toThrow(
			'INVALID_TRANSITION'
		);
	});

	test('resolve dispute adjusts stock and sets resolved status', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});
		transferService.approve(transfer.id, 'test-user-001');
		transferService.ship(transfer.id, 'test-user-002');

		// Partial receive → disputed
		transferService.receive(transfer.id, 'test-user-003', {
			items: [
				{
					transferItemId: '',
					quantityReceived: 7,
					anomalyNotes: '3 damaged'
				}
			]
		});

		const resolved = transferService.resolveDispute(transfer.id, 'test-user-001', {
			resolution: 'Written off 3 damaged units',
			adjustStock: true
		});
		expect(resolved.status).toBe('resolved');
	});

	test('ship with insufficient stock throws INSUFFICIENT_STOCK', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 100 }] // only 50 in stock
		});
		transferService.approve(transfer.id, 'test-user-001');

		expect(() => transferService.ship(transfer.id, 'test-user-002')).toThrow(
			'INSUFFICIENT_STOCK'
		);
	});

	test('invalid transition from approved to received throws', () => {
		const transfer = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});
		transferService.approve(transfer.id, 'test-user-001');

		// Cannot receive without shipping first
		expect(() =>
			transferService.receive(transfer.id, 'test-user-003', {
				items: [{ transferItemId: '', quantityReceived: 10 }]
			})
		).toThrow('INVALID_TRANSITION');
	});

	test('getById returns transfer with items', () => {
		const created = transferService.create({
			sourceWarehouseId: 'test-wh-001',
			destinationWarehouseId: 'test-wh-002',
			requestedBy: 'test-user-002',
			items: [{ productId: 'test-prod-001', quantityRequested: 10 }]
		});

		const transfer = transferService.getById(created.id);
		expect(transfer).not.toBeNull();
		expect(transfer!.id).toBe(created.id);
	});
});
```

**Important note for implementer:** The `receive` tests use `transferItemId: ''` as a placeholder. The implementation should look up the actual transfer item IDs and match by productId if transferItemId is empty. Alternatively, the implementer can update the tests after creating the transfer to use the actual IDs from the created transfer items.

### Step 2: Run tests to verify they fail

Run: `pnpm test:unit -- --run --project server src/lib/server/services/transfers.test.ts`
Expected: FAIL

### Step 3: Write the implementation

```typescript
// src/lib/server/services/transfers.ts
import { db } from '$lib/server/db';
import { transfers, transferItems, productWarehouse } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { stockService } from './stock';
import { nanoid } from 'nanoid';

type TransferStatus =
	| 'pending'
	| 'approved'
	| 'rejected'
	| 'shipped'
	| 'received'
	| 'partially_received'
	| 'cancelled'
	| 'disputed'
	| 'resolved';

// Valid state transitions
const VALID_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['shipped', 'cancelled'],
	rejected: [],
	shipped: ['received', 'partially_received'],
	received: [],
	partially_received: ['disputed'],
	cancelled: [],
	disputed: ['resolved'],
	resolved: []
};

function assertTransition(current: TransferStatus, target: TransferStatus) {
	if (!VALID_TRANSITIONS[current]?.includes(target)) {
		throw new Error('INVALID_TRANSITION');
	}
}

interface CreateTransferInput {
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	requestedBy: string;
	items: Array<{ productId: string; quantityRequested: number }>;
	notes?: string;
}

interface ReceiveInput {
	items: Array<{
		transferItemId: string;
		quantityReceived: number;
		anomalyNotes?: string;
	}>;
}

export const transferService = {
	create(data: CreateTransferInput) {
		const transferId = nanoid();

		return db.transaction((tx) => {
			tx.insert(transfers)
				.values({
					id: transferId,
					sourceWarehouseId: data.sourceWarehouseId,
					destinationWarehouseId: data.destinationWarehouseId,
					status: 'pending',
					requestedBy: data.requestedBy,
					notes: data.notes ?? null
				})
				.run();

			for (const item of data.items) {
				tx.insert(transferItems)
					.values({
						transferId,
						productId: item.productId,
						quantityRequested: item.quantityRequested
					})
					.run();
			}

			return tx.select().from(transfers).where(eq(transfers.id, transferId)).get()!;
		});
	},

	getById(transferId: string) {
		const transfer = db.select().from(transfers).where(eq(transfers.id, transferId)).get();
		if (!transfer) return null;

		const items = db
			.select()
			.from(transferItems)
			.where(eq(transferItems.transferId, transferId))
			.all();

		return { ...transfer, items };
	},

	list(filters?: {
		status?: TransferStatus;
		warehouseId?: string;
		limit?: number;
		offset?: number;
	}) {
		let query = db.select().from(transfers).$dynamic();

		const conditions = [];
		if (filters?.status) {
			conditions.push(eq(transfers.status, filters.status as typeof transfers.status.enumValues[number]));
		}
		if (filters?.warehouseId) {
			conditions.push(
				sql`(${transfers.sourceWarehouseId} = ${filters.warehouseId} OR ${transfers.destinationWarehouseId} = ${filters.warehouseId})`
			);
		}

		if (conditions.length > 0) {
			query = query.where(and(...conditions));
		}

		return query
			.limit(filters?.limit ?? 50)
			.offset(filters?.offset ?? 0)
			.all();
	},

	approve(transferId: string, approvedBy: string) {
		const transfer = db.select().from(transfers).where(eq(transfers.id, transferId)).get();
		if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
		assertTransition(transfer.status as TransferStatus, 'approved');

		db.update(transfers)
			.set({
				status: 'approved',
				approvedBy,
				approvedAt: sql`datetime('now')`
			})
			.where(eq(transfers.id, transferId))
			.run();

		return db.select().from(transfers).where(eq(transfers.id, transferId)).get()!;
	},

	reject(transferId: string, rejectedBy: string, reason: string) {
		const transfer = db.select().from(transfers).where(eq(transfers.id, transferId)).get();
		if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
		assertTransition(transfer.status as TransferStatus, 'rejected');

		db.update(transfers)
			.set({
				status: 'rejected',
				approvedBy: rejectedBy,
				rejectedAt: sql`datetime('now')`,
				rejectionReason: reason
			})
			.where(eq(transfers.id, transferId))
			.run();

		return db.select().from(transfers).where(eq(transfers.id, transferId)).get()!;
	},

	ship(transferId: string, shippedBy: string) {
		const transfer = db.select().from(transfers).where(eq(transfers.id, transferId)).get();
		if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
		assertTransition(transfer.status as TransferStatus, 'shipped');

		const items = db
			.select()
			.from(transferItems)
			.where(eq(transferItems.transferId, transferId))
			.all();

		return db.transaction((tx) => {
			// Decrement source stock for each item
			for (const item of items) {
				stockService.recordMovement({
					productId: item.productId,
					warehouseId: transfer.sourceWarehouseId,
					type: 'out',
					quantity: item.quantityRequested,
					reason: 'transfert',
					userId: shippedBy,
					reference: `TRF-${transferId}`
				});

				// Set quantitySent = quantityRequested
				tx.update(transferItems)
					.set({ quantitySent: item.quantityRequested })
					.where(eq(transferItems.id, item.id))
					.run();
			}

			tx.update(transfers)
				.set({
					status: 'shipped',
					shippedBy,
					shippedAt: sql`datetime('now')`
				})
				.where(eq(transfers.id, transferId))
				.run();

			return tx.select().from(transfers).where(eq(transfers.id, transferId)).get()!;
		});
	},

	receive(transferId: string, receivedBy: string, data: ReceiveInput) {
		const transfer = db.select().from(transfers).where(eq(transfers.id, transferId)).get();
		if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
		assertTransition(transfer.status as TransferStatus, 'received');

		const existingItems = db
			.select()
			.from(transferItems)
			.where(eq(transferItems.transferId, transferId))
			.all();

		return db.transaction((tx) => {
			let isPartial = false;

			for (const receiveItem of data.items) {
				// Match by transferItemId or find by product
				let item = receiveItem.transferItemId
					? existingItems.find((i) => i.id === receiveItem.transferItemId)
					: existingItems[data.items.indexOf(receiveItem)];

				if (!item) {
					// Fallback: match by index
					const idx = data.items.indexOf(receiveItem);
					item = existingItems[idx];
				}

				if (!item) throw new Error('TRANSFER_ITEM_NOT_FOUND');

				const quantitySent = item.quantitySent ?? item.quantityRequested;

				if (receiveItem.quantityReceived < quantitySent) {
					isPartial = true;
				}

				// Increment destination stock
				if (receiveItem.quantityReceived > 0) {
					// Get the PUMP from source warehouse for this product
					const sourceStock = db
						.select()
						.from(productWarehouse)
						.where(
							and(
								eq(productWarehouse.productId, item.productId),
								eq(productWarehouse.warehouseId, transfer.sourceWarehouseId)
							)
						)
						.get();

					stockService.recordMovement({
						productId: item.productId,
						warehouseId: transfer.destinationWarehouseId,
						type: 'in',
						quantity: receiveItem.quantityReceived,
						reason: 'transfert',
						userId: receivedBy,
						reference: `TRF-${transferId}`,
						purchasePrice: sourceStock?.pump ?? 0
					});
				}

				tx.update(transferItems)
					.set({
						quantityReceived: receiveItem.quantityReceived,
						anomalyNotes: receiveItem.anomalyNotes ?? null
					})
					.where(eq(transferItems.id, item.id))
					.run();
			}

			const newStatus = isPartial ? 'partially_received' : 'received';

			tx.update(transfers)
				.set({
					status: newStatus,
					receivedBy,
					receivedAt: sql`datetime('now')`
				})
				.where(eq(transfers.id, transferId))
				.run();

			// Auto-transition partially_received to disputed
			if (isPartial) {
				tx.update(transfers)
					.set({
						status: 'disputed',
						disputeReason: 'Reception partielle - ecarts de quantite detectes'
					})
					.where(eq(transfers.id, transferId))
					.run();
			}

			return tx.select().from(transfers).where(eq(transfers.id, transferId)).get()!;
		});
	},

	cancel(transferId: string, cancelledBy: string) {
		const transfer = db.select().from(transfers).where(eq(transfers.id, transferId)).get();
		if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
		assertTransition(transfer.status as TransferStatus, 'cancelled');

		db.update(transfers)
			.set({ status: 'cancelled' })
			.where(eq(transfers.id, transferId))
			.run();

		return db.select().from(transfers).where(eq(transfers.id, transferId)).get()!;
	},

	resolveDispute(
		transferId: string,
		resolvedBy: string,
		data: { resolution: string; adjustStock: boolean }
	) {
		const transfer = db.select().from(transfers).where(eq(transfers.id, transferId)).get();
		if (!transfer) throw new Error('TRANSFER_NOT_FOUND');
		assertTransition(transfer.status as TransferStatus, 'resolved');

		db.update(transfers)
			.set({
				status: 'resolved',
				disputeResolvedBy: resolvedBy,
				disputeResolvedAt: sql`datetime('now')`,
				notes: sql`COALESCE(${transfers.notes}, '') || char(10) || 'Resolution: ' || ${data.resolution}`
			})
			.where(eq(transfers.id, transferId))
			.run();

		return db.select().from(transfers).where(eq(transfers.id, transferId)).get()!;
	}
};
```

### Step 4: Run tests — fix any issues

Run: `pnpm test:unit -- --run --project server src/lib/server/services/transfers.test.ts`
Expected: 10 tests PASS

**Likely fixes needed:**
- The `receive` test uses `transferItemId: ''` — the implementation handles this by falling back to index-based matching
- The `ship` method calls `stockService.recordMovement` which is synchronous — this is correct for better-sqlite3
- Import adjustments may be needed (the test uses `require('drizzle-orm')` inline — replace with a top-level import of `eq`)

### Step 5: Commit

```bash
git add src/lib/server/services/transfers.ts src/lib/server/services/transfers.test.ts
git commit -m "feat(transfers): add transfer service with 8-status state machine"
```

---

## Task 5: Transfer API Routes

**Files:**
- Create: `src/routes/api/v1/transfers/+server.ts`
- Create: `src/routes/api/v1/transfers/[id]/+server.ts`
- Create: `src/routes/api/v1/transfers/[id]/approve/+server.ts`
- Create: `src/routes/api/v1/transfers/[id]/reject/+server.ts`
- Create: `src/routes/api/v1/transfers/[id]/ship/+server.ts`
- Create: `src/routes/api/v1/transfers/[id]/receive/+server.ts`
- Create: `src/routes/api/v1/transfers/[id]/cancel/+server.ts`
- Create: `src/routes/api/v1/transfers/[id]/resolve/+server.ts`

Follow the existing pattern from `src/routes/api/v1/movements/+server.ts`:
- Import `requireAuth`, `requireWarehouseAccess`, `getUserWarehouseIds` from guards
- Import RBAC helpers (`canManage`, `canApprove`)
- Use `json()` for responses, `error()` for HTTP errors
- Parse request body with Zod validators

### Step 1: Write `src/routes/api/v1/transfers/+server.ts`

```typescript
// GET: list transfers (filtered by user's warehouse scope)
// POST: create transfer (requires canManage + source warehouse access)
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireWarehouseAccess, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage } from '$lib/server/auth/rbac';
import type { Role } from '$lib/server/auth/rbac';
import { transferService } from '$lib/server/services/transfers';
import { createTransferSchema } from '$lib/validators/transfer';
import { db } from '$lib/server/db';
import { warehouses, products } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
	const authUser = requireAuth(locals.user);
	const role = (authUser.role ?? 'viewer') as Role;
	const warehouseIds = await getUserWarehouseIds(authUser.id, role);

	const status = url.searchParams.get('status') ?? undefined;
	const warehouseId = url.searchParams.get('warehouseId') ?? undefined;
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const limit = parseInt(url.searchParams.get('limit') ?? '20');

	// If user has scoped access, filter to their warehouses
	const filterWarehouseId = warehouseId ?? (warehouseIds?.length === 1 ? warehouseIds[0] : undefined);

	const transferList = transferService.list({
		status: status as any,
		warehouseId: filterWarehouseId,
		limit,
		offset: (page - 1) * limit
	});

	// Filter out transfers user has no access to
	const filtered = warehouseIds
		? transferList.filter(
				(t) =>
					warehouseIds.includes(t.sourceWarehouseId) ||
					warehouseIds.includes(t.destinationWarehouseId)
			)
		: transferList;

	return json({ data: filtered, meta: { page, limit } });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const authUser = requireAuth(locals.user);
	const role = (authUser.role ?? 'viewer') as Role;
	if (!canManage(role)) throw error(403, 'Insufficient permissions');

	const body = await request.json();
	const parsed = createTransferSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues.map((i) => i.message).join(', '));
	}

	await requireWarehouseAccess(authUser.id, parsed.data.sourceWarehouseId, role);

	// Validate warehouses exist
	const sourceWh = db
		.select()
		.from(warehouses)
		.where(and(eq(warehouses.id, parsed.data.sourceWarehouseId), eq(warehouses.isActive, true)))
		.get();
	if (!sourceWh) throw error(404, 'Source warehouse not found');

	const destWh = db
		.select()
		.from(warehouses)
		.where(
			and(eq(warehouses.id, parsed.data.destinationWarehouseId), eq(warehouses.isActive, true))
		)
		.get();
	if (!destWh) throw error(404, 'Destination warehouse not found');

	// Validate products exist
	for (const item of parsed.data.items) {
		const product = db
			.select()
			.from(products)
			.where(and(eq(products.id, item.productId), eq(products.isActive, true)))
			.get();
		if (!product) throw error(404, `Product ${item.productId} not found`);
	}

	const transfer = transferService.create({
		sourceWarehouseId: parsed.data.sourceWarehouseId,
		destinationWarehouseId: parsed.data.destinationWarehouseId,
		requestedBy: authUser.id,
		items: parsed.data.items,
		notes: parsed.data.notes
	});

	return json(transfer, { status: 201 });
};
```

### Step 2: Write action endpoints

Each action endpoint follows the same pattern. Create one file per action:

**`src/routes/api/v1/transfers/[id]/+server.ts`** — GET single transfer
**`src/routes/api/v1/transfers/[id]/approve/+server.ts`** — POST approve
**`src/routes/api/v1/transfers/[id]/reject/+server.ts`** — POST reject (body: reason)
**`src/routes/api/v1/transfers/[id]/ship/+server.ts`** — POST ship
**`src/routes/api/v1/transfers/[id]/receive/+server.ts`** — POST receive (body: items)
**`src/routes/api/v1/transfers/[id]/cancel/+server.ts`** — POST cancel
**`src/routes/api/v1/transfers/[id]/resolve/+server.ts`** — POST resolve (body: resolution)

Each follows this template:

```typescript
// Example: src/routes/api/v1/transfers/[id]/approve/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guards';
import { canApprove } from '$lib/server/auth/rbac';
import type { Role } from '$lib/server/auth/rbac';
import { transferService } from '$lib/server/services/transfers';

export const POST: RequestHandler = async ({ locals, params }) => {
	const authUser = requireAuth(locals.user);
	const role = (authUser.role ?? 'viewer') as Role;
	if (!canApprove(role)) throw error(403, 'Only admins can approve transfers');

	try {
		const transfer = transferService.approve(params.id, authUser.id);
		return json(transfer);
	} catch (e: any) {
		if (e.message === 'TRANSFER_NOT_FOUND') throw error(404, 'Transfer not found');
		if (e.message === 'INVALID_TRANSITION') throw error(409, 'Invalid status transition');
		throw error(500, 'Internal error');
	}
};
```

**RBAC per action:**
- `approve`: requires `canApprove` (admin, admin_manager)
- `reject`: requires `canApprove` + body has `reason`
- `ship`: requires `canManage` + source warehouse access
- `receive`: requires `canManage` + destination warehouse access + body has `items`
- `cancel`: requires `canManage` for pending, `canApprove` for approved
- `resolve`: requires `canApprove` + body has `resolution` + `adjustStock`

### Step 3: Run type check

Run: `pnpm check`
Expected: No errors in new files

### Step 4: Commit

```bash
git add src/routes/api/v1/transfers/
git commit -m "feat(transfers): add REST API endpoints for transfer CRUD and workflow actions"
```

---

## Task 6: Transfer Frontend Pages

**Files:**
- Modify: `src/routes/(app)/transfers/+page.svelte` (replace placeholder)
- Create: `src/routes/(app)/transfers/+page.server.ts`
- Create: `src/routes/(app)/transfers/new/+page.svelte`
- Create: `src/routes/(app)/transfers/new/+page.server.ts`
- Create: `src/routes/(app)/transfers/[id]/+page.svelte`
- Create: `src/routes/(app)/transfers/[id]/+page.server.ts`

### Step 1: Create transfer list page server

```typescript
// src/routes/(app)/transfers/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import type { Role } from '$lib/server/auth/rbac';
import { transferService } from '$lib/server/services/transfers';
import { db } from '$lib/server/db';
import { warehouses } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	const authUser = requireAuth(locals.user);
	const role = (authUser.role ?? 'viewer') as Role;
	const warehouseIds = await getUserWarehouseIds(authUser.id, role);

	const status = url.searchParams.get('status') ?? undefined;
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const limit = 20;

	const allTransfers = transferService.list({
		status: status as any,
		limit,
		offset: (page - 1) * limit
	});

	// Filter by user scope
	const filtered = warehouseIds
		? allTransfers.filter(
				(t) =>
					warehouseIds.includes(t.sourceWarehouseId) ||
					warehouseIds.includes(t.destinationWarehouseId)
			)
		: allTransfers;

	// Enrich with warehouse names
	const whCache = new Map<string, string>();
	const getWhName = (id: string) => {
		if (!whCache.has(id)) {
			const wh = db.select().from(warehouses).where(eq(warehouses.id, id)).get();
			whCache.set(id, wh?.name ?? 'Unknown');
		}
		return whCache.get(id)!;
	};

	const transfersWithNames = filtered.map((t) => ({
		...t,
		sourceWarehouseName: getWhName(t.sourceWarehouseId),
		destinationWarehouseName: getWhName(t.destinationWarehouseId)
	}));

	return { transfers: transfersWithNames, page, status };
};
```

### Step 2: Create transfer list page UI

The Svelte page should show:
- Status filter tabs (All, Pending, Approved, Shipped, etc.)
- Transfer list with: source → destination, date, status badge, item count
- Click to navigate to detail page
- "New Transfer" button (if `canManage`)

### Step 3: Create transfer detail page

The detail page (`[id]/+page.server.ts`) loads the transfer with items, warehouse names, user names, and provides form actions for state transitions:

```typescript
// Form actions: approve, reject, ship, receive, cancel, resolve
// Each action calls the corresponding transferService method
// Returns { success: true } or fail(400/403/409, { error })
```

### Step 4: Create new transfer page

The new transfer page loads warehouses and products, provides a form to:
1. Select source warehouse
2. Select destination warehouse
3. Add items (search/select product + quantity)
4. Submit creates via form action calling `transferService.create`

### Step 5: Run autofixer on all new Svelte components

Use `svelte-autofixer` MCP tool on each `.svelte` file.

### Step 6: Run type check

Run: `pnpm check`

### Step 7: Commit

```bash
git add src/routes/(app)/transfers/
git commit -m "feat(transfers): add transfer list, detail, and creation pages"
```

---

## Task 7: Inventory Validators

**Files:**
- Create: `src/lib/validators/inventory.ts`
- Test: `src/lib/validators/inventory.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/validators/inventory.test.ts
import { describe, test, expect } from 'vitest';
import { createInventorySchema, countItemSchema } from './inventory';

describe('createInventorySchema', () => {
	test('validates valid inventory session', () => {
		const result = createInventorySchema.safeParse({
			warehouseId: 'wh-001',
			productIds: ['prod-001', 'prod-002']
		});
		expect(result.success).toBe(true);
	});

	test('accepts empty productIds (means all products)', () => {
		const result = createInventorySchema.safeParse({
			warehouseId: 'wh-001'
		});
		expect(result.success).toBe(true);
	});

	test('rejects missing warehouseId', () => {
		const result = createInventorySchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe('countItemSchema', () => {
	test('validates a valid count', () => {
		const result = countItemSchema.safeParse({ countedQuantity: 15 });
		expect(result.success).toBe(true);
	});

	test('accepts zero count', () => {
		const result = countItemSchema.safeParse({ countedQuantity: 0 });
		expect(result.success).toBe(true);
	});

	test('rejects negative count', () => {
		const result = countItemSchema.safeParse({ countedQuantity: -1 });
		expect(result.success).toBe(false);
	});
});
```

### Step 2: Run tests to verify they fail

### Step 3: Write the implementation

```typescript
// src/lib/validators/inventory.ts
import { z } from 'zod';

export const createInventorySchema = z.object({
	warehouseId: z.string().min(1),
	productIds: z.array(z.string().min(1)).optional()
});

export const countItemSchema = z.object({
	countedQuantity: z.number().int().min(0)
});

export type CreateInventory = z.infer<typeof createInventorySchema>;
export type CountItem = z.infer<typeof countItemSchema>;
```

### Step 4: Run tests to verify they pass

### Step 5: Commit

```bash
git add src/lib/validators/inventory.ts src/lib/validators/inventory.test.ts
git commit -m "feat(inventory): add inventory Zod validators"
```

---

## Task 8: Inventory Service

**Files:**
- Create: `src/lib/server/services/inventory.ts`
- Test: `src/lib/server/services/inventory.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/server/services/inventory.test.ts
import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import {
	inventories,
	inventoryItems,
	user,
	warehouses,
	products,
	productWarehouse,
	movements
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { inventoryService } from './inventory';

function seedTestData() {
	db.delete(inventoryItems).run();
	db.delete(inventories).run();
	db.delete(movements).run();
	db.delete(productWarehouse).run();
	db.delete(products).run();
	db.delete(warehouses).run();
	db.delete(user).run();

	db.insert(user)
		.values({
			id: 'test-user-001',
			name: 'Admin',
			email: 'admin@test.com',
			emailVerified: false,
			role: 'admin',
			isActive: true
		})
		.run();

	db.insert(warehouses)
		.values({ id: 'test-wh-001', name: 'Test WH', isActive: true })
		.run();

	db.insert(products)
		.values([
			{ id: 'test-prod-001', sku: 'SKU-001', name: 'Product A', minStock: 5, isActive: true },
			{ id: 'test-prod-002', sku: 'SKU-002', name: 'Product B', minStock: 3, isActive: true }
		])
		.run();

	db.insert(productWarehouse)
		.values([
			{ productId: 'test-prod-001', warehouseId: 'test-wh-001', quantity: 50, pump: 1000 },
			{ productId: 'test-prod-002', warehouseId: 'test-wh-001', quantity: 30, pump: 2000 }
		])
		.run();
}

describe('inventoryService', () => {
	beforeEach(() => seedTestData());
	afterAll(() => {
		db.delete(inventoryItems).run();
		db.delete(inventories).run();
		db.delete(movements).run();
		db.delete(productWarehouse).run();
		db.delete(products).run();
		db.delete(warehouses).run();
		db.delete(user).run();
	});

	test('createSession creates inventory with system quantity snapshot', () => {
		const inventory = inventoryService.createSession({
			warehouseId: 'test-wh-001',
			createdBy: 'test-user-001'
		});

		expect(inventory.status).toBe('in_progress');
		expect(inventory.warehouseId).toBe('test-wh-001');

		const items = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.inventoryId, inventory.id))
			.all();
		expect(items).toHaveLength(2);
		expect(items.find((i) => i.productId === 'test-prod-001')!.systemQuantity).toBe(50);
		expect(items.find((i) => i.productId === 'test-prod-002')!.systemQuantity).toBe(30);
	});

	test('createSession with specific products only includes those products', () => {
		const inventory = inventoryService.createSession({
			warehouseId: 'test-wh-001',
			createdBy: 'test-user-001',
			productIds: ['test-prod-001']
		});

		const items = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.inventoryId, inventory.id))
			.all();
		expect(items).toHaveLength(1);
		expect(items[0].productId).toBe('test-prod-001');
	});

	test('recordCount updates counted quantity and calculates difference', () => {
		const inventory = inventoryService.createSession({
			warehouseId: 'test-wh-001',
			createdBy: 'test-user-001'
		});

		const items = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.inventoryId, inventory.id))
			.all();

		inventoryService.recordCount(items[0].id, {
			countedQuantity: 48,
			countedBy: 'test-user-001'
		});

		const updated = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.id, items[0].id))
			.get();
		expect(updated!.countedQuantity).toBe(48);
		expect(updated!.difference).toBe(-2); // 48 - 50 = -2
	});

	test('validate adjusts stock for items with differences', () => {
		const inventory = inventoryService.createSession({
			warehouseId: 'test-wh-001',
			createdBy: 'test-user-001'
		});

		const items = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.inventoryId, inventory.id))
			.all();

		// Count: prod-001 has 48 (was 50, diff -2), prod-002 has 32 (was 30, diff +2)
		inventoryService.recordCount(items.find((i) => i.productId === 'test-prod-001')!.id, {
			countedQuantity: 48,
			countedBy: 'test-user-001'
		});
		inventoryService.recordCount(items.find((i) => i.productId === 'test-prod-002')!.id, {
			countedQuantity: 32,
			countedBy: 'test-user-001'
		});

		const validated = inventoryService.validate(inventory.id, 'test-user-001');
		expect(validated.status).toBe('validated');

		// Check stock was adjusted
		const pw1 = db
			.select()
			.from(productWarehouse)
			.where(eq(productWarehouse.productId, 'test-prod-001'))
			.get();
		expect(pw1!.quantity).toBe(48);

		const pw2 = db
			.select()
			.from(productWarehouse)
			.where(eq(productWarehouse.productId, 'test-prod-002'))
			.get();
		expect(pw2!.quantity).toBe(32);
	});

	test('validate throws if not all items counted', () => {
		const inventory = inventoryService.createSession({
			warehouseId: 'test-wh-001',
			createdBy: 'test-user-001'
		});

		// Don't count any items
		expect(() => inventoryService.validate(inventory.id, 'test-user-001')).toThrow(
			'INCOMPLETE_COUNT'
		);
	});

	test('getById returns inventory with items', () => {
		const created = inventoryService.createSession({
			warehouseId: 'test-wh-001',
			createdBy: 'test-user-001'
		});

		const inventory = inventoryService.getById(created.id);
		expect(inventory).not.toBeNull();
		expect(inventory!.items).toHaveLength(2);
	});
});
```

### Step 2: Run tests to verify they fail

### Step 3: Write the implementation

```typescript
// src/lib/server/services/inventory.ts
import { db } from '$lib/server/db';
import { inventories, inventoryItems, productWarehouse } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { stockService } from './stock';
import { nanoid } from 'nanoid';

interface CreateSessionInput {
	warehouseId: string;
	createdBy: string;
	productIds?: string[];
}

interface RecordCountInput {
	countedQuantity: number;
	countedBy: string;
}

export const inventoryService = {
	createSession(data: CreateSessionInput) {
		const inventoryId = nanoid();

		return db.transaction((tx) => {
			tx.insert(inventories)
				.values({
					id: inventoryId,
					warehouseId: data.warehouseId,
					status: 'in_progress',
					createdBy: data.createdBy
				})
				.run();

			// Get current stock for this warehouse
			let stockQuery = tx
				.select()
				.from(productWarehouse)
				.where(eq(productWarehouse.warehouseId, data.warehouseId));

			const warehouseStock = stockQuery.all();

			// Filter to specific products if provided
			const filtered = data.productIds
				? warehouseStock.filter((s) => data.productIds!.includes(s.productId))
				: warehouseStock;

			for (const stock of filtered) {
				tx.insert(inventoryItems)
					.values({
						inventoryId,
						productId: stock.productId,
						systemQuantity: stock.quantity
					})
					.run();
			}

			return tx.select().from(inventories).where(eq(inventories.id, inventoryId)).get()!;
		});
	},

	recordCount(inventoryItemId: string, data: RecordCountInput) {
		const item = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.id, inventoryItemId))
			.get();
		if (!item) throw new Error('INVENTORY_ITEM_NOT_FOUND');

		const difference = data.countedQuantity - item.systemQuantity;

		db.update(inventoryItems)
			.set({
				countedQuantity: data.countedQuantity,
				difference,
				countedBy: data.countedBy,
				countedAt: sql`datetime('now')`
			})
			.where(eq(inventoryItems.id, inventoryItemId))
			.run();
	},

	validate(inventoryId: string, validatedBy: string) {
		const inventory = db
			.select()
			.from(inventories)
			.where(eq(inventories.id, inventoryId))
			.get();
		if (!inventory) throw new Error('INVENTORY_NOT_FOUND');
		if (inventory.status !== 'in_progress') throw new Error('INVENTORY_ALREADY_VALIDATED');

		const items = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.inventoryId, inventoryId))
			.all();

		// Check all items have been counted
		const uncounted = items.filter((item) => item.countedQuantity === null);
		if (uncounted.length > 0) throw new Error('INCOMPLETE_COUNT');

		return db.transaction((tx) => {
			// Create adjustment movements for each item with a difference
			for (const item of items) {
				if (item.difference === null || item.difference === 0) continue;

				const type = item.difference > 0 ? 'adjustment_in' : 'adjustment_out';
				const quantity = Math.abs(item.difference);

				stockService.recordMovement({
					productId: item.productId,
					warehouseId: inventory.warehouseId,
					type: type as 'adjustment_in' | 'adjustment_out',
					quantity,
					reason: 'ajustement',
					userId: validatedBy,
					reference: `INV-${inventoryId}`
				});
			}

			tx.update(inventories)
				.set({
					status: 'validated',
					validatedBy,
					validatedAt: sql`datetime('now')`
				})
				.where(eq(inventories.id, inventoryId))
				.run();

			return tx.select().from(inventories).where(eq(inventories.id, inventoryId)).get()!;
		});
	},

	getById(inventoryId: string) {
		const inventory = db
			.select()
			.from(inventories)
			.where(eq(inventories.id, inventoryId))
			.get();
		if (!inventory) return null;

		const items = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.inventoryId, inventoryId))
			.all();

		return { ...inventory, items };
	},

	list(filters?: { warehouseId?: string; status?: string; limit?: number; offset?: number }) {
		let conditions = [];
		if (filters?.warehouseId) {
			conditions.push(eq(inventories.warehouseId, filters.warehouseId));
		}
		if (filters?.status) {
			conditions.push(eq(inventories.status, filters.status as 'in_progress' | 'validated'));
		}

		const query = conditions.length > 0
			? db.select().from(inventories).where(and(...conditions))
			: db.select().from(inventories);

		return query
			.orderBy(sql`${inventories.createdAt} DESC`)
			.limit(filters?.limit ?? 50)
			.offset(filters?.offset ?? 0)
			.all();
	}
};
```

### Step 4: Run tests to verify they pass

Run: `pnpm test:unit -- --run --project server src/lib/server/services/inventory.test.ts`
Expected: 5 tests PASS

### Step 5: Commit

```bash
git add src/lib/server/services/inventory.ts src/lib/server/services/inventory.test.ts
git commit -m "feat(inventory): add inventory service with session creation, counting, and validation"
```

---

## Task 9: Inventory API Routes

**Files:**
- Create: `src/routes/api/v1/inventories/+server.ts`
- Create: `src/routes/api/v1/inventories/[id]/+server.ts`
- Create: `src/routes/api/v1/inventories/[id]/items/[itemId]/+server.ts`
- Create: `src/routes/api/v1/inventories/[id]/validate/+server.ts`

### Step 1: Write the API routes

Follow the same pattern as transfer API routes:

```typescript
// src/routes/api/v1/inventories/+server.ts
// GET: list inventories (warehouse-scoped)
// POST: create session (requires canManage + warehouse access)

// src/routes/api/v1/inventories/[id]/+server.ts
// GET: get inventory with items

// src/routes/api/v1/inventories/[id]/items/[itemId]/+server.ts
// PUT: record count for an item (requires canWrite)

// src/routes/api/v1/inventories/[id]/validate/+server.ts
// POST: validate inventory (requires canManage)
```

### Step 2: Run type check

Run: `pnpm check`

### Step 3: Commit

```bash
git add src/routes/api/v1/inventories/
git commit -m "feat(inventory): add REST API endpoints for inventory sessions"
```

---

## Task 10: Inventory Frontend Pages

**Files:**
- Modify: `src/routes/(app)/inventory/+page.svelte` (replace placeholder)
- Create: `src/routes/(app)/inventory/+page.server.ts`
- Create: `src/routes/(app)/inventory/new/+page.svelte`
- Create: `src/routes/(app)/inventory/new/+page.server.ts`
- Create: `src/routes/(app)/inventory/[id]/+page.svelte`
- Create: `src/routes/(app)/inventory/[id]/+page.server.ts`

### Step 1: Create inventory list page

Server load fetches inventories (warehouse-scoped), enriches with warehouse names and count progress.

### Step 2: Create new inventory session page

Form to select warehouse and optionally filter products by category. Submits via form action.

### Step 3: Create inventory session detail page

The detail page is the most interactive:
- Grid showing: product | SKU | system qty (hidden initially) | counted qty (input) | difference
- Numeric inputs with +/- buttons for mobile-friendly counting
- Barcode scan button to jump to a product in the grid
- "Validate" button to finalize (shows confirmation modal with variance summary)

### Step 4: Run autofixer on all Svelte files

### Step 5: Commit

```bash
git add src/routes/(app)/inventory/
git commit -m "feat(inventory): add inventory session list, creation, and counting pages"
```

---

## Task 11: Alert API Routes + UI

**Files:**
- Create: `src/routes/api/v1/alerts/+server.ts`
- Create: `src/routes/api/v1/alerts/[id]/read/+server.ts`
- Create: `src/routes/api/v1/alerts/read-all/+server.ts`
- Modify: `src/routes/(app)/alerts/+page.svelte` (replace placeholder)
- Create: `src/routes/(app)/alerts/+page.server.ts`

### Step 1: Write alert API routes

```typescript
// src/routes/api/v1/alerts/+server.ts
// GET: list user alerts (paginated)

// src/routes/api/v1/alerts/[id]/read/+server.ts
// PUT: mark single alert as read

// src/routes/api/v1/alerts/read-all/+server.ts
// PUT: mark all alerts as read
```

### Step 2: Create alerts page

The alerts page shows:
- List of alerts sorted by date (newest first)
- Unread alerts highlighted
- Click to mark as read + navigate to related entity
- "Mark all as read" button
- Filter by type (low_stock, transfer_*, inventory_*)

### Step 3: Add notification count to app layout

Modify `src/routes/(app)/+layout.server.ts` to include `unreadAlertCount` from `alertService.getUnreadCount()`. Pass to Header component.

### Step 4: Commit

```bash
git add src/routes/api/v1/alerts/ src/routes/(app)/alerts/ src/routes/(app)/+layout.server.ts
git commit -m "feat(alerts): add alert API, notification page, and unread count in header"
```

---

## Task 12: Alert Integration (Triggers)

Wire alert creation into existing services.

**Files:**
- Modify: `src/routes/api/v1/movements/+server.ts` — call `alertService.createStockAlert` after movement
- Modify: `src/lib/server/services/transfers.ts` — call `alertService.createTransferAlert` on status changes
- Test: `src/lib/server/services/alerts.integration.test.ts`

### Step 1: Add stock alert trigger after movement

In `POST /api/v1/movements`, after `stockService.recordMovement()` succeeds:

```typescript
// Check if stock dropped below minimum
const stockCheck = stockService.checkMinStock(parsed.data.productId, parsed.data.warehouseId);
if (stockCheck && stockCheck.isBelowMin) {
	alertService.createStockAlert(
		parsed.data.productId,
		parsed.data.warehouseId,
		stockCheck.currentQty,
		stockCheck.threshold
	);
}
```

### Step 2: Add transfer alerts in transfer service

After each state transition, create alerts for relevant users:
- `approve` → alert requester ("Transfer approved")
- `reject` → alert requester ("Transfer rejected")
- `ship` → alert destination warehouse managers ("Transfer shipped, awaiting reception")
- `receive/disputed` → alert admins ("Transfer received" or "Transfer dispute")

### Step 3: Write integration test

```typescript
// src/lib/server/services/alerts.integration.test.ts
// Test that creating a movement below min_stock triggers an alert
// Test that transfer state changes create appropriate alerts
```

### Step 4: Commit

```bash
git add src/routes/api/v1/movements/+server.ts src/lib/server/services/transfers.ts src/lib/server/services/alerts.integration.test.ts
git commit -m "feat(alerts): integrate stock and transfer alert triggers"
```

---

## Task 13: Network Resilience (Offline Queue + Store)

**Files:**
- Create: `src/lib/stores/network.ts`
- Create: `src/lib/services/offline-queue.ts`
- Create: `src/lib/stores/offline-queue.ts`
- Create: `src/lib/components/layout/OfflineBanner.svelte`
- Modify: `src/routes/(app)/+layout.svelte` — add OfflineBanner

### Step 1: Create network status store

```typescript
// src/lib/stores/network.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createNetworkStore() {
	const { subscribe, set } = writable(browser ? navigator.onLine : true);

	if (browser) {
		window.addEventListener('online', () => set(true));
		window.addEventListener('offline', () => set(false));
	}

	return { subscribe };
}

export const isOnline = createNetworkStore();
```

### Step 2: Create offline queue service (IndexedDB)

```typescript
// src/lib/services/offline-queue.ts
import { openDB, type IDBPDatabase } from 'idb';
import { browser } from '$app/environment';

const DB_NAME = 'stockflow-offline';
const STORE_NAME = 'pending-operations';

interface PendingOperation {
	id?: number;
	url: string;
	method: string;
	body: unknown;
	timestamp: string;
}

async function getDB(): Promise<IDBPDatabase> {
	return openDB(DB_NAME, 1, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
			}
		}
	});
}

export const offlineQueue = {
	async enqueue(operation: Omit<PendingOperation, 'id'>) {
		if (!browser) return;
		const db = await getDB();
		await db.add(STORE_NAME, operation);
	},

	async flush(): Promise<{ succeeded: number; failed: number }> {
		if (!browser) return { succeeded: 0, failed: 0 };
		const db = await getDB();
		const ops = await db.getAll(STORE_NAME);
		let succeeded = 0;
		let failed = 0;

		for (const op of ops) {
			try {
				const res = await fetch(op.url, {
					method: op.method,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(op.body)
				});

				if (res.ok) {
					await db.delete(STORE_NAME, op.id);
					succeeded++;
				} else if (res.status >= 500) {
					break; // Server down, stop flushing
				} else {
					// 4xx: invalid operation, remove from queue
					await db.delete(STORE_NAME, op.id);
					failed++;
				}
			} catch {
				break; // Network error, stop flushing
			}
		}

		return { succeeded, failed };
	},

	async getPendingCount(): Promise<number> {
		if (!browser) return 0;
		const db = await getDB();
		return db.count(STORE_NAME);
	},

	async clear(): Promise<void> {
		if (!browser) return;
		const db = await getDB();
		await db.clear(STORE_NAME);
	}
};

// Auto-flush on reconnection
if (browser) {
	window.addEventListener('online', () => {
		offlineQueue.flush();
	});
}
```

### Step 3: Create offline queue Svelte store

```typescript
// src/lib/stores/offline-queue.ts
import { writable } from 'svelte/store';
import { offlineQueue } from '$lib/services/offline-queue';
import { browser } from '$app/environment';

function createPendingCountStore() {
	const { subscribe, set } = writable(0);

	async function refresh() {
		if (browser) {
			const count = await offlineQueue.getPendingCount();
			set(count);
		}
	}

	return { subscribe, refresh };
}

export const pendingCount = createPendingCountStore();
```

### Step 4: Create OfflineBanner component

```svelte
<!-- src/lib/components/layout/OfflineBanner.svelte -->
<script lang="ts">
	import { isOnline } from '$lib/stores/network';
	import { pendingCount } from '$lib/stores/offline-queue';
</script>

{#if !$isOnline}
	<div class="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
		Vous etes hors ligne. Les operations seront synchronisees a la reconnexion.
		{#if $pendingCount > 0}
			<span class="ml-2 rounded-full bg-white/20 px-2 py-0.5">{$pendingCount} en attente</span>
		{/if}
	</div>
{/if}
```

### Step 5: Add OfflineBanner to app layout

Add `<OfflineBanner />` at the top of the `(app)/+layout.svelte`, above the main content area.

### Step 6: Run autofixer on OfflineBanner

### Step 7: Commit

```bash
git add src/lib/stores/network.ts src/lib/services/offline-queue.ts src/lib/stores/offline-queue.ts src/lib/components/layout/OfflineBanner.svelte src/routes/\(app\)/+layout.svelte
git commit -m "feat(resilience): add offline queue, network store, and offline banner"
```

---

## Task 14: Integration Tests + Final Wiring

**Files:**
- Create: `src/lib/server/services/transfers.integration.test.ts`
- Modify: Various files for final cleanup

### Step 1: Write end-to-end transfer flow test

```typescript
// src/lib/server/services/transfers.integration.test.ts
import { describe, test, expect, beforeEach, afterAll } from 'vitest';
// Full flow: create → approve → ship → receive → check stock changes
// Full flow: create → approve → ship → partial receive → disputed → resolve
// Test RBAC: non-admin cannot approve
// Test stock: ship decrements source, receive increments destination with correct PUMP
```

### Step 2: Run all tests

Run: `pnpm test:unit -- --run --project server`
Expected: All tests PASS

### Step 3: Run type check

Run: `pnpm check`
Expected: No errors

### Step 4: Final commit

```bash
git add .
git commit -m "feat(week3): add integration tests and final wiring for transfers, inventory, alerts, resilience"
```

---

## Summary of All Commits

1. `feat(audit): add audit service with logging and entity query`
2. `feat(alerts): add alert service with stock alerts, deduplication, and read tracking`
3. `feat(transfer): add transfer Zod validators with refinements`
4. `feat(transfers): add transfer service with 8-status state machine`
5. `feat(transfers): add REST API endpoints for transfer CRUD and workflow actions`
6. `feat(transfers): add transfer list, detail, and creation pages`
7. `feat(inventory): add inventory Zod validators`
8. `feat(inventory): add inventory service with session creation, counting, and validation`
9. `feat(inventory): add REST API endpoints for inventory sessions`
10. `feat(inventory): add inventory session list, creation, and counting pages`
11. `feat(alerts): add alert API, notification page, and unread count in header`
12. `feat(alerts): integrate stock and transfer alert triggers`
13. `feat(resilience): add offline queue, network store, and offline banner`
14. `feat(week3): add integration tests and final wiring`

---

## Dependencies Between Tasks

```
Task 1 (Audit) ──────────────────────────────────────── standalone
Task 2 (Alerts) ─────────────────────────────────────── standalone
Task 3 (Transfer Validators) ────────────────────────── standalone
Task 4 (Transfer Service) ──── depends on Task 3 ────── uses stockService
Task 5 (Transfer API) ──────── depends on Task 4
Task 6 (Transfer UI) ───────── depends on Task 5
Task 7 (Inventory Validators) ───────────────────────── standalone
Task 8 (Inventory Service) ── depends on Task 7 ─────── uses stockService
Task 9 (Inventory API) ─────── depends on Task 8
Task 10 (Inventory UI) ─────── depends on Task 9
Task 11 (Alert API + UI) ───── depends on Task 2
Task 12 (Alert Integration) ── depends on Task 2, 4
Task 13 (Resilience) ───────── standalone (client-side)
Task 14 (Integration) ──────── depends on all above
```

**Parallelizable groups:**
- Group A: Tasks 1, 2, 3, 7, 13 (all standalone)
- Group B: Tasks 4, 8 (after their validators)
- Group C: Tasks 5, 9, 11 (after their services)
- Group D: Tasks 6, 10 (after their APIs)
- Group E: Tasks 12, 14 (final wiring)
