# Week 2 — Core Business Modules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement products CRUD, categories, stock service with PUMP calculation (atomic transactions), movements module, and barcode scanner — covering PRD sections 2.1–2.5 and user stories PROD-01 to PROD-07, MOV-01 to MOV-06, SCAN-01 to SCAN-04.

**Architecture:** Products and categories get full REST API endpoints + SvelteKit pages. The stock service (`stock.ts`) is the central hub — all stock mutations (movements, transfers, inventory adjustments) go through it using Drizzle transactions for atomicity. PUMP is calculated in SQL inside `onConflictDoUpdate`. The barcode scanner uses `html5-qrcode` as a Svelte 5 component.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Drizzle ORM (SQLite), Zod 4, Vitest, html5-qrcode, Tailwind CSS 4.

**Existing patterns to follow:**
- API routes: `requireAuth(locals.user)` + `requireRole(user.role as Role, ...)` from `$lib/server/auth/guards` and `$lib/server/auth/rbac`
- Validators: Zod schemas in `src/lib/validators/`, export types with `z.infer`
- Pages: SvelteKit form actions with `enhance`, `$state()` runes, `resolve()` for navigation
- Tests: Vitest with `describe/it/expect`, `requireAssertions: true` — server tests in `src/**/*.test.ts`
- DB: `import { db } from '$lib/server/db'`, schema from `$lib/server/db/schema`

---

## Task 1: Category Validator + API

**Files:**
- Create: `src/lib/validators/category.ts`
- Create: `src/routes/api/v1/categories/+server.ts`
- Create: `src/lib/validators/category.test.ts`

**Step 1: Write the validator**

```typescript
// src/lib/validators/category.ts
import { z } from 'zod';

export const createCategorySchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(255),
	parentId: z.string().nullable().optional()
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
```

**Step 2: Write tests for the validator**

```typescript
// src/lib/validators/category.test.ts
import { describe, it, expect } from 'vitest';
import { createCategorySchema } from './category';

describe('createCategorySchema', () => {
	it('should accept valid category', () => {
		const result = createCategorySchema.safeParse({ name: 'Pièces détachées' });
		expect(result.success).toBe(true);
	});

	it('should accept category with parentId', () => {
		const result = createCategorySchema.safeParse({ name: 'Filtres', parentId: 'cat-001' });
		expect(result.success).toBe(true);
	});

	it('should reject empty name', () => {
		const result = createCategorySchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
	});
});
```

**Step 3: Run tests**

Run: `DATABASE_URL=local.db pnpm test:unit -- --run --project server -t "createCategorySchema"`
Expected: PASS

**Step 4: Write the API route**

```typescript
// src/routes/api/v1/categories/+server.ts
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, canManage, type Role } from '$lib/server/auth/rbac';
import { createCategorySchema } from '$lib/validators/category';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals.user);

	const allCategories = await db.select().from(categories);

	return json({ data: allCategories });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) {
		error(403, 'Accès non autorisé');
	}

	const body = await request.json();
	const parsed = createCategorySchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	if (parsed.data.parentId) {
		const parent = await db.query.categories.findFirst({
			where: eq(categories.id, parsed.data.parentId)
		});
		if (!parent) error(400, { message: 'Catégorie parente introuvable' });
	}

	const [category] = await db
		.insert(categories)
		.values({
			name: parsed.data.name,
			parentId: parsed.data.parentId ?? null
		})
		.returning();

	return json({ data: category }, { status: 201 });
};
```

**Step 5: Commit**

```bash
git add src/lib/validators/category.ts src/lib/validators/category.test.ts src/routes/api/v1/categories/+server.ts
git commit -m "feat(categories): add validator, tests, and API endpoints"
```

---

## Task 2: Category [id] API (update, delete)

**Files:**
- Create: `src/routes/api/v1/categories/[id]/+server.ts`

**Step 1: Write the route**

```typescript
// src/routes/api/v1/categories/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories, products } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { updateCategorySchema } from '$lib/validators/category';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	requireAuth(locals.user);

	const category = await db.query.categories.findFirst({
		where: eq(categories.id, params.id)
	});

	if (!category) error(404, 'Catégorie introuvable');

	return json({ data: category });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Accès non autorisé');

	const body = await request.json();
	const parsed = updateCategorySchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const existing = await db.query.categories.findFirst({
		where: eq(categories.id, params.id)
	});
	if (!existing) error(404, 'Catégorie introuvable');

	const [updated] = await db
		.update(categories)
		.set(parsed.data)
		.where(eq(categories.id, params.id))
		.returning();

	return json({ data: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Accès non autorisé');

	const existing = await db.query.categories.findFirst({
		where: eq(categories.id, params.id)
	});
	if (!existing) error(404, 'Catégorie introuvable');

	// Check no products use this category
	const productsUsingCategory = await db
		.select({ id: products.id })
		.from(products)
		.where(eq(products.categoryId, params.id))
		.limit(1);

	if (productsUsingCategory.length > 0) {
		error(409, { message: 'Impossible de supprimer : des produits utilisent cette catégorie' });
	}

	// Check no subcategories
	const subcategories = await db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.parentId, params.id))
		.limit(1);

	if (subcategories.length > 0) {
		error(409, { message: 'Impossible de supprimer : cette catégorie a des sous-catégories' });
	}

	await db.delete(categories).where(eq(categories.id, params.id));

	return json({ success: true });
};
```

**Step 2: Commit**

```bash
git add src/routes/api/v1/categories/[id]/+server.ts
git commit -m "feat(categories): add GET/PUT/DELETE by id"
```

---

## Task 3: Product Validator + Tests

**Files:**
- Create: `src/lib/validators/product.ts`
- Create: `src/lib/validators/product.test.ts`

**Step 1: Write the validator**

```typescript
// src/lib/validators/product.ts
import { z } from 'zod';

export const createProductSchema = z.object({
	sku: z.string().min(1, 'Le SKU est requis').max(50),
	name: z.string().min(1, 'Le nom est requis').max(255),
	description: z.string().max(1000).optional(),
	categoryId: z.string().nullable().optional(),
	unit: z.string().min(1).max(50).default('unité'),
	purchasePrice: z.number().min(0, 'Le prix doit être positif').default(0),
	salePrice: z.number().min(0, 'Le prix doit être positif').default(0),
	minStock: z.number().int().min(0).default(0)
});

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });

export const updateProductWarehouseSchema = z.object({
	minStock: z.number().int().min(0).nullable()
});

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type UpdateProductWarehouse = z.infer<typeof updateProductWarehouseSchema>;
```

**Step 2: Write tests**

```typescript
// src/lib/validators/product.test.ts
import { describe, it, expect } from 'vitest';
import { createProductSchema, updateProductSchema, updateProductWarehouseSchema } from './product';

describe('createProductSchema', () => {
	it('should accept valid product', () => {
		const result = createProductSchema.safeParse({
			sku: 'PRD-001',
			name: 'Filtre à huile',
			purchasePrice: 5000,
			salePrice: 7500
		});
		expect(result.success).toBe(true);
	});

	it('should apply defaults', () => {
		const result = createProductSchema.parse({
			sku: 'PRD-001',
			name: 'Filtre'
		});
		expect(result.unit).toBe('unité');
		expect(result.purchasePrice).toBe(0);
		expect(result.salePrice).toBe(0);
		expect(result.minStock).toBe(0);
	});

	it('should reject empty SKU', () => {
		const result = createProductSchema.safeParse({ sku: '', name: 'Test' });
		expect(result.success).toBe(false);
	});

	it('should reject negative price', () => {
		const result = createProductSchema.safeParse({
			sku: 'X',
			name: 'Test',
			purchasePrice: -100
		});
		expect(result.success).toBe(false);
	});
});

describe('updateProductSchema', () => {
	it('should allow partial updates without SKU', () => {
		const result = updateProductSchema.safeParse({ name: 'New name' });
		expect(result.success).toBe(true);
	});
});

describe('updateProductWarehouseSchema', () => {
	it('should accept valid minStock', () => {
		const result = updateProductWarehouseSchema.safeParse({ minStock: 10 });
		expect(result.success).toBe(true);
	});

	it('should accept null minStock', () => {
		const result = updateProductWarehouseSchema.safeParse({ minStock: null });
		expect(result.success).toBe(true);
	});
});
```

**Step 3: Run tests**

Run: `DATABASE_URL=local.db pnpm test:unit -- --run --project server -t "createProductSchema"`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/validators/product.ts src/lib/validators/product.test.ts
git commit -m "feat(products): add Zod validators with tests"
```

---

## Task 4: Products API (list, create)

**Files:**
- Create: `src/routes/api/v1/products/+server.ts`

**Step 1: Write the route**

```typescript
// src/routes/api/v1/products/+server.ts
import { json, error } from '@sveltejs/kit';
import { eq, and, desc, sql, like, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, categories, productWarehouse } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createProductSchema } from '$lib/validators/product';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const search = url.searchParams.get('search');
	const categoryId = url.searchParams.get('category');
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [eq(products.isActive, true)];

	if (search) {
		conditions.push(
			sql`(${products.sku} LIKE ${'%' + search + '%'} OR ${products.name} LIKE ${'%' + search + '%'})`
		);
	}

	if (categoryId) {
		conditions.push(eq(products.categoryId, categoryId));
	}

	const whereClause = and(...conditions);

	const [productList, [{ count: total }]] = await Promise.all([
		db
			.select()
			.from(products)
			.where(whereClause)
			.orderBy(desc(products.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(products)
			.where(whereClause)
	]);

	// Fetch stock totals for each product
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	const productsWithStock = await Promise.all(
		productList.map(async (p) => {
			let stockConditions: SQL[] = [eq(productWarehouse.productId, p.id)];
			if (warehouseIds !== null && warehouseIds.length > 0) {
				stockConditions.push(
					sql`${productWarehouse.warehouseId} IN (${sql.join(
						warehouseIds.map((id) => sql`${id}`),
						sql`, `
					)})`
				);
			} else if (warehouseIds !== null) {
				return { ...p, totalStock: 0, stockValue: 0 };
			}

			const [stockResult] = await db
				.select({
					totalStock: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
					stockValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
				})
				.from(productWarehouse)
				.where(and(...stockConditions));

			return { ...p, totalStock: stockResult.totalStock, stockValue: stockResult.stockValue };
		})
	);

	return json({ data: productsWithStock, pagination: { page, limit, total } });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) {
		error(403, 'Accès non autorisé');
	}

	const body = await request.json();
	const parsed = createProductSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Check SKU uniqueness
	const existing = await db.query.products.findFirst({
		where: eq(products.sku, parsed.data.sku)
	});
	if (existing) {
		error(409, { message: 'Ce SKU existe déjà' });
	}

	// Validate categoryId exists if provided
	if (parsed.data.categoryId) {
		const cat = await db.query.categories.findFirst({
			where: eq(categories.id, parsed.data.categoryId)
		});
		if (!cat) error(400, { message: 'Catégorie introuvable' });
	}

	const [product] = await db
		.insert(products)
		.values({
			sku: parsed.data.sku,
			name: parsed.data.name,
			description: parsed.data.description,
			categoryId: parsed.data.categoryId ?? null,
			unit: parsed.data.unit,
			purchasePrice: parsed.data.purchasePrice,
			salePrice: parsed.data.salePrice,
			minStock: parsed.data.minStock
		})
		.returning();

	return json({ data: product }, { status: 201 });
};
```

**Step 2: Commit**

```bash
git add src/routes/api/v1/products/+server.ts
git commit -m "feat(products): add GET list and POST create API"
```

---

## Task 5: Products [id] API (get, update, delete) + warehouse config

**Files:**
- Create: `src/routes/api/v1/products/[id]/+server.ts`
- Create: `src/routes/api/v1/products/[id]/warehouses/[warehouseId]/+server.ts`

**Step 1: Write the product detail route**

```typescript
// src/routes/api/v1/products/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, productWarehouse, warehouses, movements } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { updateProductSchema } from '$lib/validators/product';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const product = await db.query.products.findFirst({
		where: eq(products.id, params.id),
		with: { category: true }
	});

	if (!product || !product.isActive) error(404, 'Produit introuvable');

	// Stock by warehouse (filtered by user scope)
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	let stockQuery = db
		.select({
			warehouseId: productWarehouse.warehouseId,
			warehouseName: warehouses.name,
			quantity: productWarehouse.quantity,
			minStock: productWarehouse.minStock,
			pump: productWarehouse.pump,
			valuation: sql<number>`${productWarehouse.quantity} * ${productWarehouse.pump}`
		})
		.from(productWarehouse)
		.innerJoin(warehouses, eq(productWarehouse.warehouseId, warehouses.id))
		.where(eq(productWarehouse.productId, params.id));

	const warehouseStock = await stockQuery;

	// Filter by accessible warehouses if not global scope
	const filteredStock =
		warehouseIds === null
			? warehouseStock
			: warehouseStock.filter((s) => warehouseIds.includes(s.warehouseId));

	const totalStock = filteredStock.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
	const totalValue = filteredStock.reduce((sum, s) => sum + (s.valuation ?? 0), 0);

	return json({
		data: {
			...product,
			warehouses: filteredStock,
			totalStock,
			stockValue: totalValue
		}
	});
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Accès non autorisé');

	const body = await request.json();
	const parsed = updateProductSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const existing = await db.query.products.findFirst({
		where: eq(products.id, params.id)
	});
	if (!existing) error(404, 'Produit introuvable');

	const [updated] = await db
		.update(products)
		.set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
		.where(eq(products.id, params.id))
		.returning();

	return json({ data: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Accès non autorisé');

	const existing = await db.query.products.findFirst({
		where: eq(products.id, params.id)
	});
	if (!existing) error(404, 'Produit introuvable');

	// Soft delete
	await db
		.update(products)
		.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
		.where(eq(products.id, params.id));

	return json({ success: true });
};
```

**Step 2: Write the warehouse config route**

```typescript
// src/routes/api/v1/products/[id]/warehouses/[warehouseId]/+server.ts
import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { productWarehouse, products, warehouses } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { updateProductWarehouseSchema } from '$lib/validators/product';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canManage(role)) error(403, 'Accès non autorisé');
	await requireWarehouseAccess(user.id, params.warehouseId, role);

	const body = await request.json();
	const parsed = updateProductWarehouseSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify product and warehouse exist
	const product = await db.query.products.findFirst({ where: eq(products.id, params.id) });
	if (!product) error(404, 'Produit introuvable');

	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, params.warehouseId)
	});
	if (!warehouse) error(404, 'Entrepôt introuvable');

	// Upsert product_warehouse row
	await db
		.insert(productWarehouse)
		.values({
			productId: params.id,
			warehouseId: params.warehouseId,
			minStock: parsed.data.minStock,
			quantity: 0,
			pump: 0
		})
		.onConflictDoUpdate({
			target: [productWarehouse.productId, productWarehouse.warehouseId],
			set: { minStock: parsed.data.minStock }
		});

	return json({ success: true });
};
```

**Step 3: Commit**

```bash
git add src/routes/api/v1/products/[id]/+server.ts src/routes/api/v1/products/[id]/warehouses/[warehouseId]/+server.ts
git commit -m "feat(products): add detail, update, delete, and warehouse config APIs"
```

---

## Task 6: Stock Service — Core with PUMP Calculation

**Files:**
- Create: `src/lib/server/services/stock.ts`
- Create: `src/lib/server/services/stock.test.ts`

This is the **most critical** task. The stock service handles all stock mutations atomically.

**Step 1: Write the stock service**

```typescript
// src/lib/server/services/stock.ts
import { db } from '$lib/server/db';
import { movements, productWarehouse, products } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type MovementType = 'in' | 'out' | 'adjustment_in' | 'adjustment_out';

export interface RecordMovementInput {
	productId: string;
	warehouseId: string;
	type: MovementType;
	quantity: number;
	reason: string;
	userId: string;
	reference?: string;
	purchasePrice?: number;
}

export const stockService = {
	async recordMovement(data: RecordMovementInput) {
		const isOut = data.type === 'out' || data.type === 'adjustment_out';
		const isIn = data.type === 'in' || data.type === 'adjustment_in';
		const delta = isOut ? -data.quantity : data.quantity;

		return await db.transaction(async (tx) => {
			// 1. Check sufficient stock for outgoing movements
			if (isOut) {
				const [current] = await tx
					.select({ quantity: productWarehouse.quantity })
					.from(productWarehouse)
					.where(
						and(
							eq(productWarehouse.productId, data.productId),
							eq(productWarehouse.warehouseId, data.warehouseId)
						)
					);

				if (!current || (current.quantity ?? 0) < data.quantity) {
					throw new Error('INSUFFICIENT_STOCK');
				}
			}

			// 2. Record the movement
			const [movement] = await tx
				.insert(movements)
				.values({
					productId: data.productId,
					warehouseId: data.warehouseId,
					type: data.type,
					quantity: data.quantity,
					reason: data.reason,
					reference: data.reference,
					userId: data.userId
				})
				.returning();

			// 3. Update stock + PUMP (upsert)
			const purchasePrice = data.purchasePrice ?? 0;

			await tx
				.insert(productWarehouse)
				.values({
					productId: data.productId,
					warehouseId: data.warehouseId,
					quantity: isOut ? 0 : data.quantity,
					pump: isIn ? purchasePrice : 0
				})
				.onConflictDoUpdate({
					target: [productWarehouse.productId, productWarehouse.warehouseId],
					set: {
						quantity: sql`MAX(0, ${productWarehouse.quantity} + ${delta})`,
						pump: isIn
							? sql`CASE
								WHEN (${productWarehouse.quantity} + ${data.quantity}) > 0
								THEN ((${productWarehouse.quantity} * ${productWarehouse.pump})
									 + (${data.quantity} * ${purchasePrice}))
									 / (${productWarehouse.quantity} + ${data.quantity})
								ELSE ${purchasePrice}
							END`
							: productWarehouse.pump,
						updatedAt: sql`(datetime('now'))`
					}
				});

			return movement;
		});
	},

	async getStockByWarehouse(productId: string) {
		return db
			.select({
				warehouseId: productWarehouse.warehouseId,
				quantity: productWarehouse.quantity,
				pump: productWarehouse.pump,
				minStock: productWarehouse.minStock,
				valuation: sql<number>`${productWarehouse.quantity} * ${productWarehouse.pump}`
			})
			.from(productWarehouse)
			.where(eq(productWarehouse.productId, productId));
	},

	async getStockConsolidated(productId: string) {
		const [result] = await db
			.select({
				totalQuantity: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
				totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
			})
			.from(productWarehouse)
			.where(eq(productWarehouse.productId, productId));

		return result;
	},

	async getValuation(warehouseId?: string) {
		const conditions = warehouseId
			? eq(productWarehouse.warehouseId, warehouseId)
			: undefined;

		const [result] = await db
			.select({
				totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
			})
			.from(productWarehouse)
			.where(conditions);

		return result.totalValue;
	},

	async checkMinStock(productId: string, warehouseId: string) {
		const [pw] = await db
			.select()
			.from(productWarehouse)
			.where(
				and(
					eq(productWarehouse.productId, productId),
					eq(productWarehouse.warehouseId, warehouseId)
				)
			);

		if (!pw) return null;

		const [product] = await db.select().from(products).where(eq(products.id, productId));
		const threshold = pw.minStock ?? product?.minStock ?? 0;

		return {
			currentQty: pw.quantity ?? 0,
			threshold,
			isBelowMin: (pw.quantity ?? 0) <= threshold
		};
	}
};
```

**Step 2: Write the tests**

```typescript
// src/lib/server/services/stock.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import { products, warehouses, productWarehouse, movements, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { stockService } from './stock';

// Test fixtures
const TEST_USER_ID = 'test-user-001';
const TEST_WAREHOUSE_ID = 'test-wh-001';
const TEST_PRODUCT_ID = 'test-prod-001';

async function cleanupTestData() {
	await db.delete(movements).where(eq(movements.userId, TEST_USER_ID));
	await db
		.delete(productWarehouse)
		.where(eq(productWarehouse.productId, TEST_PRODUCT_ID));
	await db.delete(products).where(eq(products.id, TEST_PRODUCT_ID));
	await db.delete(warehouses).where(eq(warehouses.id, TEST_WAREHOUSE_ID));
	await db.delete(user).where(eq(user.id, TEST_USER_ID));
}

async function seedTestData() {
	await cleanupTestData();

	await db.insert(user).values({
		id: TEST_USER_ID,
		name: 'Test User',
		email: 'stock-test@test.com',
		role: 'admin'
	});

	await db.insert(warehouses).values({
		id: TEST_WAREHOUSE_ID,
		name: 'Test Warehouse'
	});

	await db.insert(products).values({
		id: TEST_PRODUCT_ID,
		sku: 'TEST-STOCK-001',
		name: 'Test Product Stock',
		purchasePrice: 1000,
		salePrice: 1500
	});
}

describe('stockService', () => {
	beforeEach(async () => {
		await seedTestData();
	});

	describe('recordMovement - stock in', () => {
		it('should increment quantity on stock entry', async () => {
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const [pw] = await db
				.select()
				.from(productWarehouse)
				.where(
					and(
						eq(productWarehouse.productId, TEST_PRODUCT_ID),
						eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID)
					)
				);

			expect(pw.quantity).toBe(100);
		});

		it('should set PUMP to purchase price on first entry', async () => {
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const [pw] = await db
				.select()
				.from(productWarehouse)
				.where(
					and(
						eq(productWarehouse.productId, TEST_PRODUCT_ID),
						eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID)
					)
				);

			expect(pw.pump).toBe(1000);
		});

		it('should recalculate PUMP correctly on second entry', async () => {
			// First entry: 100 units at 1000
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			// Second entry: 50 units at 2000
			// PUMP = (100 * 1000 + 50 * 2000) / (100 + 50) = 200000 / 150 ≈ 1333.33
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 50,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 2000
			});

			const [pw] = await db
				.select()
				.from(productWarehouse)
				.where(
					and(
						eq(productWarehouse.productId, TEST_PRODUCT_ID),
						eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID)
					)
				);

			expect(pw.quantity).toBe(150);
			expect(pw.pump).toBeCloseTo(1333.33, 1);
		});
	});

	describe('recordMovement - stock out', () => {
		it('should decrement quantity on stock exit', async () => {
			// Setup: add stock first
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			// Remove 30
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'out',
				quantity: 30,
				reason: 'vente',
				userId: TEST_USER_ID
			});

			const [pw] = await db
				.select()
				.from(productWarehouse)
				.where(
					and(
						eq(productWarehouse.productId, TEST_PRODUCT_ID),
						eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID)
					)
				);

			expect(pw.quantity).toBe(70);
		});

		it('should NOT change PUMP on stock exit', async () => {
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'out',
				quantity: 30,
				reason: 'vente',
				userId: TEST_USER_ID
			});

			const [pw] = await db
				.select()
				.from(productWarehouse)
				.where(
					and(
						eq(productWarehouse.productId, TEST_PRODUCT_ID),
						eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID)
					)
				);

			expect(pw.pump).toBe(1000);
		});

		it('should throw INSUFFICIENT_STOCK when not enough stock', async () => {
			await expect(
				stockService.recordMovement({
					productId: TEST_PRODUCT_ID,
					warehouseId: TEST_WAREHOUSE_ID,
					type: 'out',
					quantity: 10,
					reason: 'vente',
					userId: TEST_USER_ID
				})
			).rejects.toThrow('INSUFFICIENT_STOCK');
		});

		it('should throw INSUFFICIENT_STOCK when removing more than available', async () => {
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 50,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			await expect(
				stockService.recordMovement({
					productId: TEST_PRODUCT_ID,
					warehouseId: TEST_WAREHOUSE_ID,
					type: 'out',
					quantity: 51,
					reason: 'vente',
					userId: TEST_USER_ID
				})
			).rejects.toThrow('INSUFFICIENT_STOCK');
		});
	});

	describe('recordMovement - stock zero then entry', () => {
		it('should reset PUMP to purchase price after zero stock', async () => {
			// Add 10 at 1000
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 10,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			// Remove all 10
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'out',
				quantity: 10,
				reason: 'vente',
				userId: TEST_USER_ID
			});

			// Add 5 at 2000 — PUMP should be 2000 (not averaged with old)
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 5,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 2000
			});

			const [pw] = await db
				.select()
				.from(productWarehouse)
				.where(
					and(
						eq(productWarehouse.productId, TEST_PRODUCT_ID),
						eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID)
					)
				);

			expect(pw.quantity).toBe(5);
			expect(pw.pump).toBe(2000);
		});
	});

	describe('recordMovement - creates movement record', () => {
		it('should create a movement entry in the database', async () => {
			const movement = await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 50,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000,
				reference: 'BL-001'
			});

			expect(movement).toBeDefined();
			expect(movement.id).toBeDefined();
			expect(movement.quantity).toBe(50);
			expect(movement.reason).toBe('achat');
			expect(movement.reference).toBe('BL-001');
		});
	});

	describe('checkMinStock', () => {
		it('should detect stock below threshold', async () => {
			// Set min stock on product
			await db
				.update(products)
				.set({ minStock: 20 })
				.where(eq(products.id, TEST_PRODUCT_ID));

			// Add 10 units (below threshold of 20)
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 10,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const result = await stockService.checkMinStock(TEST_PRODUCT_ID, TEST_WAREHOUSE_ID);

			expect(result).toBeDefined();
			expect(result!.isBelowMin).toBe(true);
			expect(result!.currentQty).toBe(10);
			expect(result!.threshold).toBe(20);
		});
	});

	describe('getStockConsolidated', () => {
		it('should return consolidated stock across warehouses', async () => {
			await stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const result = await stockService.getStockConsolidated(TEST_PRODUCT_ID);

			expect(result.totalQuantity).toBe(100);
			expect(result.totalValue).toBe(100000);
		});
	});
});
```

**Step 3: Run tests**

Run: `DATABASE_URL=local.db pnpm test:unit -- --run --project server -t "stockService"`
Expected: PASS (all 10 tests)

**Step 4: Commit**

```bash
git add src/lib/server/services/stock.ts src/lib/server/services/stock.test.ts
git commit -m "feat(stock): add stock service with PUMP calculation and tests"
```

---

## Task 7: Movement Validator + API

**Files:**
- Create: `src/lib/validators/movement.ts`
- Create: `src/lib/validators/movement.test.ts`
- Create: `src/routes/api/v1/movements/+server.ts`
- Create: `src/routes/api/v1/movements/[id]/+server.ts`

**Step 1: Write the validator**

```typescript
// src/lib/validators/movement.ts
import { z } from 'zod';

export const MOVEMENT_TYPES = ['in', 'out', 'adjustment_in', 'adjustment_out'] as const;

export const MOVEMENT_REASONS = [
	'achat',
	'vente',
	'retour',
	'perte',
	'ajustement',
	'transfert',
	'autre'
] as const;

export const createMovementSchema = z
	.object({
		productId: z.string().min(1, 'Le produit est requis'),
		warehouseId: z.string().min(1, "L'entrepôt est requis"),
		type: z.enum(MOVEMENT_TYPES),
		quantity: z.number().int().positive('La quantité doit être positive'),
		reason: z.string().min(1, 'Le motif est requis').max(255),
		reference: z.string().max(100).optional(),
		purchasePrice: z.number().min(0).optional()
	})
	.refine(
		(data) => {
			// Require purchasePrice for incoming movements
			if (data.type === 'in' || data.type === 'adjustment_in') {
				return data.purchasePrice !== undefined && data.purchasePrice >= 0;
			}
			return true;
		},
		{ message: "Le prix d'achat est requis pour les entrées", path: ['purchasePrice'] }
	);

export type CreateMovement = z.infer<typeof createMovementSchema>;
```

**Step 2: Write tests**

```typescript
// src/lib/validators/movement.test.ts
import { describe, it, expect } from 'vitest';
import { createMovementSchema } from './movement';

describe('createMovementSchema', () => {
	it('should accept valid stock entry with purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'in',
			quantity: 100,
			reason: 'achat',
			purchasePrice: 5000
		});
		expect(result.success).toBe(true);
	});

	it('should reject stock entry without purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'in',
			quantity: 100,
			reason: 'achat'
		});
		expect(result.success).toBe(false);
	});

	it('should accept stock exit without purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'out',
			quantity: 50,
			reason: 'vente'
		});
		expect(result.success).toBe(true);
	});

	it('should reject zero quantity', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'in',
			quantity: 0,
			reason: 'achat',
			purchasePrice: 1000
		});
		expect(result.success).toBe(false);
	});

	it('should reject negative quantity', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'out',
			quantity: -5,
			reason: 'vente'
		});
		expect(result.success).toBe(false);
	});
});
```

**Step 3: Run tests**

Run: `DATABASE_URL=local.db pnpm test:unit -- --run --project server -t "createMovementSchema"`
Expected: PASS

**Step 4: Write the movements API**

```typescript
// src/routes/api/v1/movements/+server.ts
import { json, error } from '@sveltejs/kit';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { movements, products, warehouses } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canWrite, type Role } from '$lib/server/auth/rbac';
import { createMovementSchema } from '$lib/validators/movement';
import { stockService } from '$lib/server/services/stock';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const productId = url.searchParams.get('productId');
	const warehouseId = url.searchParams.get('warehouseId');
	const type = url.searchParams.get('type');
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [];

	// Scope by accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	if (warehouseIds !== null) {
		if (warehouseIds.length === 0) return json({ data: [], pagination: { page, limit, total: 0 } });
		conditions.push(
			sql`${movements.warehouseId} IN (${sql.join(
				warehouseIds.map((id) => sql`${id}`),
				sql`, `
			)})`
		);
	}

	if (productId) conditions.push(eq(movements.productId, productId));
	if (warehouseId) conditions.push(eq(movements.warehouseId, warehouseId));
	if (type) conditions.push(eq(movements.type, type as 'in' | 'out' | 'adjustment_in' | 'adjustment_out'));

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [movementList, [{ count: total }]] = await Promise.all([
		db
			.select({
				id: movements.id,
				productId: movements.productId,
				productName: products.name,
				productSku: products.sku,
				warehouseId: movements.warehouseId,
				warehouseName: warehouses.name,
				type: movements.type,
				quantity: movements.quantity,
				reason: movements.reason,
				reference: movements.reference,
				userId: movements.userId,
				createdAt: movements.createdAt
			})
			.from(movements)
			.innerJoin(products, eq(movements.productId, products.id))
			.innerJoin(warehouses, eq(movements.warehouseId, warehouses.id))
			.where(whereClause)
			.orderBy(desc(movements.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(movements)
			.where(whereClause)
	]);

	return json({ data: movementList, pagination: { page, limit, total } });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canWrite(role)) error(403, 'Accès non autorisé');

	const body = await request.json();
	const parsed = createMovementSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify warehouse access
	await requireWarehouseAccess(user.id, parsed.data.warehouseId, role);

	// Verify product exists and is active
	const product = await db.query.products.findFirst({
		where: eq(products.id, parsed.data.productId)
	});
	if (!product || !product.isActive) error(404, 'Produit introuvable');

	// Verify warehouse exists and is active
	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, parsed.data.warehouseId)
	});
	if (!warehouse || !warehouse.isActive) error(404, 'Entrepôt introuvable');

	try {
		const movement = await stockService.recordMovement({
			...parsed.data,
			userId: user.id
		});

		return json({ data: movement }, { status: 201 });
	} catch (err) {
		if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
			error(400, { message: 'Stock insuffisant' });
		}
		throw err;
	}
};
```

**Step 5: Write the movement detail route**

```typescript
// src/routes/api/v1/movements/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { movements } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { type Role } from '$lib/server/auth/rbac';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const movement = await db.query.movements.findFirst({
		where: eq(movements.id, params.id),
		with: {
			product: true,
			warehouse: true,
			user: {
				columns: { id: true, name: true, email: true }
			}
		}
	});

	if (!movement) error(404, 'Mouvement introuvable');

	await requireWarehouseAccess(user.id, movement.warehouseId, role);

	return json({ data: movement });
};
```

**Step 6: Commit**

```bash
git add src/lib/validators/movement.ts src/lib/validators/movement.test.ts src/routes/api/v1/movements/+server.ts src/routes/api/v1/movements/[id]/+server.ts
git commit -m "feat(movements): add validator, tests, and CRUD API endpoints"
```

---

## Task 8: Format Utils

**Files:**
- Create: `src/lib/utils/format.ts`

**Step 1: Write the utility**

```typescript
// src/lib/utils/format.ts

export function formatXOF(amount: number): string {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'XOF',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatDate(date: string | null | undefined): string {
	if (!date) return '—';
	return new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(date));
}

export function formatQuantity(qty: number, unit: string = 'unité'): string {
	return `${qty.toLocaleString('fr-FR')} ${unit}${qty > 1 && unit === 'unité' ? 's' : ''}`;
}
```

**Step 2: Commit**

```bash
git add src/lib/utils/format.ts
git commit -m "feat(utils): add formatXOF, formatDate, formatQuantity helpers"
```

---

## Task 9: Products List Page (Frontend)

**Files:**
- Modify: `src/routes/(app)/products/+page.svelte` (replace stub)
- Create: `src/routes/(app)/products/+page.server.ts`

**Step 1: Write the server load function**

```typescript
// src/routes/(app)/products/+page.server.ts
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, categories, productWarehouse } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuth(locals.user!);
	const role = user.role as Role;

	const search = url.searchParams.get('search') ?? '';
	const categoryId = url.searchParams.get('category') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [eq(products.isActive, true)];

	if (search) {
		conditions.push(
			sql`(${products.sku} LIKE ${'%' + search + '%'} OR ${products.name} LIKE ${'%' + search + '%'})`
		);
	}

	if (categoryId) {
		conditions.push(eq(products.categoryId, categoryId));
	}

	const whereClause = and(...conditions);

	const [productList, [{ count: total }], allCategories] = await Promise.all([
		db
			.select()
			.from(products)
			.where(whereClause)
			.orderBy(desc(products.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ count: sql<number>`COUNT(*)` }).from(products).where(whereClause),
		db.select().from(categories)
	]);

	// Get stock totals
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	const productsWithStock = await Promise.all(
		productList.map(async (p) => {
			const [stockResult] = await db
				.select({
					totalStock: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
					stockValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
				})
				.from(productWarehouse)
				.where(eq(productWarehouse.productId, p.id));

			return { ...p, totalStock: stockResult.totalStock, stockValue: stockResult.stockValue };
		})
	);

	return {
		products: productsWithStock,
		categories: allCategories,
		pagination: { page, limit, total },
		filters: { search, categoryId },
		canCreate: canManage(role)
	};
};
```

**Step 2: Write the page component**

Replace the existing stub `src/routes/(app)/products/+page.svelte` with a full product list page. The page should include:
- Search bar (by SKU or name)
- Category filter dropdown
- Paginated product table/cards with columns: SKU, Name, Category, Stock, Value (XOF), Price
- Low stock indicator (red badge if below threshold)
- "New Product" button (visible only if `canCreate`)
- Mobile-responsive: cards on small screens, table on desktop
- Use existing UI components: `PageHeader`, `Input`, `Select`, `Badge`, `Card`, `EmptyState`, `Button`
- Use `formatXOF()` from `$lib/utils/format`
- Navigation with `resolve()` from `$app/paths`

**Step 3: Commit**

```bash
git add src/routes/\(app\)/products/+page.svelte src/routes/\(app\)/products/+page.server.ts
git commit -m "feat(products): add product list page with search and filters"
```

---

## Task 10: Product Create Page

**Files:**
- Create: `src/routes/(app)/products/new/+page.svelte`
- Create: `src/routes/(app)/products/new/+page.server.ts`

**Step 1: Write server load + actions**

```typescript
// src/routes/(app)/products/new/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, categories } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createProductSchema } from '$lib/validators/product';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuth(locals.user!);
	if (!canManage(user.role as Role)) redirect(303, '/products');

	const allCategories = await db.select().from(categories);
	return { categories: allCategories };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user!);
		if (!canManage(user.role as Role)) return fail(403, { error: 'Accès non autorisé' });

		const formData = await request.formData();
		const data = {
			sku: (formData.get('sku') as string)?.trim(),
			name: (formData.get('name') as string)?.trim(),
			description: (formData.get('description') as string) || undefined,
			categoryId: (formData.get('categoryId') as string) || null,
			unit: (formData.get('unit') as string) || 'unité',
			purchasePrice: Number(formData.get('purchasePrice')) || 0,
			salePrice: Number(formData.get('salePrice')) || 0,
			minStock: Number(formData.get('minStock')) || 0
		};

		const parsed = createProductSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { data, errors: parsed.error.flatten().fieldErrors });
		}

		// Check SKU uniqueness
		const existing = await db.query.products.findFirst({
			where: eq(products.sku, parsed.data.sku)
		});
		if (existing) {
			return fail(409, { data, errors: { sku: ['Ce SKU existe déjà'] } });
		}

		const [product] = await db
			.insert(products)
			.values({
				sku: parsed.data.sku,
				name: parsed.data.name,
				description: parsed.data.description,
				categoryId: parsed.data.categoryId ?? null,
				unit: parsed.data.unit,
				purchasePrice: parsed.data.purchasePrice,
				salePrice: parsed.data.salePrice,
				minStock: parsed.data.minStock
			})
			.returning();

		redirect(303, `/products/${product.id}`);
	}
};
```

**Step 2: Write the page component**

Create `src/routes/(app)/products/new/+page.svelte` with:
- Form with fields: SKU, Name, Description (textarea), Category (select), Unit, Purchase Price, Sale Price, Min Stock
- Zod error display per field
- Category dropdown populated from server data
- "Créer le produit" button with loading state
- Mobile-friendly layout
- Use `enhance` for progressive enhancement
- Use existing UI components: `PageHeader`, `Input`, `Select`, `Button`, `Card`

**Step 3: Commit**

```bash
git add src/routes/\(app\)/products/new/+page.svelte src/routes/\(app\)/products/new/+page.server.ts
git commit -m "feat(products): add product creation page with form validation"
```

---

## Task 11: Product Detail Page

**Files:**
- Create: `src/routes/(app)/products/[id]/+page.svelte`
- Create: `src/routes/(app)/products/[id]/+page.server.ts`

**Step 1: Write server load**

```typescript
// src/routes/(app)/products/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, productWarehouse, warehouses, movements, categories } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireAuth(locals.user!);
	const role = user.role as Role;

	const product = await db.query.products.findFirst({
		where: eq(products.id, params.id),
		with: { category: true }
	});

	if (!product || !product.isActive) error(404, 'Produit introuvable');

	// Stock by warehouse
	const warehouseStock = await db
		.select({
			warehouseId: productWarehouse.warehouseId,
			warehouseName: warehouses.name,
			quantity: productWarehouse.quantity,
			minStock: productWarehouse.minStock,
			pump: productWarehouse.pump,
			valuation: sql<number>`${productWarehouse.quantity} * ${productWarehouse.pump}`
		})
		.from(productWarehouse)
		.innerJoin(warehouses, eq(productWarehouse.warehouseId, warehouses.id))
		.where(eq(productWarehouse.productId, params.id));

	// Filter by user scope
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	const filteredStock =
		warehouseIds === null
			? warehouseStock
			: warehouseStock.filter((s) => warehouseIds.includes(s.warehouseId));

	// Recent movements
	const recentMovements = await db.query.movements.findMany({
		where: eq(movements.productId, params.id),
		with: {
			warehouse: { columns: { name: true } },
			user: { columns: { name: true } }
		},
		orderBy: desc(movements.createdAt),
		limit: 20
	});

	const totalStock = filteredStock.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
	const totalValue = filteredStock.reduce((sum, s) => sum + (s.valuation ?? 0), 0);

	return {
		product,
		warehouseStock: filteredStock,
		recentMovements,
		totalStock,
		totalValue,
		canEdit: canManage(role)
	};
};
```

**Step 2: Write the page component**

Create `src/routes/(app)/products/[id]/+page.svelte` with:
- Product header showing name, SKU, category
- Tabs or sections: Info, Stock by Warehouse, Recent Movements
- Info section: description, unit, prices (XOF), min stock
- Stock section: table showing warehouse name, quantity, min stock, PUMP, valuation
- Low stock badges
- Movements section: timeline/table of recent movements
- Edit button (if canEdit)
- Quick action: "New Movement" button linking to `/movements/new?productId=X`
- Use `formatXOF()`, `formatDate()` from `$lib/utils/format`

**Step 3: Commit**

```bash
git add src/routes/\(app\)/products/\[id\]/+page.svelte src/routes/\(app\)/products/\[id\]/+page.server.ts
git commit -m "feat(products): add product detail page with stock and movements"
```

---

## Task 12: Product Edit Page

**Files:**
- Create: `src/routes/(app)/products/[id]/edit/+page.svelte`
- Create: `src/routes/(app)/products/[id]/edit/+page.server.ts`

**Step 1: Write server load + actions**

Similar to create page but pre-populated with existing data. Load product data, categories. Action validates with `updateProductSchema`, updates the product. Redirects back to product detail.

**Step 2: Write the page component**

Same form as create, pre-filled from `data.product`. SKU field is read-only (cannot change SKU).

**Step 3: Commit**

```bash
git add src/routes/\(app\)/products/\[id\]/edit/+page.svelte src/routes/\(app\)/products/\[id\]/edit/+page.server.ts
git commit -m "feat(products): add product edit page"
```

---

## Task 13: Movements List Page (Frontend)

**Files:**
- Modify: `src/routes/(app)/movements/+page.svelte` (replace stub)
- Create: `src/routes/(app)/movements/+page.server.ts`

**Step 1: Write server load**

Load movements with pagination, filters (product, warehouse, type, date range). Join with products and warehouses for display names. Scope by user accessible warehouses.

**Step 2: Write the page component**

Create movements list page with:
- Filters: warehouse select, movement type, search by product
- Paginated table showing: date, product (SKU + name), warehouse, type (colored badge), quantity, reason, reference, user
- "New Movement" button (if `canWrite`)
- Mobile-responsive: card layout

**Step 3: Commit**

```bash
git add src/routes/\(app\)/movements/+page.svelte src/routes/\(app\)/movements/+page.server.ts
git commit -m "feat(movements): add movements list page with filters"
```

---

## Task 14: Movement Create Page

**Files:**
- Create: `src/routes/(app)/movements/new/+page.svelte`
- Create: `src/routes/(app)/movements/new/+page.server.ts`

**Step 1: Write server load + actions**

Load accessible warehouses and products. Accept `productId` and `warehouseId` as optional URL params for pre-selection. Action validates with `createMovementSchema`, calls `stockService.recordMovement()`. Handles `INSUFFICIENT_STOCK` error gracefully.

**Step 2: Write the page component**

Movement form with:
1. Warehouse select (pre-filtered by role)
2. Product search/select (autocomplete or select input)
3. Movement type toggle (Entry / Exit)
4. Quantity input (numeric, large on mobile)
5. Reason select (predefined list) + custom reason input
6. Purchase price input (visible only for entries)
7. Reference input (optional, for invoice/receipt number)
8. Confirmation summary before submit

Support URL params: `?productId=X&warehouseId=Y` for pre-filling from product detail page.

Mobile-optimized: large touch targets, clear type toggle, big quantity input.

**Step 3: Commit**

```bash
git add src/routes/\(app\)/movements/new/+page.svelte src/routes/\(app\)/movements/new/+page.server.ts
git commit -m "feat(movements): add movement creation page with stock validation"
```

---

## Task 15: Barcode Scanner Component

**Files:**
- Create: `src/lib/components/scan/BarcodeScanner.svelte`

**Note:** `html5-qrcode` is NOT in package.json yet. Install it first.

**Step 1: Install dependency**

Run: `pnpm add html5-qrcode`

**Step 2: Write the scanner component**

```svelte
<!-- src/lib/components/scan/BarcodeScanner.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		continuous?: boolean;
		onscan?: (code: string) => void;
		onerror?: (message: string) => void;
	}

	let { continuous = false, onscan, onerror }: Props = $props();

	let scanning = $state(false);
	let scanner: any = $state(null);
	let scannerRegionId = `scanner-${Math.random().toString(36).slice(2)}`;

	onMount(async () => {
		const { Html5Qrcode } = await import('html5-qrcode');
		scanner = new Html5Qrcode(scannerRegionId);
	});

	async function startScan() {
		if (!scanner) return;
		try {
			await scanner.start(
				{ facingMode: 'environment' },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				(code: string) => {
					onscan?.(code);
					if (!continuous) stopScan();
				},
				() => {} // ignore decode failures during scanning
			);
			scanning = true;
		} catch {
			onerror?.('Caméra non disponible');
		}
	}

	async function stopScan() {
		if (scanner && scanning) {
			try {
				await scanner.stop();
			} catch {
				// ignore stop errors
			}
			scanning = false;
		}
	}

	onDestroy(() => {
		stopScan();
	});
</script>

<div class="space-y-3">
	<div id={scannerRegionId} class="overflow-hidden rounded-lg"></div>

	{#if !scanning}
		<button
			type="button"
			onclick={startScan}
			class="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
		>
			Scanner un code-barres
		</button>
	{:else}
		<button
			type="button"
			onclick={stopScan}
			class="w-full rounded-lg bg-gray-600 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700"
		>
			Arrêter le scan
		</button>
	{/if}
</div>
```

**Step 3: Integrate scanner into movement creation page**

Add the `<BarcodeScanner />` component to the movement creation page. When a barcode is scanned:
1. Search the product by SKU
2. If found, pre-fill the productId in the form
3. If not found, show an error message with the scanned code
4. Provide a manual SKU input as fallback

**Step 4: Commit**

```bash
git add src/lib/components/scan/BarcodeScanner.svelte
git commit -m "feat(scan): add barcode scanner component with html5-qrcode"
```

---

## Task 16: Run All Tests + Verify Build

**Step 1: Run all server tests**

Run: `DATABASE_URL=local.db pnpm test:unit -- --run --project server`
Expected: All tests pass (validators + stock service + rbac + guards)

**Step 2: Run type check**

Run: `BETTER_AUTH_SECRET="dev-secret" pnpm check`
Expected: No errors

**Step 3: Run build**

Run: `BETTER_AUTH_SECRET="dev-secret" pnpm build`
Expected: Build succeeds

**Step 4: Push schema to DB**

Run: `DATABASE_URL=local.db pnpm db:push -- --force`
Expected: Schema up to date (no new tables needed — all tables already exist from Week 1)

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: week 2 core business modules complete"
```

---

## Task Summary

| # | Task | Files | Tests | Priority |
|---|------|-------|-------|----------|
| 1 | Category validator + API | 3 files | 3 tests | Must |
| 2 | Category [id] API | 1 file | — | Must |
| 3 | Product validator + tests | 2 files | 8 tests | Must |
| 4 | Products API (list/create) | 1 file | — | Must |
| 5 | Products [id] API + warehouse config | 2 files | — | Must |
| 6 | **Stock Service + PUMP + tests** | 2 files | **10 tests** | **Critical** |
| 7 | Movement validator + API | 4 files | 5 tests | Must |
| 8 | Format utils | 1 file | — | Must |
| 9 | Products list page | 2 files | — | Must |
| 10 | Product create page | 2 files | — | Must |
| 11 | Product detail page | 2 files | — | Must |
| 12 | Product edit page | 2 files | — | Must |
| 13 | Movements list page | 2 files | — | Must |
| 14 | Movement create page | 2 files | — | Must |
| 15 | Barcode scanner component | 1 file | — | Must |
| 16 | Verify tests + build | — | All | Must |

**Dependencies:** Tasks 1-2 (categories) → Tasks 3-5 (products) → Task 6 (stock service) → Tasks 7 (movements API) → Tasks 9-14 (UI pages). Task 8 (utils) and Task 15 (scanner) are independent.

**Run tests after:** Tasks 3, 6, 7, and 16.
