# Week 1 — Foundations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete foundation layer for StockFlow: full Drizzle schema, Better Auth authentication, RBAC middleware, CRUD Users/Warehouses APIs, and responsive app layout.

**Architecture:** SvelteKit 2 full-stack app deployed on Cloudflare Workers. Server-side logic in `src/lib/server/` with Drizzle ORM (SQLite/D1). Better Auth handles email/password auth with session cookies. RBAC enforced via middleware helpers checking role hierarchy + warehouse scope. Route groups `(auth)` for public pages, `(app)` for protected pages. Tailwind CSS 4 mobile-first UI.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Drizzle ORM 0.45, Better Auth, Zod, Tailwind CSS 4, Cloudflare Workers/D1, Paraglide (i18n already configured)

**Current State:** Fresh SvelteKit scaffold with Tailwind, Paraglide i18n, Storybook, Drizzle ORM (only basic `user` table with id+age). No auth, no RBAC, no app routes, no UI components. Missing deps: better-auth, zod, nanoid, dayjs.

---

## Task 1: Install Missing Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install production dependencies**

Run:

```bash
pnpm add better-auth zod nanoid dayjs
```

**Step 2: Install dev dependency for Better Auth CLI**

Run:

```bash
pnpm add -D @better-auth/cli
```

**Step 3: Verify installation**

Run:

```bash
pnpm ls better-auth zod nanoid dayjs
```

Expected: All 4 packages listed with versions.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add better-auth, zod, nanoid, dayjs dependencies"
```

---

## Task 2: Write the Complete Drizzle Schema

**Files:**

- Modify: `src/lib/server/db/schema.ts`

This is the single source of truth for the entire database. All 16 tables defined per the PRD.

**Step 1: Write the complete schema**

Replace the entire contents of `src/lib/server/db/schema.ts` with:

```typescript
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Helper for generating IDs
const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => nanoid());

const timestamp = (name: string) => text(name);
const createdAt = () => timestamp('created_at').default(sql`(datetime('now'))`);
const updatedAt = () => timestamp('updated_at').default(sql`(datetime('now'))`);

// ============================================================================
// BETTER AUTH TABLES (managed by Better Auth — do not rename columns)
// ============================================================================

export const user = sqliteTable(
	'user',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
		image: text('image'),
		role: text('role', {
			enum: ['admin', 'admin_manager', 'manager', 'user', 'admin_viewer', 'viewer']
		})
			.notNull()
			.default('viewer'),
		isActive: integer('is_active', { mode: 'boolean' }).default(true),
		createdAt: text('created_at').default(sql`(datetime('now'))`),
		updatedAt: text('updated_at').default(sql`(datetime('now'))`)
	},
	(table) => [
		index('idx_user_role').on(table.role),
		index('idx_user_active').on(table.isActive),
		uniqueIndex('idx_user_email').on(table.email)
	]
);

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: text('expires_at').notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: text('access_token_expires_at'),
	refreshTokenExpiresAt: text('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: text('expires_at').notNull(),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

// ============================================================================
// BUSINESS TABLES
// ============================================================================

export const warehouses = sqliteTable('warehouses', {
	id: id(),
	name: text('name').notNull(),
	address: text('address'),
	contactName: text('contact_name'),
	contactPhone: text('contact_phone'),
	contactEmail: text('contact_email'),
	isActive: integer('is_active', { mode: 'boolean' }).default(true),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const userWarehouses = sqliteTable(
	'user_warehouses',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		warehouseId: text('warehouse_id')
			.notNull()
			.references(() => warehouses.id, { onDelete: 'cascade' })
	},
	(table) => [
		index('idx_uw_user').on(table.userId),
		index('idx_uw_warehouse').on(table.warehouseId)
	]
);

export const categories = sqliteTable('categories', {
	id: id(),
	name: text('name').notNull(),
	parentId: text('parent_id'),
	createdAt: createdAt()
});

export const products = sqliteTable(
	'products',
	{
		id: id(),
		sku: text('sku').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		categoryId: text('category_id').references(() => categories.id),
		unit: text('unit').notNull().default('unité'),
		purchasePrice: real('purchase_price').default(0),
		salePrice: real('sale_price').default(0),
		minStock: integer('min_stock').default(0),
		isActive: integer('is_active', { mode: 'boolean' }).default(true),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		uniqueIndex('idx_products_sku').on(table.sku),
		index('idx_products_name').on(table.name),
		index('idx_products_category').on(table.categoryId)
	]
);

export const productWarehouse = sqliteTable(
	'product_warehouse',
	{
		productId: text('product_id')
			.notNull()
			.references(() => products.id),
		warehouseId: text('warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		quantity: integer('quantity').default(0),
		minStock: integer('min_stock'),
		pump: real('pump').default(0),
		updatedAt: updatedAt()
	},
	(table) => [
		index('idx_pw_product').on(table.productId),
		index('idx_pw_warehouse').on(table.warehouseId)
	]
);

export const movements = sqliteTable(
	'movements',
	{
		id: id(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id),
		warehouseId: text('warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		type: text('type', {
			enum: ['in', 'out', 'adjustment_in', 'adjustment_out']
		}).notNull(),
		quantity: integer('quantity').notNull(),
		reason: text('reason').notNull(),
		reference: text('reference'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		createdAt: createdAt()
	},
	(table) => [
		index('idx_movements_product').on(table.productId),
		index('idx_movements_warehouse').on(table.warehouseId),
		index('idx_movements_date').on(table.createdAt),
		index('idx_movements_type').on(table.type)
	]
);

export const transfers = sqliteTable(
	'transfers',
	{
		id: id(),
		sourceWarehouseId: text('source_warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		destinationWarehouseId: text('destination_warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		status: text('status', {
			enum: [
				'pending',
				'approved',
				'rejected',
				'shipped',
				'received',
				'partially_received',
				'cancelled',
				'disputed'
			]
		})
			.notNull()
			.default('pending'),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => user.id),
		approvedBy: text('approved_by').references(() => user.id),
		shippedBy: text('shipped_by').references(() => user.id),
		receivedBy: text('received_by').references(() => user.id),
		requestedAt: text('requested_at').default(sql`(datetime('now'))`),
		approvedAt: text('approved_at'),
		rejectedAt: text('rejected_at'),
		shippedAt: text('shipped_at'),
		receivedAt: text('received_at'),
		notes: text('notes'),
		rejectionReason: text('rejection_reason'),
		disputeReason: text('dispute_reason'),
		disputeResolvedBy: text('dispute_resolved_by').references(() => user.id),
		disputeResolvedAt: text('dispute_resolved_at')
	},
	(table) => [
		index('idx_transfers_status').on(table.status),
		index('idx_transfers_source').on(table.sourceWarehouseId),
		index('idx_transfers_dest').on(table.destinationWarehouseId)
	]
);

export const transferItems = sqliteTable('transfer_items', {
	id: id(),
	transferId: text('transfer_id')
		.notNull()
		.references(() => transfers.id, { onDelete: 'cascade' }),
	productId: text('product_id')
		.notNull()
		.references(() => products.id),
	quantityRequested: integer('quantity_requested').notNull(),
	quantitySent: integer('quantity_sent'),
	quantityReceived: integer('quantity_received'),
	anomalyNotes: text('anomaly_notes')
});

export const inventories = sqliteTable('inventories', {
	id: id(),
	warehouseId: text('warehouse_id')
		.notNull()
		.references(() => warehouses.id),
	status: text('status', { enum: ['in_progress', 'validated'] })
		.notNull()
		.default('in_progress'),
	createdBy: text('created_by')
		.notNull()
		.references(() => user.id),
	validatedBy: text('validated_by').references(() => user.id),
	createdAt: createdAt(),
	validatedAt: text('validated_at')
});

export const inventoryItems = sqliteTable('inventory_items', {
	id: id(),
	inventoryId: text('inventory_id')
		.notNull()
		.references(() => inventories.id, { onDelete: 'cascade' }),
	productId: text('product_id')
		.notNull()
		.references(() => products.id),
	systemQuantity: integer('system_quantity').notNull(),
	countedQuantity: integer('counted_quantity'),
	difference: integer('difference'),
	countedBy: text('counted_by').references(() => user.id),
	countedAt: text('counted_at')
});

export const alerts = sqliteTable(
	'alerts',
	{
		id: id(),
		type: text('type', {
			enum: [
				'low_stock',
				'transfer_pending',
				'transfer_approved',
				'transfer_shipped',
				'transfer_received',
				'transfer_dispute',
				'inventory_started'
			]
		}).notNull(),
		productId: text('product_id').references(() => products.id),
		warehouseId: text('warehouse_id').references(() => warehouses.id),
		transferId: text('transfer_id').references(() => transfers.id),
		message: text('message').notNull(),
		isRead: integer('is_read', { mode: 'boolean' }).default(false),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		createdAt: createdAt(),
		readAt: text('read_at')
	},
	(table) => [index('idx_alerts_user').on(table.userId), index('idx_alerts_read').on(table.isRead)]
);

export const auditLogs = sqliteTable(
	'audit_logs',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		action: text('action', {
			enum: ['create', 'update', 'delete', 'movement', 'transfer', 'inventory', 'login']
		}).notNull(),
		entityType: text('entity_type', {
			enum: ['product', 'warehouse', 'user', 'movement', 'transfer', 'inventory', 'alert']
		}).notNull(),
		entityId: text('entity_id').notNull(),
		oldValues: text('old_values'),
		newValues: text('new_values'),
		ipAddress: text('ip_address'),
		createdAt: createdAt()
	},
	(table) => [
		index('idx_logs_user').on(table.userId),
		index('idx_logs_entity').on(table.entityType, table.entityId),
		index('idx_logs_date').on(table.createdAt)
	]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	warehouses: many(userWarehouses),
	movements: many(movements),
	alerts: many(alerts)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

export const warehouseRelations = relations(warehouses, ({ many }) => ({
	users: many(userWarehouses),
	productStock: many(productWarehouse),
	movements: many(movements)
}));

export const userWarehouseRelations = relations(userWarehouses, ({ one }) => ({
	user: one(user, { fields: [userWarehouses.userId], references: [user.id] }),
	warehouse: one(warehouses, { fields: [userWarehouses.warehouseId], references: [warehouses.id] })
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
	parent: one(categories, { fields: [categories.parentId], references: [categories.id] }),
	products: many(products)
}));

export const productRelations = relations(products, ({ one, many }) => ({
	category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
	warehouseStock: many(productWarehouse),
	movements: many(movements)
}));

export const productWarehouseRelations = relations(productWarehouse, ({ one }) => ({
	product: one(products, { fields: [productWarehouse.productId], references: [products.id] }),
	warehouse: one(warehouses, {
		fields: [productWarehouse.warehouseId],
		references: [warehouses.id]
	})
}));

export const movementRelations = relations(movements, ({ one }) => ({
	product: one(products, { fields: [movements.productId], references: [products.id] }),
	warehouse: one(warehouses, { fields: [movements.warehouseId], references: [warehouses.id] }),
	user: one(user, { fields: [movements.userId], references: [user.id] })
}));

export const transferRelations = relations(transfers, ({ one, many }) => ({
	sourceWarehouse: one(warehouses, {
		fields: [transfers.sourceWarehouseId],
		references: [warehouses.id],
		relationName: 'sourceWarehouse'
	}),
	destinationWarehouse: one(warehouses, {
		fields: [transfers.destinationWarehouseId],
		references: [warehouses.id],
		relationName: 'destinationWarehouse'
	}),
	requestedByUser: one(user, {
		fields: [transfers.requestedBy],
		references: [user.id],
		relationName: 'requestedBy'
	}),
	items: many(transferItems)
}));

export const transferItemRelations = relations(transferItems, ({ one }) => ({
	transfer: one(transfers, { fields: [transferItems.transferId], references: [transfers.id] }),
	product: one(products, { fields: [transferItems.productId], references: [products.id] })
}));

export const inventoryRelations = relations(inventories, ({ one, many }) => ({
	warehouse: one(warehouses, { fields: [inventories.warehouseId], references: [warehouses.id] }),
	createdByUser: one(user, { fields: [inventories.createdBy], references: [user.id] }),
	items: many(inventoryItems)
}));

export const inventoryItemRelations = relations(inventoryItems, ({ one }) => ({
	inventory: one(inventories, {
		fields: [inventoryItems.inventoryId],
		references: [inventories.id]
	}),
	product: one(products, { fields: [inventoryItems.productId], references: [products.id] })
}));

export const alertRelations = relations(alerts, ({ one }) => ({
	user: one(user, { fields: [alerts.userId], references: [user.id] }),
	product: one(products, { fields: [alerts.productId], references: [products.id] }),
	warehouse: one(warehouses, { fields: [alerts.warehouseId], references: [warehouses.id] })
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
	user: one(user, { fields: [auditLogs.userId], references: [user.id] })
}));
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

Expected: No errors related to schema.ts.

**Step 3: Commit**

```bash
git add src/lib/server/db/schema.ts
git commit -m "feat(db): complete Drizzle schema with all 16 tables, indexes, and relations"
```

---

## Task 3: Update Database Client for D1 Compatibility

The current `src/lib/server/db/index.ts` uses `better-sqlite3` directly. For Cloudflare D1 compatibility in production, we need to support both local dev (better-sqlite3) and D1 (via platform env). However, for Week 1 dev we keep better-sqlite3 for local and will adapt for D1 later when configuring wrangler bindings.

**Files:**

- Modify: `src/lib/server/db/index.ts`

**Step 1: Update the db client to export schema for relational queries**

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new Database(env.DATABASE_URL);

export const db = drizzle(client, { schema });

export type Database = typeof db;
```

No change needed — the current file already does this correctly. Just add the `Database` type export.

**Step 2: Verify no errors**

Run:

```bash
pnpm check
```

**Step 3: Commit (if changed)**

```bash
git add src/lib/server/db/index.ts
git commit -m "feat(db): add Database type export"
```

---

## Task 4: Push Schema to Local Database

**Step 1: Create .env file if it doesn't exist**

Run:

```bash
test -f .env || cp .env.example .env
```

**Step 2: Push schema to local DB**

Run:

```bash
DATABASE_URL=local.db pnpm db:push
```

Expected: All 16 tables created successfully. Drizzle will show each table being created.

**Step 3: Verify with Drizzle Studio (optional manual check)**

Run:

```bash
DATABASE_URL=local.db pnpm db:studio
```

Expected: Opens browser showing all tables. Close with Ctrl+C after verifying.

**Step 4: Commit**

```bash
git add .env.example
git commit -m "chore(db): verify schema push to local database"
```

---

## Task 5: Configure Better Auth

**Files:**

- Create: `src/lib/server/auth.ts`
- Create: `src/lib/auth-client.ts`

**Step 1: Create the server-side Better Auth configuration**

Create `src/lib/server/auth.ts`:

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: {
		enabled: true
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24 // refresh daily
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'viewer',
				input: true
			},
			isActive: {
				type: 'boolean',
				required: false,
				defaultValue: true,
				input: false,
				fieldName: 'is_active'
			}
		}
	}
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
```

**Step 2: Create the client-side auth helper**

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

Expected: No type errors. Note: Better Auth may have specific type expectations — if there are issues, we adjust in a follow-up step.

**Step 4: Commit**

```bash
git add src/lib/server/auth.ts src/lib/auth-client.ts
git commit -m "feat(auth): configure Better Auth with Drizzle adapter and email/password"
```

---

## Task 6: Create Better Auth API Route

**Files:**

- Create: `src/routes/api/auth/[...all]/+server.ts`

**Step 1: Create the catch-all auth API route**

Create `src/routes/api/auth/[...all]/+server.ts`:

```typescript
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) =>
	svelteKitHandler({ event, resolve: () => auth });
export const POST: RequestHandler = async (event) =>
	svelteKitHandler({ event, resolve: () => auth });
```

**Step 2: Verify no compilation errors**

Run:

```bash
pnpm check
```

**Step 3: Commit**

```bash
git add src/routes/api/auth/
git commit -m "feat(auth): add Better Auth catch-all API route"
```

---

## Task 7: Update SvelteKit Hooks for Auth + Paraglide

**Files:**

- Modify: `src/hooks.server.ts`
- Modify: `src/app.d.ts`

**Step 1: Update app.d.ts with Locals types**

Replace `src/app.d.ts`:

```typescript
import type { Session, User } from '$lib/server/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: User | null;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}
	}
}

export {};
```

**Step 2: Update hooks.server.ts to chain auth + paraglide**

Replace `src/hooks.server.ts`:

```typescript
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { auth } from '$lib/server/auth';

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

export const handle: Handle = sequence(handleAuth, handleParaglide);
```

**Step 3: Verify compilation**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/hooks.server.ts src/app.d.ts
git commit -m "feat(auth): add session middleware to hooks, type App.Locals"
```

---

## Task 8: Create RBAC Helpers

**Files:**

- Create: `src/lib/server/auth/rbac.ts`
- Create: `src/lib/server/auth/rbac.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/server/auth/rbac.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { requireRole, hasGlobalScope, canWrite, canManage, canApprove, type Role } from './rbac';

describe('RBAC helpers', () => {
	describe('requireRole', () => {
		it('should not throw when user has sufficient role', () => {
			expect(() => requireRole('admin', 'manager')).not.toThrow();
		});

		it('should throw 403 when user has insufficient role', () => {
			expect(() => requireRole('viewer', 'manager')).toThrow();
		});

		it('should not throw when roles are equal', () => {
			expect(() => requireRole('manager', 'manager')).not.toThrow();
		});
	});

	describe('hasGlobalScope', () => {
		it('should return true for admin', () => {
			expect(hasGlobalScope('admin')).toBe(true);
		});

		it('should return true for admin_manager', () => {
			expect(hasGlobalScope('admin_manager')).toBe(true);
		});

		it('should return true for admin_viewer', () => {
			expect(hasGlobalScope('admin_viewer')).toBe(true);
		});

		it('should return false for manager', () => {
			expect(hasGlobalScope('manager')).toBe(false);
		});

		it('should return false for user', () => {
			expect(hasGlobalScope('user')).toBe(false);
		});

		it('should return false for viewer', () => {
			expect(hasGlobalScope('viewer')).toBe(false);
		});
	});

	describe('canWrite', () => {
		it('should return true for admin', () => {
			expect(canWrite('admin')).toBe(true);
		});

		it('should return true for user', () => {
			expect(canWrite('user')).toBe(true);
		});

		it('should return false for admin_viewer', () => {
			expect(canWrite('admin_viewer')).toBe(false);
		});

		it('should return false for viewer', () => {
			expect(canWrite('viewer')).toBe(false);
		});
	});

	describe('canManage', () => {
		it('should return true for admin', () => {
			expect(canManage('admin')).toBe(true);
		});

		it('should return true for manager', () => {
			expect(canManage('manager')).toBe(true);
		});

		it('should return false for user', () => {
			expect(canManage('user')).toBe(false);
		});
	});

	describe('canApprove', () => {
		it('should return true for admin', () => {
			expect(canApprove('admin')).toBe(true);
		});

		it('should return true for admin_manager', () => {
			expect(canApprove('admin_manager')).toBe(true);
		});

		it('should return false for manager', () => {
			expect(canApprove('manager')).toBe(false);
		});
	});
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test:unit -- --run --project server --reporter verbose src/lib/server/auth/rbac.test.ts
```

Expected: FAIL — module `./rbac` not found.

**Step 3: Write the RBAC implementation**

Create `src/lib/server/auth/rbac.ts`:

```typescript
import { error } from '@sveltejs/kit';

export type Role = 'admin' | 'admin_manager' | 'manager' | 'user' | 'admin_viewer' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
	admin: 100,
	admin_manager: 80,
	manager: 60,
	user: 40,
	admin_viewer: 20,
	viewer: 10
};

const GLOBAL_SCOPE_ROLES: Role[] = ['admin', 'admin_manager', 'admin_viewer'];
const READ_ONLY_ROLES: Role[] = ['admin_viewer', 'viewer'];
const MANAGEMENT_ROLES: Role[] = ['admin', 'admin_manager', 'manager'];
const APPROVAL_ROLES: Role[] = ['admin', 'admin_manager'];

export function requireRole(userRole: Role, minRole: Role): void {
	if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
		error(403, 'Accès non autorisé');
	}
}

export function hasGlobalScope(role: Role): boolean {
	return GLOBAL_SCOPE_ROLES.includes(role);
}

export function canWrite(role: Role): boolean {
	return !READ_ONLY_ROLES.includes(role);
}

export function canManage(role: Role): boolean {
	return MANAGEMENT_ROLES.includes(role);
}

export function canApprove(role: Role): boolean {
	return APPROVAL_ROLES.includes(role);
}
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test:unit -- --run --project server --reporter verbose src/lib/server/auth/rbac.test.ts
```

Expected: All 14 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/server/auth/
git commit -m "feat(auth): add RBAC helpers with tests (6 roles, hierarchy, scope)"
```

---

## Task 9: Create Warehouse Access Guard

**Files:**

- Create: `src/lib/server/auth/guards.ts`
- Create: `src/lib/server/auth/guards.test.ts`

**Step 1: Write the failing test**

Create `src/lib/server/auth/guards.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { requireAuth } from './guards';

describe('requireAuth', () => {
	it('should throw 401 when user is null', () => {
		expect(() => requireAuth(null)).toThrow();
	});

	it('should return user when authenticated', () => {
		const mockUser = { id: '123', role: 'admin', name: 'Test', email: 'test@test.com' };
		expect(requireAuth(mockUser as any)).toEqual(mockUser);
	});
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm test:unit -- --run --project server --reporter verbose src/lib/server/auth/guards.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the guards implementation**

Create `src/lib/server/auth/guards.ts`:

```typescript
import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { userWarehouses } from '$lib/server/db/schema';
import { hasGlobalScope, type Role } from './rbac';
import type { User } from '$lib/server/auth';

export function requireAuth(user: User | null): User {
	if (!user) {
		error(401, 'Authentification requise');
	}
	return user;
}

export async function requireWarehouseAccess(
	userId: string,
	warehouseId: string,
	role: Role
): Promise<void> {
	if (hasGlobalScope(role)) return;

	const access = await db.query.userWarehouses.findFirst({
		where: and(eq(userWarehouses.userId, userId), eq(userWarehouses.warehouseId, warehouseId))
	});

	if (!access) {
		error(403, 'Accès non autorisé à cet entrepôt');
	}
}

export async function getUserWarehouseIds(userId: string, role: Role): Promise<string[] | null> {
	if (hasGlobalScope(role)) return null; // null means "all warehouses"

	const rows = await db.query.userWarehouses.findMany({
		where: eq(userWarehouses.userId, userId)
	});

	return rows.map((r) => r.warehouseId);
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm test:unit -- --run --project server --reporter verbose src/lib/server/auth/guards.test.ts
```

Expected: All 2 tests PASS.

**Step 5: Create auth barrel export**

Create `src/lib/server/auth/index.ts`:

```typescript
export { auth, type Session, type User } from '$lib/server/auth';
export { requireRole, hasGlobalScope, canWrite, canManage, canApprove, type Role } from './rbac';
export { requireAuth, requireWarehouseAccess, getUserWarehouseIds } from './guards';
```

Wait — this creates a circular import. The `auth` object is in `$lib/server/auth.ts` (the Better Auth config), and this index is at `$lib/server/auth/index.ts`. Let's keep them separate — no barrel export needed. The guards and rbac files import directly.

**Step 6: Commit**

```bash
git add src/lib/server/auth/guards.ts src/lib/server/auth/guards.test.ts
git commit -m "feat(auth): add auth guards (requireAuth, requireWarehouseAccess, getUserWarehouseIds)"
```

---

## Task 10: Create Zod Validators

**Files:**

- Create: `src/lib/validators/warehouse.ts`
- Create: `src/lib/validators/user.ts`

**Step 1: Create warehouse validators**

Create `src/lib/validators/warehouse.ts`:

```typescript
import { z } from 'zod';

export const createWarehouseSchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(255),
	address: z.string().max(500).optional(),
	contactName: z.string().max(255).optional(),
	contactPhone: z.string().max(50).optional(),
	contactEmail: z.string().email('Email invalide').optional().or(z.literal(''))
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export type CreateWarehouse = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouse = z.infer<typeof updateWarehouseSchema>;
```

**Step 2: Create user validators**

Create `src/lib/validators/user.ts`:

```typescript
import { z } from 'zod';

export const ROLES = [
	'admin',
	'admin_manager',
	'manager',
	'user',
	'admin_viewer',
	'viewer'
] as const;

export const createUserSchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(255),
	email: z.string().email('Email invalide'),
	password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
	role: z.enum(ROLES).default('viewer')
});

export const updateUserSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	role: z.enum(ROLES).optional(),
	isActive: z.boolean().optional()
});

export const assignWarehousesSchema = z.object({
	warehouseIds: z.array(z.string().min(1)).min(0)
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type AssignWarehouses = z.infer<typeof assignWarehousesSchema>;
```

**Step 3: Verify compilation**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/lib/validators/
git commit -m "feat(validators): add Zod schemas for warehouse and user validation"
```

---

## Task 11: Create Warehouse CRUD API

**Files:**

- Create: `src/routes/api/v1/warehouses/+server.ts`
- Create: `src/routes/api/v1/warehouses/[id]/+server.ts`

**Step 1: Create the warehouses list + create endpoint**

Create `src/routes/api/v1/warehouses/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess, getUserWarehouseIds } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createWarehouseSchema } from '$lib/validators/warehouse';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const warehouseIds = await getUserWarehouseIds(user.id, role);

	let result;
	if (warehouseIds === null) {
		// Global scope — see all
		result = await db.select().from(warehouses).where(eq(warehouses.isActive, true));
	} else {
		if (warehouseIds.length === 0) return json({ data: [] });
		result = await db
			.select()
			.from(warehouses)
			.where(and(eq(warehouses.isActive, true), inArray(warehouses.id, warehouseIds)));
	}

	return json({ data: result });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	requireRole(user.role as Role, 'admin');

	const body = await request.json();
	const parsed = createWarehouseSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const [warehouse] = await db
		.insert(warehouses)
		.values({
			name: parsed.data.name,
			address: parsed.data.address,
			contactName: parsed.data.contactName,
			contactPhone: parsed.data.contactPhone,
			contactEmail: parsed.data.contactEmail || null
		})
		.returning();

	return json({ data: warehouse }, { status: 201 });
};
```

**Step 2: Create the warehouse detail + update + delete endpoint**

Create `src/routes/api/v1/warehouses/[id]/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, productWarehouse } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateWarehouseSchema } from '$lib/validators/warehouse';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	await requireWarehouseAccess(user.id, params.id, role);

	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, params.id)
	});

	if (!warehouse) error(404, 'Entrepôt non trouvé');

	return json({ data: warehouse });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	requireRole(user.role as Role, 'admin');

	const body = await request.json();
	const parsed = updateWarehouseSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const [updated] = await db
		.update(warehouses)
		.set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
		.where(eq(warehouses.id, params.id))
		.returning();

	if (!updated) error(404, 'Entrepôt non trouvé');

	return json({ data: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	requireRole(user.role as Role, 'admin');

	// Check if warehouse has stock
	const stock = await db
		.select({ total: sql<number>`SUM(${productWarehouse.quantity})` })
		.from(productWarehouse)
		.where(eq(productWarehouse.warehouseId, params.id));

	if (stock[0]?.total && stock[0].total > 0) {
		error(409, "Impossible de désactiver un entrepôt avec du stock. Transférez d'abord le stock.");
	}

	const [deactivated] = await db
		.update(warehouses)
		.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
		.where(eq(warehouses.id, params.id))
		.returning();

	if (!deactivated) error(404, 'Entrepôt non trouvé');

	return json({ data: deactivated });
};
```

**Step 3: Verify compilation**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/api/v1/warehouses/
git commit -m "feat(api): add warehouse CRUD endpoints (GET list, POST, GET/:id, PUT/:id, DELETE/:id)"
```

---

## Task 12: Create User Management API

**Files:**

- Create: `src/routes/api/v1/users/+server.ts`
- Create: `src/routes/api/v1/users/[id]/+server.ts`
- Create: `src/routes/api/v1/users/[id]/warehouses/+server.ts`

**Step 1: Create users list + create endpoint**

Create `src/routes/api/v1/users/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createUserSchema } from '$lib/validators/user';
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const roleFilter = url.searchParams.get('role');
	const activeFilter = url.searchParams.get('active');

	let query = db.select().from(user).$dynamic();

	if (roleFilter) {
		query = query.where(eq(user.role, roleFilter));
	}

	if (activeFilter !== null && activeFilter !== undefined) {
		query = query.where(eq(user.isActive, activeFilter === 'true'));
	}

	const users = await query;

	// Strip sensitive fields
	const sanitized = users.map(({ ...u }) => ({
		id: u.id,
		name: u.name,
		email: u.email,
		role: u.role,
		isActive: u.isActive,
		createdAt: u.createdAt,
		updatedAt: u.updatedAt
	}));

	return json({ data: sanitized });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const body = await request.json();
	const parsed = createUserSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Use Better Auth to create the user (handles password hashing)
	const result = await auth.api.signUpEmail({
		body: {
			name: parsed.data.name,
			email: parsed.data.email,
			password: parsed.data.password
		}
	});

	if (!result?.user) {
		error(500, 'Erreur lors de la création du compte');
	}

	// Set the role (Better Auth creates with default)
	if (parsed.data.role && parsed.data.role !== 'viewer') {
		await db.update(user).set({ role: parsed.data.role }).where(eq(user.id, result.user.id));
	}

	return json(
		{
			data: {
				id: result.user.id,
				name: result.user.name,
				email: result.user.email,
				role: parsed.data.role
			}
		},
		{ status: 201 }
	);
};
```

**Step 2: Create user detail + update + delete endpoint**

Create `src/routes/api/v1/users/[id]/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, userWarehouses, warehouses } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateUserSchema } from '$lib/validators/user';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const found = await db.query.user.findFirst({
		where: eq(user.id, params.id),
		with: {
			warehouses: {
				with: {
					warehouse: true
				}
			}
		}
	});

	if (!found) error(404, 'Utilisateur non trouvé');

	return json({
		data: {
			id: found.id,
			name: found.name,
			email: found.email,
			role: found.role,
			isActive: found.isActive,
			createdAt: found.createdAt,
			updatedAt: found.updatedAt,
			warehouses: found.warehouses.map((uw) => uw.warehouse)
		}
	});
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const body = await request.json();
	const parsed = updateUserSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const [updated] = await db
		.update(user)
		.set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
		.where(eq(user.id, params.id))
		.returning();

	if (!updated) error(404, 'Utilisateur non trouvé');

	return json({
		data: {
			id: updated.id,
			name: updated.name,
			email: updated.email,
			role: updated.role,
			isActive: updated.isActive
		}
	});
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	if (params.id === currentUser.id) {
		error(400, 'Vous ne pouvez pas désactiver votre propre compte');
	}

	const [deactivated] = await db
		.update(user)
		.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
		.where(eq(user.id, params.id))
		.returning();

	if (!deactivated) error(404, 'Utilisateur non trouvé');

	return json({ data: { id: deactivated.id, isActive: false } });
};
```

**Step 3: Create warehouse assignment endpoint**

Create `src/routes/api/v1/users/[id]/warehouses/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, userWarehouses, warehouses } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { assignWarehousesSchema } from '$lib/validators/user';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const body = await request.json();
	const parsed = assignWarehousesSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify user exists
	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, params.id)
	});
	if (!targetUser) error(404, 'Utilisateur non trouvé');

	// Replace all warehouse assignments
	await db.delete(userWarehouses).where(eq(userWarehouses.userId, params.id));

	if (parsed.data.warehouseIds.length > 0) {
		await db.insert(userWarehouses).values(
			parsed.data.warehouseIds.map((warehouseId) => ({
				userId: params.id,
				warehouseId
			}))
		);
	}

	// Return updated assignments
	const assignments = await db.query.userWarehouses.findMany({
		where: eq(userWarehouses.userId, params.id),
		with: { warehouse: true }
	});

	return json({
		data: assignments.map((a) => a.warehouse)
	});
};
```

**Step 4: Verify compilation**

Run:

```bash
pnpm check
```

**Step 5: Commit**

```bash
git add src/routes/api/v1/users/
git commit -m "feat(api): add user management endpoints (CRUD + warehouse assignment)"
```

---

## Task 13: Create Auth Pages (Login)

**Files:**

- Create: `src/routes/(auth)/login/+page.svelte`
- Create: `src/routes/(auth)/+layout.svelte`

**Step 1: Create the auth layout (minimal, no sidebar)**

Create `src/routes/(auth)/+layout.svelte`:

```svelte
<script lang="ts">
	let { children } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-gray-900">StockFlow</h1>
			<p class="mt-1 text-sm text-gray-500">Gestion de stock multi-entrepôts</p>
		</div>
		{@render children()}
	</div>
</div>
```

**Step 2: Create the login page**

Create `src/routes/(auth)/login/+page.svelte`:

```svelte
<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const result = await authClient.signIn.email({ email, password });

			if (result.error) {
				error = result.error.message ?? 'Identifiants incorrects';
			} else {
				goto('/dashboard');
			}
		} catch {
			error = 'Erreur de connexion. Réessayez.';
		} finally {
			loading = false;
		}
	}
</script>

<form onsubmit={handleLogin} class="rounded-lg bg-white p-6 shadow-md">
	<h2 class="mb-6 text-xl font-semibold text-gray-900">Connexion</h2>

	{#if error}
		<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
	{/if}

	<div class="mb-4">
		<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
		<input
			id="email"
			type="email"
			bind:value={email}
			required
			autocomplete="email"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
			placeholder="vous@entreprise.com"
		/>
	</div>

	<div class="mb-6">
		<label for="password" class="mb-1 block text-sm font-medium text-gray-700">
			Mot de passe
		</label>
		<input
			id="password"
			type="password"
			bind:value={password}
			required
			autocomplete="current-password"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
			placeholder="••••••••"
		/>
	</div>

	<button
		type="submit"
		disabled={loading}
		class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
	>
		{loading ? 'Connexion...' : 'Se connecter'}
	</button>

	<div class="mt-4 text-center">
		<a href="/forgot-password" class="text-sm text-blue-600 hover:underline">
			Mot de passe oublié ?
		</a>
	</div>
</form>
```

**Step 3: Verify compilation**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/\(auth\)/
git commit -m "feat(ui): add login page and auth layout"
```

---

## Task 14: Create App Layout (Sidebar + Header + Bottom Nav)

**Files:**

- Create: `src/routes/(app)/+layout.svelte`
- Create: `src/routes/(app)/+layout.server.ts`
- Create: `src/lib/components/layout/Sidebar.svelte`
- Create: `src/lib/components/layout/Header.svelte`
- Create: `src/lib/components/layout/BottomNav.svelte`

**Step 1: Create the app layout server load function (protect routes)**

Create `src/routes/(app)/+layout.server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session) {
		redirect(302, '/login');
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			role: locals.user.role
		}
	};
};
```

**Step 2: Create the Sidebar component**

Create `src/lib/components/layout/Sidebar.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';

	type NavItem = { label: string; href: string; icon: string; minRole?: string };

	const { role }: { role: string } = $props();

	const ROLE_LEVEL: Record<string, number> = {
		admin: 100,
		admin_manager: 80,
		manager: 60,
		user: 40,
		admin_viewer: 20,
		viewer: 10
	};

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard', icon: '📊' },
		{ label: 'Produits', href: '/products', icon: '📦' },
		{ label: 'Entrepôts', href: '/warehouses', icon: '🏭' },
		{ label: 'Mouvements', href: '/movements', icon: '↕️' },
		{ label: 'Transferts', href: '/transfers', icon: '🔄' },
		{ label: 'Inventaires', href: '/inventory', icon: '📋' },
		{ label: 'Alertes', href: '/alerts', icon: '🔔' },
		{ label: 'Logs', href: '/logs', icon: '📄', minRole: 'admin_viewer' },
		{ label: 'Utilisateurs', href: '/users', icon: '👥', minRole: 'admin' },
		{ label: 'Paramètres', href: '/settings', icon: '⚙️' }
	];

	function isVisible(item: NavItem): boolean {
		if (!item.minRole) return true;
		return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 999);
	}

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}
</script>

<aside class="hidden w-60 flex-shrink-0 border-r border-gray-200 bg-white lg:block">
	<div class="flex h-16 items-center border-b border-gray-200 px-4">
		<span class="text-lg font-bold text-gray-900">StockFlow</span>
	</div>
	<nav class="mt-2 space-y-1 px-2">
		{#each navItems.filter(isVisible) as item}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
					{isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}"
			>
				<span>{item.icon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
```

**Step 3: Create the Header component**

Create `src/lib/components/layout/Header.svelte`:

```svelte
<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	const { userName }: { userName: string } = $props();

	let showMenu = $state(false);

	async function handleLogout() {
		await authClient.signOut();
		goto('/login');
	}
</script>

<header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
	<div class="flex items-center gap-3">
		<span class="text-lg font-bold text-gray-900 lg:hidden">StockFlow</span>
	</div>

	<div class="flex items-center gap-4">
		<a href="/alerts" class="relative text-gray-500 hover:text-gray-700">
			<span class="text-xl">🔔</span>
		</a>

		<div class="relative">
			<button
				onclick={() => (showMenu = !showMenu)}
				class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
			>
				<span class="hidden sm:inline">{userName}</span>
				<span class="h-8 w-8 rounded-full bg-blue-100 text-center leading-8 text-blue-700">
					{userName.charAt(0).toUpperCase()}
				</span>
			</button>

			{#if showMenu}
				<div
					class="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-gray-200"
				>
					<a href="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
						Paramètres
					</a>
					<button
						onclick={handleLogout}
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
					>
						Déconnexion
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>
```

**Step 4: Create the BottomNav component**

Create `src/lib/components/layout/BottomNav.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ label: 'Accueil', href: '/dashboard', icon: '🏠' },
		{ label: 'Stock', href: '/products', icon: '📦' },
		{ label: 'Transferts', href: '/transfers', icon: '🔄' },
		{ label: 'Inventaire', href: '/inventory', icon: '📋' },
		{ label: 'Plus', href: '/settings', icon: '⚙️' }
	];

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white lg:hidden">
	<div class="flex justify-around">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center py-2 text-xs
					{isActive(tab.href) ? 'text-blue-600' : 'text-gray-500'}"
			>
				<span class="text-lg">{tab.icon}</span>
				<span>{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>
```

**Step 5: Create the app layout**

Create `src/routes/(app)/+layout.svelte`:

```svelte
<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';

	let { data, children } = $props();
</script>

<div class="flex h-screen bg-gray-50">
	<Sidebar role={data.user.role} />

	<div class="flex flex-1 flex-col overflow-hidden">
		<Header userName={data.user.name} />

		<main class="flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
			{@render children()}
		</main>
	</div>

	<BottomNav />
</div>
```

**Step 6: Verify compilation**

Run:

```bash
pnpm check
```

**Step 7: Commit**

```bash
git add src/routes/\(app\)/ src/lib/components/layout/
git commit -m "feat(ui): add app layout with sidebar, header, bottom nav, and route protection"
```

---

## Task 15: Create Dashboard Placeholder + Stub Pages

**Files:**

- Create: `src/routes/(app)/dashboard/+page.svelte`
- Create: `src/routes/(app)/products/+page.svelte`
- Create: `src/routes/(app)/warehouses/+page.svelte`
- Create: `src/routes/(app)/movements/+page.svelte`
- Create: `src/routes/(app)/transfers/+page.svelte`
- Create: `src/routes/(app)/inventory/+page.svelte`
- Create: `src/routes/(app)/alerts/+page.svelte`
- Create: `src/routes/(app)/logs/+page.svelte`
- Create: `src/routes/(app)/users/+page.svelte`
- Create: `src/routes/(app)/settings/+page.svelte`

**Step 1: Create dashboard page**

Create `src/routes/(app)/dashboard/+page.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
</script>

<div>
	<h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
	<p class="mt-2 text-gray-500">
		Bienvenue sur StockFlow. Les modules seront implémentés dans les prochaines semaines.
	</p>
</div>
```

**Step 2: Create stub pages for all nav items**

Each stub page follows this pattern (adapt the title for each):

Create `src/routes/(app)/products/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Produits</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/warehouses/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Entrepôts</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/movements/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Mouvements</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/transfers/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Transferts</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/inventory/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Inventaires</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/alerts/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Alertes</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/logs/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Logs</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/users/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Utilisateurs</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

Create `src/routes/(app)/settings/+page.svelte`:

```svelte
<h1 class="text-2xl font-bold text-gray-900">Paramètres</h1>
<p class="mt-2 text-gray-500">Module en cours de développement.</p>
```

**Step 3: Update root +page.svelte to redirect to dashboard or login**

Modify `src/routes/+page.svelte`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/dashboard');
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<p class="text-gray-500">Redirection...</p>
</div>
```

**Step 4: Verify compilation**

Run:

```bash
pnpm check
```

**Step 5: Commit**

```bash
git add src/routes/
git commit -m "feat(ui): add dashboard and all stub pages for navigation, redirect root to dashboard"
```

---

## Task 16: Update .env.example and Verify Full Build

**Files:**

- Modify: `.env.example`

**Step 1: Update .env.example**

```
DATABASE_URL=local.db
BETTER_AUTH_SECRET=change-me-to-at-least-32-characters-random
BETTER_AUTH_URL=http://localhost:5173
```

**Step 2: Update .env with actual values**

Run:

```bash
cp .env.example .env
```

Then manually set `BETTER_AUTH_SECRET` to a random 32+ character string in `.env`.

**Step 3: Run full checks**

Run:

```bash
pnpm check
```

Expected: No errors.

Run:

```bash
pnpm lint
```

Expected: Pass (or only pre-existing formatting issues).

Run:

```bash
pnpm build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: update .env.example with Better Auth variables"
```

---

## Task 17: Run RBAC Tests and Verify

**Step 1: Run all tests**

Run:

```bash
pnpm test:unit -- --run --project server --reporter verbose
```

Expected: RBAC tests (14 tests) + guards tests (2 tests) all pass.

**Step 2: Format code**

Run:

```bash
pnpm format
```

**Step 3: Final lint**

Run:

```bash
pnpm lint
```

**Step 4: Final commit if anything was formatted**

```bash
git add -A
git commit -m "chore: format all files"
```

---

## Summary: What This Plan Builds

| Area                 | What's Created                                                                  |
| -------------------- | ------------------------------------------------------------------------------- |
| **Dependencies**     | better-auth, zod, nanoid, dayjs                                                 |
| **Database**         | Complete 16-table Drizzle schema with relations and indexes                     |
| **Auth**             | Better Auth config, session middleware, catch-all API route                     |
| **RBAC**             | 6-role hierarchy, guards (requireAuth, requireWarehouseAccess), 16 unit tests   |
| **Validators**       | Zod schemas for warehouse and user operations                                   |
| **API**              | Warehouse CRUD (5 endpoints), User CRUD + warehouse assignment (7 endpoints)    |
| **UI**               | Login page, app layout (sidebar + header + bottom nav), dashboard, 9 stub pages |
| **Route protection** | Server-side redirect to /login for unauthenticated users                        |

This covers **Week 1 / Semaine 1** from the dev plan: Setup, Schema, Auth, RBAC, CRUD Users, CRUD Warehouses, and Layout.
