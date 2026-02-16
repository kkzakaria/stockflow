import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { inventories, inventoryItems, warehouses, user } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

const VALID_STATUSES = ['in_progress', 'validated'] as const;
type InventoryStatus = (typeof VALID_STATUSES)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
	const currentUser = requireAuth(locals.user);
	const role = currentUser.role as Role;

	const statusParam = url.searchParams.get('status') ?? '';
	const status = (VALID_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as InventoryStatus)
		: undefined;
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;

	// Get user's accessible warehouses
	const warehouseIds = await getUserWarehouseIds(currentUser.id, role);

	// If scoped user has no warehouses, return empty
	if (warehouseIds !== null && warehouseIds.length === 0) {
		return {
			inventories: [],
			pagination: { page, limit, total: 0 },
			status: statusParam,
			warehouses: [],
			canCreate: false
		};
	}

	const conditions = [];

	// Scope inventories to user's warehouses
	if (warehouseIds !== null && warehouseIds.length > 0) {
		const warehouseInClause = sql.join(
			warehouseIds.map((id) => sql`${id}`),
			sql`, `
		);
		conditions.push(sql`${inventories.warehouseId} IN (${warehouseInClause})`);
	}

	if (status) {
		conditions.push(
			eq(inventories.status, status as (typeof inventories.status.enumValues)[number])
		);
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [inventoryList, [{ count: total }], warehouseList] = await Promise.all([
		db
			.select()
			.from(inventories)
			.where(whereClause)
			.orderBy(desc(inventories.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ count: sql<number>`COUNT(*)` }).from(inventories).where(whereClause),
		db.select().from(warehouses).where(eq(warehouses.isActive, true))
	]);

	// Enrich inventories with warehouse names and count progress
	const warehouseMap = new Map(warehouseList.map((w) => [w.id, w.name]));

	// Get item count progress for all inventories in a single query
	const inventoryIds = inventoryList.map((inv) => inv.id);
	let progressMap = new Map<string, { total: number; counted: number }>();
	if (inventoryIds.length > 0) {
		const progress = await db
			.select({
				inventoryId: inventoryItems.inventoryId,
				total: sql<number>`COUNT(*)`,
				counted: sql<number>`SUM(CASE WHEN ${inventoryItems.countedQuantity} IS NOT NULL THEN 1 ELSE 0 END)`
			})
			.from(inventoryItems)
			.where(
				sql`${inventoryItems.inventoryId} IN (${sql.join(
					inventoryIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			)
			.groupBy(inventoryItems.inventoryId);

		for (const row of progress) {
			progressMap.set(row.inventoryId, { total: row.total, counted: row.counted });
		}
	}

	// Get creator names
	const creatorIds = [...new Set(inventoryList.map((inv) => inv.createdBy))];
	let creatorMap = new Map<string, string>();
	if (creatorIds.length > 0) {
		const creators = await db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(
				sql`${user.id} IN (${sql.join(
					creatorIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			);
		for (const creator of creators) {
			creatorMap.set(creator.id, creator.name);
		}
	}

	const enrichedInventories = inventoryList.map((inv) => ({
		...inv,
		warehouseName: warehouseMap.get(inv.warehouseId) ?? 'Inconnu',
		createdByName: creatorMap.get(inv.createdBy) ?? 'Inconnu',
		progress: progressMap.get(inv.id) ?? { total: 0, counted: 0 }
	}));

	return {
		inventories: enrichedInventories,
		pagination: { page, limit, total },
		status: statusParam,
		warehouses: warehouseList,
		canCreate: canManage(role)
	};
};
