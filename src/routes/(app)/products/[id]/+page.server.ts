import { error } from '@sveltejs/kit';
import { eq, and, desc, sql, inArray, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, productWarehouse, warehouses, movements } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
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

	// Recent movements (scoped by warehouse access)
	const movementConditions: SQL[] = [eq(movements.productId, params.id)];
	if (warehouseIds !== null && warehouseIds.length > 0) {
		movementConditions.push(inArray(movements.warehouseId, warehouseIds));
	} else if (warehouseIds !== null) {
		// Scoped user with no warehouses — no movements to show
		movementConditions.push(sql`0 = 1`);
	}

	const recentMovements = await db.query.movements.findMany({
		where: and(...movementConditions),
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
