import { eq, and, or, desc, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { transfers, transferItems, warehouses } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

const VALID_STATUSES = [
	'pending',
	'approved',
	'rejected',
	'shipped',
	'received',
	'partially_received',
	'cancelled',
	'disputed',
	'resolved'
] as const;

type TransferStatus = (typeof VALID_STATUSES)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const statusParam = url.searchParams.get('status') ?? '';
	const status = (VALID_STATUSES as readonly string[]).includes(statusParam)
		? (statusParam as TransferStatus)
		: undefined;
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;

	// Get user's accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);

	// If scoped user has no warehouses, return empty
	if (warehouseIds !== null && warehouseIds.length === 0) {
		return {
			transfers: [],
			pagination: { page, limit, total: 0 },
			status: statusParam,
			warehouses: [],
			canCreate: false
		};
	}

	const conditions: SQL[] = [];

	// Scope transfers to user's warehouses (source OR destination)
	if (warehouseIds !== null && warehouseIds.length > 0) {
		const warehouseInClause = sql.join(
			warehouseIds.map((id) => sql`${id}`),
			sql`, `
		);
		conditions.push(
			or(
				sql`${transfers.sourceWarehouseId} IN (${warehouseInClause})`,
				sql`${transfers.destinationWarehouseId} IN (${warehouseInClause})`
			)!
		);
	}

	if (status) {
		conditions.push(
			eq(transfers.status, status as (typeof transfers.status.enumValues)[number])
		);
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [transferList, [{ count: total }], warehouseList] = await Promise.all([
		db
			.select()
			.from(transfers)
			.where(whereClause)
			.orderBy(desc(transfers.requestedAt))
			.limit(limit)
			.offset(offset),
		db.select({ count: sql<number>`COUNT(*)` }).from(transfers).where(whereClause),
		db.select().from(warehouses).where(eq(warehouses.isActive, true))
	]);

	// Enrich transfers with warehouse names and item counts
	const warehouseMap = new Map(warehouseList.map((w) => [w.id, w.name]));

	// Get item counts for all transfers in a single query
	const transferIds = transferList.map((t) => t.id);
	let itemCountMap = new Map<string, number>();
	if (transferIds.length > 0) {
		const itemCounts = await db
			.select({
				transferId: transferItems.transferId,
				count: sql<number>`COUNT(*)`
			})
			.from(transferItems)
			.where(
				sql`${transferItems.transferId} IN (${sql.join(
					transferIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			)
			.groupBy(transferItems.transferId);

		for (const row of itemCounts) {
			itemCountMap.set(row.transferId, row.count);
		}
	}

	const enrichedTransfers = transferList.map((t) => ({
		...t,
		sourceWarehouseName: warehouseMap.get(t.sourceWarehouseId) ?? 'Inconnu',
		destinationWarehouseName: warehouseMap.get(t.destinationWarehouseId) ?? 'Inconnu',
		itemCount: itemCountMap.get(t.id) ?? 0
	}));

	return {
		transfers: enrichedTransfers,
		pagination: { page, limit, total },
		status: statusParam,
		warehouses: warehouseList,
		canCreate: canManage(role)
	};
};
