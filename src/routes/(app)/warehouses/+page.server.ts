import { db } from '$lib/server/db';
import { warehouses, productWarehouse } from '$lib/server/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import type { Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = requireAuth(locals.user);
	const role = currentUser.role as Role;

	const warehouseIds = await getUserWarehouseIds(currentUser.id, role);

	let warehouseList;
	if (warehouseIds === null) {
		warehouseList = await db
			.select()
			.from(warehouses)
			.where(eq(warehouses.isActive, true))
			.orderBy(warehouses.name);
	} else {
		if (warehouseIds.length === 0) {
			return { warehouses: [] };
		}
		warehouseList = await db
			.select()
			.from(warehouses)
			.where(and(eq(warehouses.isActive, true), inArray(warehouses.id, warehouseIds)))
			.orderBy(warehouses.name);
	}

	// Get stock counts per warehouse (filtered by accessible warehouses)
	const stockQuery = db
		.select({
			warehouseId: productWarehouse.warehouseId,
			productCount: sql<number>`COUNT(DISTINCT ${productWarehouse.productId})`,
			totalQuantity: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
			totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
		})
		.from(productWarehouse);

	const stockCounts =
		warehouseIds !== null
			? await stockQuery
					.where(inArray(productWarehouse.warehouseId, warehouseIds))
					.groupBy(productWarehouse.warehouseId)
			: await stockQuery.groupBy(productWarehouse.warehouseId);

	const stockMap = new Map(stockCounts.map((s) => [s.warehouseId, s]));

	const warehousesWithStats = warehouseList.map((w) => ({
		...w,
		productCount: stockMap.get(w.id)?.productCount ?? 0,
		totalQuantity: stockMap.get(w.id)?.totalQuantity ?? 0,
		totalValue: stockMap.get(w.id)?.totalValue ?? 0
	}));

	return { warehouses: warehousesWithStats };
};
