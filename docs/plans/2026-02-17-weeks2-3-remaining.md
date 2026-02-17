# Weeks 2-3 Remaining Tasks — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all remaining features from weeks 2 and 3: dispute stock adjustment, barcode scanner integration, audit logging, stock validation on transfers, date/warehouse filters, per-warehouse config tab, and offline queue tests.

**Architecture:** TDD approach with service-layer changes tested in isolation first, then API integration. Frontend changes follow backend. Offline queue tests use mocked IndexedDB. All stock mutations happen inside Drizzle synchronous transactions.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), Drizzle ORM (SQLite), Vitest, Zod, html5-qrcode

---

## Priority: CRITICAL

---

### Task 1: adjustStock in resolveDispute (3.1.8)

The transfer workflow is incomplete: when a dispute is resolved with `adjustStock: true`, no stock adjustment movements are created. Currently `resolveDispute` only updates the transfer status and notes.

**Files:**
- Modify: `src/lib/server/services/transfers.ts:456-483`
- Modify: `src/lib/server/services/transfers.test.ts:389-419`
- Modify: `src/lib/server/services/transfers.integration.test.ts`

**Step 1: Write the failing unit test for adjustStock: true**

In `src/lib/server/services/transfers.test.ts`, add a new test inside the `describe('resolveDispute')` block (after the existing test at ~line 419):

```typescript
it('should create adjustment movements when adjustStock is true', () => {
	// Setup: create stock in source warehouse
	stockService.recordMovement({
		productId: TEST_PRODUCT_A_ID,
		warehouseId: TEST_SOURCE_WH_ID,
		type: 'in',
		quantity: 20,
		reason: 'restock',
		userId: TEST_USER_ID
	});

	const transfer = transferService.create({
		sourceWarehouseId: TEST_SOURCE_WH_ID,
		destinationWarehouseId: TEST_DEST_WH_ID,
		requestedBy: TEST_USER_ID,
		items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
	});

	transferService.approve(transfer.id, TEST_APPROVER_ID);
	transferService.ship(transfer.id, TEST_SHIPPER_ID);

	// Partial receive: only 7 out of 10
	transferService.receive(transfer.id, TEST_USER_ID, {
		items: [
			{
				transferItemId: getTransferItemId(transfer.id, TEST_PRODUCT_A_ID),
				quantityReceived: 7,
				anomalyNotes: '3 missing'
			}
		]
	});

	// Now status should be 'disputed' because 7 < 10
	const disputed = getTransfer(transfer.id);
	expect(disputed.status).toBe('disputed');

	// Resolve with adjustStock: true
	const resolved = transferService.resolveDispute(transfer.id, TEST_APPROVER_ID, {
		resolution: 'Accepted loss of 3 units',
		adjustStock: true
	});

	expect(resolved.status).toBe('resolved');

	// Verify adjustment movements were created for the 3 missing units:
	// - adjustment_out from source (to cancel the 3 that were sent but never arrived)
	// Note: Source was already decremented by 10 during ship(). Dest got +7 during receive().
	// The 3 missing need adjustment_in at source to reconcile.
	const sourceMovements = db
		.select()
		.from(movements)
		.where(
			and(
				eq(movements.productId, TEST_PRODUCT_A_ID),
				eq(movements.warehouseId, TEST_SOURCE_WH_ID),
				eq(movements.type, 'adjustment_in')
			)
		)
		.all();

	const adjustments = sourceMovements.filter((m) =>
		m.reference?.includes(transfer.id)
	);
	expect(adjustments).toHaveLength(1);
	expect(adjustments[0].quantity).toBe(3);
	expect(adjustments[0].reason).toContain('dispute_resolution');
});
```

You will need helper functions. Add them near the top of the test file (or reuse existing ones):

```typescript
function getTransferItemId(transferId: string, productId: string): string {
	const [item] = db
		.select()
		.from(transferItems)
		.where(
			and(eq(transferItems.transferId, transferId), eq(transferItems.productId, productId))
		)
		.all();
	return item.id;
}

function getTransfer(transferId: string) {
	const [t] = db.select().from(transfers).where(eq(transfers.id, transferId)).all();
	return t;
}
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --run --reporter=verbose -t "should create adjustment movements"`
Expected: FAIL — resolveDispute does not create any movements.

**Step 3: Implement adjustStock logic in resolveDispute**

In `src/lib/server/services/transfers.ts`, replace the `resolveDispute` method (lines 456-483) with:

```typescript
resolveDispute(transferId: string, resolvedBy: string, data: ResolveDisputeInput) {
	return db.transaction((tx) => {
		const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
		if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

		assertTransition(transfer.status, 'resolved');

		const now = new Date().toISOString();
		const updatedNotes = transfer.notes
			? `${transfer.notes}\nResolution: ${data.resolution}`
			: `Resolution: ${data.resolution}`;

		// If adjustStock is true, create adjustment movements for discrepancies
		if (data.adjustStock) {
			const items = tx
				.select()
				.from(transferItems)
				.where(eq(transferItems.transferId, transferId))
				.all();

			for (const item of items) {
				const sent = item.quantitySent ?? 0;
				const received = item.quantityReceived ?? 0;
				const discrepancy = sent - received;

				if (discrepancy > 0) {
					// Source was decremented by `sent` during ship().
					// Dest was incremented by `received` during receive().
					// The `discrepancy` units are lost — return them to source.
					stockService.recordMovement({
						productId: item.productId,
						warehouseId: transfer.sourceWarehouseId,
						type: 'adjustment_in',
						quantity: discrepancy,
						reason: 'dispute_resolution',
						userId: resolvedBy,
						reference: `transfer:${transferId}`
					});
				} else if (discrepancy < 0) {
					// More received than sent — remove excess from destination
					stockService.recordMovement({
						productId: item.productId,
						warehouseId: transfer.destinationWarehouseId,
						type: 'adjustment_out',
						quantity: Math.abs(discrepancy),
						reason: 'dispute_resolution',
						userId: resolvedBy,
						reference: `transfer:${transferId}`
					});
				}
			}
		}

		tx.update(transfers)
			.set({
				status: 'resolved' as typeof transfers.status.enumValues[number],
				disputeResolvedBy: resolvedBy,
				disputeResolvedAt: now,
				notes: updatedNotes
			})
			.where(eq(transfers.id, transferId))
			.run();

		const [updated] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
		return updated;
	});
}
```

**Important:** `stockService.recordMovement` uses its own `db.transaction()`. Since better-sqlite3 supports nested savepoints, this works. However, if it fails, verify that calling `stockService.recordMovement` inside a `db.transaction` works correctly. If not, extract the movement insert logic into a raw Drizzle insert within the same `tx`.

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- --run --reporter=verbose -t "should create adjustment movements"`
Expected: PASS

**Step 5: Verify existing resolveDispute test still passes**

Run: `pnpm test:unit -- --run --reporter=verbose -t "resolveDispute"`
Expected: Both tests PASS (the existing `adjustStock: false` test and the new one).

**Step 6: Commit**

```bash
git add src/lib/server/services/transfers.ts src/lib/server/services/transfers.test.ts
git commit -m "feat(transfers): implement adjustStock in resolveDispute

When a dispute is resolved with adjustStock: true, create adjustment
movements to reconcile sent vs received quantities — returns lost
units to source warehouse."
```

---

### Task 2: BarcodeScanner integration in movements form (2.5.2)

The `BarcodeScanner` component exists at `src/lib/components/scan/BarcodeScanner.svelte` but is not used in the movements creation form. We need to add a scan button that, when a barcode is scanned, looks up the matching product (by `sku` field) and auto-selects it.

**Files:**
- Modify: `src/routes/(app)/movements/new/+page.svelte:84-95`
- Modify: `src/routes/(app)/movements/new/+page.server.ts` (ensure products include `sku`)

**Step 1: Check that products load includes sku**

Read `src/routes/(app)/movements/new/+page.server.ts` load function. The products query returns `products` — verify that the `sku` field is available. If using `db.query.products.findMany()` or `db.select().from(products)`, all columns are returned by default, so `sku` should be present.

No test needed — this is a verification step.

**Step 2: Add BarcodeScanner to movements form**

In `src/routes/(app)/movements/new/+page.svelte`, add the scanner integration. Locate the product `<Select>` element (around lines 84-95) and add a scan button + scanner above it:

After the `<script>` tag imports, add:

```svelte
<script lang="ts">
	// ... existing imports ...
	import BarcodeScanner from '$lib/components/scan/BarcodeScanner.svelte';

	// ... existing state ...
	let showScanner = $state(false);

	function handleScan(code: string) {
		// Look up product by SKU
		const product = data.products.find(
			(p) => p.sku?.toLowerCase() === code.toLowerCase()
		);
		if (product) {
			// Set hidden input value for productId
			selectedProductId = product.id;
			showScanner = false;
		} else {
			scanError = `Aucun produit trouvé pour le code: ${code}`;
		}
	}

	let scanError = $state('');
	let selectedProductId = $state(data.preselected?.productId ?? '');
</script>
```

In the template, above the product `<Select>`, add:

```svelte
<div class="flex items-center gap-2">
	<label for="productId" class="block text-sm font-medium text-gray-700">Produit</label>
	<button
		type="button"
		onclick={() => { showScanner = !showScanner; scanError = ''; }}
		class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
	>
		{showScanner ? 'Fermer' : 'Scanner'}
	</button>
</div>

{#if showScanner}
	<div class="mb-3 rounded-lg border border-gray-200 p-3">
		<BarcodeScanner onscan={handleScan} onerror={(msg) => { scanError = msg; }} />
	</div>
{/if}

{#if scanError}
	<p class="mb-2 text-sm text-red-600">{scanError}</p>
{/if}
```

Replace the product `<select>` to use `selectedProductId` as the bound value and add a hidden input or use `bind:value`:

```svelte
<select
	name="productId"
	bind:value={selectedProductId}
	required
	class="..."
>
	<option value="">Sélectionner un produit</option>
	{#each data.products as product (product.id)}
		<option value={product.id}>{product.name} ({product.sku})</option>
	{/each}
</select>
```

**Step 3: Run svelte-autofixer on the modified component**

Use the `svelte-autofixer` MCP tool to check for Svelte 5 issues.

**Step 4: Manual test**

Run: `pnpm dev`
Navigate to `/movements/new`. Verify:
1. A "Scanner" button appears next to the product label
2. Clicking it opens the camera scanner
3. Scanning a valid barcode/SKU selects the matching product
4. Scanning an unknown code shows an error message
5. The rest of the form still works normally

**Step 5: Commit**

```bash
git add src/routes/(app)/movements/new/+page.svelte
git commit -m "feat(movements): integrate BarcodeScanner in new movement form

Adds a scan button next to the product selector. Scanning a barcode
looks up the product by SKU and auto-selects it."
```

---

### Task 3: Audit log on movements and transfers (2.4.3)

The `auditService` exists but is not called anywhere. We need to add audit logging to the movements API (POST) and to the transfers API (POST + status changes).

**Files:**
- Modify: `src/routes/api/v1/movements/+server.ts:78-133`
- Modify: `src/routes/api/v1/transfers/+server.ts:65-122`
- Modify: `src/routes/api/v1/transfers/[id]/+server.ts` (status change endpoints)
- Test: `src/routes/api/v1/movements/movements.test.ts` (new file or existing)

**Step 1: Write failing test for audit log on movement creation**

Create or modify the movements API test. If no test file exists, create `src/lib/server/services/audit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { auditService } from '$lib/server/services/audit';

describe('auditService', () => {
	beforeEach(() => {
		db.delete(auditLogs).run();
	});

	it('should create an audit log entry', () => {
		expect.assertions(5);

		const entry = auditService.log({
			userId: 'user-1',
			action: 'movement',
			entityType: 'movement',
			entityId: 'mov-1',
			newValues: { type: 'in', quantity: 10 }
		});

		expect(entry).toBeDefined();
		expect(entry.userId).toBe('user-1');
		expect(entry.action).toBe('movement');
		expect(entry.entityType).toBe('movement');
		expect(entry.entityId).toBe('mov-1');
	});

	it('should store old and new values as JSON strings', () => {
		expect.assertions(2);

		const entry = auditService.log({
			userId: 'user-1',
			action: 'update',
			entityType: 'product',
			entityId: 'prod-1',
			oldValues: { name: 'Old Name' },
			newValues: { name: 'New Name' }
		});

		expect(entry.oldValues).toBe(JSON.stringify({ name: 'Old Name' }));
		expect(entry.newValues).toBe(JSON.stringify({ name: 'New Name' }));
	});
});
```

**Step 2: Run test to verify it passes (audit service already works)**

Run: `pnpm test:unit -- --run --reporter=verbose -t "auditService"`
Expected: PASS (the service itself already works, we're just adding its first tests).

**Step 3: Add audit logging to the movements POST handler**

In `src/routes/api/v1/movements/+server.ts`, add the import and the audit call:

At the top, add:
```typescript
import { auditService } from '$lib/server/services/audit';
```

After the `stockService.recordMovement(...)` call (around line 112), before the stock check, add:

```typescript
		const movement = await stockService.recordMovement({
			...parsed.data,
			userId: user.id
		});

		// Audit log
		auditService.log({
			userId: user.id,
			action: 'movement',
			entityType: 'movement',
			entityId: movement.id,
			newValues: {
				type: parsed.data.type,
				quantity: parsed.data.quantity,
				productId: parsed.data.productId,
				warehouseId: parsed.data.warehouseId,
				reason: parsed.data.reason
			}
		});
```

**Step 4: Add audit logging to the transfers POST handler**

In `src/routes/api/v1/transfers/+server.ts`, add the import and the audit call:

At the top, add:
```typescript
import { auditService } from '$lib/server/services/audit';
```

After the `transferService.create(...)` call (around line 107), add:

```typescript
		const transfer = transferService.create({
			...
		});

		// Audit log
		auditService.log({
			userId: user.id,
			action: 'transfer',
			entityType: 'transfer',
			entityId: transfer.id,
			newValues: {
				sourceWarehouseId: parsed.data.sourceWarehouseId,
				destinationWarehouseId: parsed.data.destinationWarehouseId,
				itemCount: parsed.data.items.length
			}
		});
```

**Step 5: Add audit logging to transfer status change endpoints**

In `src/routes/api/v1/transfers/[id]/+server.ts` (or the relevant PATCH/PUT handler for status changes), add audit calls after each status transition (approve, reject, ship, receive, resolveDispute). Pattern:

```typescript
auditService.log({
	userId: user.id,
	action: 'transfer',
	entityType: 'transfer',
	entityId: transferId,
	oldValues: { status: previousStatus },
	newValues: { status: newStatus }
});
```

**Step 6: Run all tests**

Run: `pnpm test:unit -- --run`
Expected: All PASS

**Step 7: Commit**

```bash
git add src/lib/server/services/audit.test.ts src/routes/api/v1/movements/+server.ts src/routes/api/v1/transfers/+server.ts src/routes/api/v1/transfers/[id]/+server.ts
git commit -m "feat(audit): add audit logging to movements and transfer operations

Calls auditService.log() after every movement creation and transfer
status change for full traceability."
```

---

## Priority: IMPORTANT

---

### Task 4: Stock validation on transfer creation (3.1.1)

When creating a transfer, we should warn (not block) if the source warehouse has insufficient stock for any item. This is a soft check — the hard check happens at ship time.

**Files:**
- Modify: `src/routes/api/v1/transfers/+server.ts:65-122`
- Modify: `src/lib/server/services/transfers.ts:85-115` (add optional `warnings` return)
- Test: `src/lib/server/services/transfers.test.ts`

**Step 1: Write failing test for stock warning on transfer creation**

In `src/lib/server/services/transfers.test.ts`, add within the `describe('create')` block:

```typescript
it('should include warnings when source stock is insufficient', () => {
	// Source warehouse has 5 units of product A
	stockService.recordMovement({
		productId: TEST_PRODUCT_A_ID,
		warehouseId: TEST_SOURCE_WH_ID,
		type: 'in',
		quantity: 5,
		reason: 'restock',
		userId: TEST_USER_ID
	});

	const result = transferService.createWithWarnings({
		sourceWarehouseId: TEST_SOURCE_WH_ID,
		destinationWarehouseId: TEST_DEST_WH_ID,
		requestedBy: TEST_USER_ID,
		items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
	});

	expect(result.transfer).toBeDefined();
	expect(result.transfer.status).toBe('pending');
	expect(result.warnings).toHaveLength(1);
	expect(result.warnings[0]).toContain(TEST_PRODUCT_A_ID);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --run --reporter=verbose -t "should include warnings when source stock"`
Expected: FAIL — `createWithWarnings` does not exist.

**Step 3: Implement createWithWarnings in transfer service**

In `src/lib/server/services/transfers.ts`, add a new method after `create()`:

```typescript
createWithWarnings(data: CreateTransferInput) {
	const warnings: string[] = [];

	// Check stock availability (soft check — does not block creation)
	for (const item of data.items) {
		const [pw] = db
			.select({ quantity: productWarehouse.quantity })
			.from(productWarehouse)
			.where(
				and(
					eq(productWarehouse.productId, item.productId),
					eq(productWarehouse.warehouseId, data.sourceWarehouseId)
				)
			)
			.all();

		const available = pw?.quantity ?? 0;
		if (available < item.quantityRequested) {
			warnings.push(
				`Stock insuffisant pour ${item.productId}: ${available} disponible, ${item.quantityRequested} demandé`
			);
		}
	}

	const transfer = this.create(data);
	return { transfer, warnings };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- --run --reporter=verbose -t "should include warnings when source stock"`
Expected: PASS

**Step 5: Update the API endpoint to use createWithWarnings**

In `src/routes/api/v1/transfers/+server.ts`, replace the `transferService.create(...)` call with:

```typescript
		const { transfer, warnings } = transferService.createWithWarnings({
			sourceWarehouseId: parsed.data.sourceWarehouseId,
			destinationWarehouseId: parsed.data.destinationWarehouseId,
			requestedBy: user.id,
			items: parsed.data.items,
			notes: parsed.data.notes
		});

		return json({ data: transfer, warnings }, { status: 201 });
```

**Step 6: Run all tests**

Run: `pnpm test:unit -- --run`
Expected: All PASS

**Step 7: Commit**

```bash
git add src/lib/server/services/transfers.ts src/lib/server/services/transfers.test.ts src/routes/api/v1/transfers/+server.ts
git commit -m "feat(transfers): add stock availability warning on transfer creation

Soft check: warns when source warehouse has insufficient stock but
does not block the transfer. Hard check remains at ship time."
```

---

### Task 5: Date filter on transfers + warehouse filter on products (3.2.1 + 2.1.4)

Two filter additions:
- **Transfers list page:** Add dateFrom/dateTo filter
- **Products API:** Add warehouseId filter

**Files:**
- Modify: `src/routes/(app)/transfers/+page.server.ts:1-124`
- Modify: `src/routes/(app)/transfers/+page.svelte:1-215`
- Modify: `src/routes/api/v1/products/+server.ts:10-97`

**Step 5a: Date filter on transfers**

**Step 1: Add date params to transfers page server**

In `src/routes/(app)/transfers/+page.server.ts`, in the `load` function, read the date params and add them to the query conditions:

After reading `status` and `page` from `url.searchParams`:

```typescript
const dateFrom = url.searchParams.get('dateFrom');
const dateTo = url.searchParams.get('dateTo');
```

Add to the conditions array:

```typescript
if (dateFrom) {
	conditions.push(gte(transfers.requestedAt, dateFrom));
}
if (dateTo) {
	// Add end-of-day to include the full day
	conditions.push(lte(transfers.requestedAt, dateTo + 'T23:59:59'));
}
```

Import `gte` and `lte` from `drizzle-orm`.

Return `dateFrom` and `dateTo` in the load data so the form can show current values.

**Step 2: Add date filter UI to transfers page**

In `src/routes/(app)/transfers/+page.svelte`, add date inputs above or below the status tabs:

```svelte
<div class="flex flex-wrap gap-3">
	<div>
		<label for="dateFrom" class="text-sm text-gray-600">Du</label>
		<input
			type="date"
			id="dateFrom"
			value={data.dateFrom ?? ''}
			onchange={(e) => filterByDate(e.currentTarget.value, data.dateTo)}
			class="rounded-md border border-gray-300 px-2 py-1 text-sm"
		/>
	</div>
	<div>
		<label for="dateTo" class="text-sm text-gray-600">Au</label>
		<input
			type="date"
			id="dateTo"
			value={data.dateTo ?? ''}
			onchange={(e) => filterByDate(data.dateFrom, e.currentTarget.value)}
			class="rounded-md border border-gray-300 px-2 py-1 text-sm"
		/>
	</div>
</div>
```

Add the navigation helper:

```typescript
function filterByDate(from: string | null, to: string | null) {
	const params = new URLSearchParams();
	if (activeStatus) params.set('status', activeStatus);
	if (from) params.set('dateFrom', from);
	if (to) params.set('dateTo', to);
	// eslint-disable-next-line svelte/no-navigation-without-resolve
	goto(`?${params.toString()}`);
}
```

**Step 3: Run svelte-autofixer**

Use the `svelte-autofixer` MCP tool on the modified component.

**Step 5b: Warehouse filter on products API**

**Step 4: Add warehouseId filter to products GET handler**

In `src/routes/api/v1/products/+server.ts`, in the GET handler, read the `warehouseId` param:

```typescript
const warehouseId = url.searchParams.get('warehouseId');
```

If `warehouseId` is provided, filter products to only those with stock in that warehouse:

```typescript
if (warehouseId) {
	// Get product IDs that exist in this warehouse
	const pwRows = db
		.select({ productId: productWarehouse.productId })
		.from(productWarehouse)
		.where(eq(productWarehouse.warehouseId, warehouseId))
		.all();
	const productIds = pwRows.map((r) => r.productId);

	if (productIds.length > 0) {
		conditions.push(inArray(products.id, productIds));
	} else {
		// No products in this warehouse — return empty
		return json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
	}
}
```

Import `inArray` from `drizzle-orm`.

**Step 5: Run all tests**

Run: `pnpm test:unit -- --run`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/routes/(app)/transfers/+page.server.ts src/routes/(app)/transfers/+page.svelte src/routes/api/v1/products/+server.ts
git commit -m "feat(filters): add date filter on transfers list + warehouse filter on products API

Transfers: dateFrom/dateTo query params filter by requestedAt.
Products API: warehouseId param filters to products with stock in that warehouse."
```

---

### Task 6: Config tab on product detail for per-warehouse thresholds (2.2.3)

The product detail page currently shows stock by warehouse but has no way to edit per-warehouse `minStock` thresholds. We need a Config tab.

**Files:**
- Modify: `src/routes/(app)/products/[id]/+page.svelte:1-259`
- Modify: `src/routes/(app)/products/[id]/+page.server.ts:1-71`
- Already exists: `src/routes/api/v1/products/[id]/warehouses/[warehouseId]/+server.ts` (PUT endpoint)

**Step 1: Add Config tab UI**

In `src/routes/(app)/products/[id]/+page.svelte`, add a tab system. Replace the flat layout with tabs:

```svelte
<script lang="ts">
	// ... existing ...
	let activeTab = $state<'overview' | 'config'>('overview');
</script>

<!-- Tab navigation -->
<div class="mb-6 border-b border-gray-200">
	<nav class="-mb-px flex gap-6">
		<button
			class="border-b-2 pb-3 text-sm font-medium {activeTab === 'overview'
				? 'border-blue-500 text-blue-600'
				: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
			onclick={() => (activeTab = 'overview')}
		>
			Apercu
		</button>
		{#if data.canEdit}
			<button
				class="border-b-2 pb-3 text-sm font-medium {activeTab === 'config'
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				onclick={() => (activeTab = 'config')}
			>
				Configuration
			</button>
		{/if}
	</nav>
</div>
```

Wrap existing content in `{#if activeTab === 'overview'}...{/if}` and add the config tab:

```svelte
{#if activeTab === 'config'}
	<div class="rounded-lg border border-gray-200 bg-white p-6">
		<h2 class="mb-4 text-lg font-semibold text-gray-800">Seuils de stock par entrepot</h2>
		<div class="space-y-4">
			{#each data.warehouseStock as ws (ws.warehouseId)}
				<form
					method="POST"
					action="/api/v1/products/{data.product.id}/warehouses/{ws.warehouseId}"
					class="flex items-center gap-4 rounded-md border border-gray-100 p-3"
				>
					<span class="flex-1 font-medium text-gray-700">{ws.warehouseName}</span>
					<label class="text-sm text-gray-600">
						Stock min:
						<input
							type="number"
							name="minStock"
							value={ws.minStock ?? ''}
							min="0"
							class="ml-2 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
						/>
					</label>
					<button
						type="submit"
						class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
					>
						Enregistrer
					</button>
				</form>
			{/each}
		</div>
	</div>
{/if}
```

**Note:** The form POST to the API will need to be handled client-side with fetch since the API endpoint is a REST PUT, not a SvelteKit form action. Use `onsubmit` with `event.preventDefault()`:

```svelte
<form
	onsubmit={async (e) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const minStock = Number(formData.get('minStock'));
		const res = await fetch(
			`/api/v1/products/${data.product.id}/warehouses/${ws.warehouseId}`,
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ minStock })
			}
		);
		if (res.ok) {
			// Refresh data
			invalidateAll();
		}
	}}
	class="flex items-center gap-4 rounded-md border border-gray-100 p-3"
>
```

Add `import { invalidateAll } from '$app/navigation';` at the top.

**Step 2: Ensure warehouseStock data includes minStock**

In `src/routes/(app)/products/[id]/+page.server.ts`, verify that the warehouse stock query returns `minStock`. If it already selects all columns from `productWarehouse`, it should include it. Also include the warehouse name.

**Step 3: Run svelte-autofixer**

Use the `svelte-autofixer` MCP tool.

**Step 4: Manual test**

Run: `pnpm dev`
Navigate to a product detail page. Verify:
1. Two tabs appear: "Apercu" and "Configuration" (only if canEdit)
2. Config tab shows all warehouses with minStock inputs
3. Saving a minStock value sends PUT and refreshes

**Step 5: Commit**

```bash
git add src/routes/(app)/products/[id]/+page.svelte src/routes/(app)/products/[id]/+page.server.ts
git commit -m "feat(products): add Config tab for per-warehouse minStock thresholds

Product detail now has tabs. Config tab allows editing minStock per
warehouse using the existing PUT API endpoint."
```

---

### Task 7: Offline queue tests (3.5.6)

The offline queue (`src/lib/services/offline-queue.ts`) has no tests. We need unit tests that mock IndexedDB.

**Files:**
- Create: `src/lib/services/offline-queue.test.ts`
- Reference: `src/lib/services/offline-queue.ts:1-133`

**Step 1: Write offline queue tests**

Create `src/lib/services/offline-queue.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock IndexedDB using a simple in-memory implementation
const mockStore = new Map<number, unknown>();
let autoIncrementKey = 0;

const mockTransaction = {
	objectStore: () => mockObjectStore,
	oncomplete: null as (() => void) | null,
	onerror: null as (() => void) | null
};

const mockObjectStore = {
	add: (value: unknown) => {
		const key = ++autoIncrementKey;
		mockStore.set(key, value);
		const request = { result: key, onsuccess: null as (() => void) | null };
		setTimeout(() => request.onsuccess?.(), 0);
		return request;
	},
	delete: (key: number) => {
		mockStore.delete(key);
		const request = { onsuccess: null as (() => void) | null };
		setTimeout(() => request.onsuccess?.(), 0);
		return request;
	},
	getAll: () => {
		const entries = Array.from(mockStore.entries()).map(([, v]) => v);
		const request = {
			result: entries,
			onsuccess: null as (() => void) | null
		};
		setTimeout(() => request.onsuccess?.(), 0);
		return request;
	},
	count: () => {
		const request = {
			result: mockStore.size,
			onsuccess: null as (() => void) | null
		};
		setTimeout(() => request.onsuccess?.(), 0);
		return request;
	},
	clear: () => {
		mockStore.clear();
		const request = { onsuccess: null as (() => void) | null };
		setTimeout(() => request.onsuccess?.(), 0);
		return request;
	}
};

const mockDb = {
	transaction: () => {
		setTimeout(() => mockTransaction.oncomplete?.(), 0);
		return mockTransaction;
	}
};

// Mock indexedDB.open
const mockOpenRequest = {
	result: mockDb,
	onsuccess: null as (() => void) | null,
	onerror: null as (() => void) | null,
	onupgradeneeded: null as ((e: { target: { result: typeof mockDb } }) => void) | null
};

vi.stubGlobal('indexedDB', {
	open: () => {
		setTimeout(() => {
			mockOpenRequest.onupgradeneeded?.({ target: { result: mockDb } });
			mockOpenRequest.onsuccess?.();
		}, 0);
		return mockOpenRequest;
	}
});

describe('offline-queue', () => {
	beforeEach(() => {
		mockStore.clear();
		autoIncrementKey = 0;
		vi.stubGlobal('fetch', vi.fn());
		vi.stubGlobal('navigator', { onLine: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should enqueue an operation', async () => {
		expect.assertions(1);
		const { enqueue, getPendingCount } = await import('$lib/services/offline-queue');

		await enqueue({
			url: '/api/v1/movements',
			method: 'POST',
			body: { type: 'in', quantity: 10 }
		});

		const count = await getPendingCount();
		expect(count).toBe(1);
	});

	it('should flush successfully on 2xx response', async () => {
		expect.assertions(2);
		const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
		vi.stubGlobal('fetch', mockFetch);

		const { enqueue, flush, getPendingCount } = await import('$lib/services/offline-queue');

		await enqueue({
			url: '/api/v1/movements',
			method: 'POST',
			body: { type: 'in', quantity: 10 }
		});

		await flush();

		expect(mockFetch).toHaveBeenCalledOnce();
		const count = await getPendingCount();
		expect(count).toBe(0);
	});

	it('should remove operation on 4xx response (client error)', async () => {
		expect.assertions(2);
		const mockFetch = vi.fn().mockResolvedValue({ status: 400 });
		vi.stubGlobal('fetch', mockFetch);

		const { enqueue, flush, getPendingCount } = await import('$lib/services/offline-queue');

		await enqueue({
			url: '/api/v1/movements',
			method: 'POST',
			body: { type: 'out', quantity: 999 }
		});

		await flush();

		expect(mockFetch).toHaveBeenCalledOnce();
		const count = await getPendingCount();
		expect(count).toBe(0);
	});

	it('should keep operation on 5xx response (server error, retry later)', async () => {
		expect.assertions(2);
		const mockFetch = vi.fn().mockResolvedValue({ status: 500 });
		vi.stubGlobal('fetch', mockFetch);

		const { enqueue, flush, getPendingCount } = await import('$lib/services/offline-queue');

		await enqueue({
			url: '/api/v1/movements',
			method: 'POST',
			body: { type: 'in', quantity: 5 }
		});

		await flush();

		expect(mockFetch).toHaveBeenCalledOnce();
		const count = await getPendingCount();
		expect(count).toBe(1);
	});

	it('should clear all pending operations', async () => {
		expect.assertions(2);
		const { enqueue, clear, getPendingCount } = await import('$lib/services/offline-queue');

		await enqueue({ url: '/api/v1/movements', method: 'POST', body: { quantity: 1 } });
		await enqueue({ url: '/api/v1/movements', method: 'POST', body: { quantity: 2 } });

		let count = await getPendingCount();
		expect(count).toBe(2);

		await clear();
		count = await getPendingCount();
		expect(count).toBe(0);
	});
});
```

**Important:** The tests above use dynamic `import()` which may need adjustment depending on how the module initializes its IndexedDB connection. If the module opens the DB at import time, ensure mocks are set up before import. You may need to use `vi.resetModules()` between tests.

**Step 2: Run tests to verify they pass**

Run: `pnpm test:unit -- --run --reporter=verbose offline-queue`
Expected: All 5 PASS

If tests fail due to module caching, add `vi.resetModules()` in `beforeEach` and use dynamic imports in each test.

**Step 3: Commit**

```bash
git add src/lib/services/offline-queue.test.ts
git commit -m "test(offline): add unit tests for IndexedDB offline queue

Tests enqueue, flush (2xx/4xx/5xx handling), clear, and pending count
using mocked IndexedDB."
```

---

## Priority: NICE-TO-HAVE

---

### Task 8: Component extractions (11 components)

The code works inline — these extractions improve reusability but don't change functionality. Each extraction follows the same pattern: create component file, replace inline code with component import.

**Group A — Product components (2.2.5-2.2.8):**
- `StockLevelBadge.svelte` — Extract from product detail stock table (low stock indicator)
- `PumpDisplay.svelte` — Extract PUMP formatted display
- `StockByWarehouseTable.svelte` — Extract the warehouse stock table
- `MovementHistoryTable.svelte` — Extract recent movements table

**Group B — Movement components (2.4.7-2.4.9):**
- `MovementTypeBadge.svelte` — Extract type badge with color coding
- `MovementReasonLabel.svelte` — Extract reason text formatter
- `MovementFilters.svelte` — Extract filter controls

**Group C — Transfer components (3.2.4-3.2.7):**
- `TransferStatusBadge.svelte` — Extract status badge with color mapping
- `TransferTimeline.svelte` — Extract timeline/progress display
- `TransferItemsTable.svelte` — Extract items table from detail view
- `TransferFilters.svelte` — Extract filter tabs + date filter

**Pattern for each extraction:**

**Files:**
- Create: `src/lib/components/{domain}/{ComponentName}.svelte`
- Modify: Source page file that contains the inline code

**Step 1: Create component file**

Extract the relevant markup + logic into a new `.svelte` file with typed props:

```svelte
<script lang="ts">
	interface Props {
		// typed props matching what the inline code uses
	}
	let { prop1, prop2 }: Props = $props();
</script>

<!-- extracted markup -->
```

**Step 2: Run svelte-autofixer on new component**

**Step 3: Replace inline code with component import in source page**

```svelte
<script lang="ts">
	import ComponentName from '$lib/components/domain/ComponentName.svelte';
</script>

<ComponentName prop1={value1} prop2={value2} />
```

**Step 4: Run svelte-autofixer on modified page**

**Step 5: Visual test** — verify the page looks identical

**Step 6: Commit each group**

```bash
# Group A
git add src/lib/components/products/
git add src/routes/(app)/products/
git commit -m "refactor(products): extract StockLevelBadge, PumpDisplay, StockByWarehouseTable, MovementHistoryTable"

# Group B
git add src/lib/components/movements/
git add src/routes/(app)/movements/
git commit -m "refactor(movements): extract MovementTypeBadge, MovementReasonLabel, MovementFilters"

# Group C
git add src/lib/components/transfers/
git add src/routes/(app)/transfers/
git commit -m "refactor(transfers): extract TransferStatusBadge, TransferTimeline, TransferItemsTable, TransferFilters"
```

---

## Summary

| # | Task | Priority | Est. Steps |
|---|------|----------|------------|
| 1 | adjustStock in resolveDispute | Critical | 6 |
| 2 | BarcodeScanner in movements form | Critical | 5 |
| 3 | Audit log on movements/transfers | Critical | 7 |
| 4 | Stock validation on transfer creation | Important | 7 |
| 5 | Date + warehouse filters | Important | 6 |
| 6 | Config tab for per-warehouse thresholds | Important | 5 |
| 7 | Offline queue tests | Important | 3 |
| 8 | Component extractions (11 components) | Nice-to-have | ~30 |

**Total: 8 tasks, ~69 steps, 11+ commits**
