import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, categories, productWarehouse } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
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
			const stockConditions: SQL[] = [eq(productWarehouse.productId, p.id)];
			if (warehouseIds) {
				stockConditions.push(
					sql`${productWarehouse.warehouseId} IN (${sql.join(
						warehouseIds.map((id) => sql`${id}`),
						sql`, `
					)})`
				);
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

	return {
		products: productsWithStock,
		categories: allCategories,
		pagination: { page, limit, total },
		filters: { search, categoryId },
		canCreate: canManage(role)
	};
};
