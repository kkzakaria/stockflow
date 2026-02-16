import { json, error } from '@sveltejs/kit';
import { eq, and, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, inventories } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createInventorySchema } from '$lib/validators/inventory';
import { inventoryService } from '$lib/server/services/inventory';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const warehouseId = url.searchParams.get('warehouseId');
	const status = url.searchParams.get('status');
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [];

	// Scope by accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	if (warehouseIds !== null) {
		if (warehouseIds.length === 0)
			return json({ data: [], pagination: { page, limit, total: 0 } });
		conditions.push(
			sql`${inventories.warehouseId} IN (${sql.join(
				warehouseIds.map((id) => sql`${id}`),
				sql`, `
			)})`
		);
	}

	if (warehouseId) {
		conditions.push(eq(inventories.warehouseId, warehouseId));
	}

	if (status) {
		conditions.push(
			eq(inventories.status, status as (typeof inventories.status.enumValues)[number])
		);
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [inventoryList, [{ count: total }]] = await Promise.all([
		db.select().from(inventories).where(whereClause).limit(limit).offset(offset),
		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(inventories)
			.where(whereClause)
	]);

	return json({ data: inventoryList, pagination: { page, limit, total } });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canManage(role)) error(403, 'Acc\u00e8s non autoris\u00e9');

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Corps JSON invalide' });
	}

	const parsed = createInventorySchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify warehouse access
	await requireWarehouseAccess(user.id, parsed.data.warehouseId, role);

	// Verify warehouse exists and is active
	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, parsed.data.warehouseId)
	});
	if (!warehouse || !warehouse.isActive) error(404, 'Entrep\u00f4t introuvable');

	try {
		const inventory = inventoryService.createSession({
			warehouseId: parsed.data.warehouseId,
			createdBy: user.id,
			productIds: parsed.data.productIds
		});

		return json({ data: inventory }, { status: 201 });
	} catch (err) {
		if (err instanceof Error) {
			throw error(500, err.message);
		}
		throw error(500, 'Internal error');
	}
};
