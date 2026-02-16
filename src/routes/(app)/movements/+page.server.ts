import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { movements, products, warehouses } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canWrite, type Role } from '$lib/server/auth/rbac';
import { MOVEMENT_TYPES } from '$lib/validators/movement';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const warehouseId = url.searchParams.get('warehouseId') ?? '';
	const type = url.searchParams.get('type') ?? '';
	const search = url.searchParams.get('search') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [];

	// Scope by accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	if (warehouseIds !== null) {
		if (warehouseIds.length === 0) {
			return {
				movements: [],
				warehouses: [],
				pagination: { page, limit, total: 0 },
				filters: { warehouseId, type, search },
				canCreate: false
			};
		}
		conditions.push(
			sql`${movements.warehouseId} IN (${sql.join(
				warehouseIds.map((id) => sql`${id}`),
				sql`, `
			)})`
		);
	}

	if (warehouseId) conditions.push(eq(movements.warehouseId, warehouseId));
	if (type && (MOVEMENT_TYPES as readonly string[]).includes(type))
		conditions.push(eq(movements.type, type as (typeof MOVEMENT_TYPES)[number]));
	if (search) {
		conditions.push(
			sql`(${products.sku} LIKE ${'%' + search + '%'} OR ${products.name} LIKE ${'%' + search + '%'})`
		);
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [movementList, [{ count: total }], warehouseList] = await Promise.all([
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
			.innerJoin(products, eq(movements.productId, products.id))
			.innerJoin(warehouses, eq(movements.warehouseId, warehouses.id))
			.where(whereClause),
		db
			.select()
			.from(warehouses)
			.where(eq(warehouses.isActive, true))
	]);

	return {
		movements: movementList,
		warehouses: warehouseList,
		pagination: { page, limit, total },
		filters: { warehouseId, type, search },
		canCreate: canWrite(role)
	};
};
