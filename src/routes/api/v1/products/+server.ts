import { json, error } from '@sveltejs/kit';
import { eq, and, desc, inArray, sql, type SQL } from 'drizzle-orm';
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
	const warehouseId = url.searchParams.get('warehouseId');
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

	// Filter by warehouse: only return products that have stock in the given warehouse
	if (warehouseId) {
		const warehouseProducts = await db
			.select({ productId: productWarehouse.productId })
			.from(productWarehouse)
			.where(eq(productWarehouse.warehouseId, warehouseId));

		const warehouseProductIds = warehouseProducts.map((p) => p.productId);
		if (warehouseProductIds.length === 0) {
			return json({ data: [], pagination: { page, limit, total: 0 } });
		}
		conditions.push(inArray(products.id, warehouseProductIds));
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

	// Fetch stock totals in a single aggregation query
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	const productIds = productList.map((p) => p.id);

	let stockMap = new Map<string, { totalStock: number; stockValue: number }>();
	if (productIds.length > 0) {
		if (warehouseIds !== null && warehouseIds.length === 0) {
			// User has warehouse-scoped role but no warehouses assigned
		} else {
			const stockConditions: SQL[] = [
				sql`${productWarehouse.productId} IN (${sql.join(
					productIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			];
			if (warehouseIds !== null && warehouseIds.length > 0) {
				stockConditions.push(
					sql`${productWarehouse.warehouseId} IN (${sql.join(
						warehouseIds.map((id) => sql`${id}`),
						sql`, `
					)})`
				);
			}

			const stockResults = await db
				.select({
					productId: productWarehouse.productId,
					totalStock: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
					stockValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
				})
				.from(productWarehouse)
				.where(and(...stockConditions))
				.groupBy(productWarehouse.productId);

			for (const row of stockResults) {
				stockMap.set(row.productId, {
					totalStock: row.totalStock,
					stockValue: row.stockValue
				});
			}
		}
	}

	const productsWithStock = productList.map((p) => ({
		...p,
		totalStock: stockMap.get(p.id)?.totalStock ?? 0,
		stockValue: stockMap.get(p.id)?.stockValue ?? 0
	}));

	return json({ data: productsWithStock, pagination: { page, limit, total } });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) {
		error(403, 'Accès non autorisé');
	}

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Corps JSON invalide' });
	}
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

	let product;
	try {
		[product] = await db
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
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
			error(409, { message: 'Ce SKU existe déjà' });
		}
		throw err;
	}

	return json({ data: product }, { status: 201 });
};
