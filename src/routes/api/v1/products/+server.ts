import { json, error } from '@sveltejs/kit';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
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

	// Fetch stock totals for each product, scoped to user's accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	const productsWithStock = await Promise.all(
		productList.map(async (p) => {
			const stockConditions: SQL[] = [eq(productWarehouse.productId, p.id)];
			if (warehouseIds !== null && warehouseIds.length > 0) {
				stockConditions.push(
					sql`${productWarehouse.warehouseId} IN (${sql.join(
						warehouseIds.map((id) => sql`${id}`),
						sql`, `
					)})`
				);
			} else if (warehouseIds !== null) {
				// User has warehouse-scoped role but no warehouses assigned
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
