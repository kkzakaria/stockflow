import { json, error } from '@sveltejs/kit';
import { eq, and, or, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, products, transfers } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createTransferSchema } from '$lib/validators/transfer';
import { transferService } from '$lib/server/services/transfers';
import { auditService } from '$lib/server/services/audit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const status = url.searchParams.get('status');
	const warehouseId = url.searchParams.get('warehouseId');
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [];

	// Scope by accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	if (warehouseIds !== null) {
		if (warehouseIds.length === 0)
			return json({ data: [], pagination: { page, limit, total: 0 } });
		const warehouseInClause = sql.join(
			warehouseIds.map((id) => sql`${id}`),
			sql`, `
		);
		conditions.push(
			sql`(${transfers.sourceWarehouseId} IN (${warehouseInClause}) OR ${transfers.destinationWarehouseId} IN (${warehouseInClause}))`
		);
	}

	if (status) {
		conditions.push(
			eq(transfers.status, status as (typeof transfers.status.enumValues)[number])
		);
	}

	if (warehouseId) {
		conditions.push(
			or(
				eq(transfers.sourceWarehouseId, warehouseId),
				eq(transfers.destinationWarehouseId, warehouseId)
			)!
		);
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [transferList, [{ count: total }]] = await Promise.all([
		db.select().from(transfers).where(whereClause).limit(limit).offset(offset),
		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(transfers)
			.where(whereClause)
	]);

	return json({ data: transferList, pagination: { page, limit, total } });
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

	const parsed = createTransferSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify source warehouse access
	await requireWarehouseAccess(user.id, parsed.data.sourceWarehouseId, role);

	// Verify source warehouse exists and is active
	const sourceWarehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, parsed.data.sourceWarehouseId)
	});
	if (!sourceWarehouse || !sourceWarehouse.isActive) error(404, 'Entrep\u00f4t source introuvable');

	// Verify destination warehouse exists and is active
	const destWarehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, parsed.data.destinationWarehouseId)
	});
	if (!destWarehouse || !destWarehouse.isActive)
		error(404, 'Entrep\u00f4t destination introuvable');

	// Verify all products exist and are active
	for (const item of parsed.data.items) {
		const product = await db.query.products.findFirst({
			where: eq(products.id, item.productId)
		});
		if (!product || !product.isActive) error(404, `Produit ${item.productId} introuvable`);
	}

	try {
		const { transfer, warnings } = transferService.createWithWarnings({
			sourceWarehouseId: parsed.data.sourceWarehouseId,
			destinationWarehouseId: parsed.data.destinationWarehouseId,
			requestedBy: user.id,
			items: parsed.data.items,
			notes: parsed.data.notes
		});

		try {
			auditService.log({
				userId: user.id,
				action: 'transfer',
				entityType: 'transfer',
				entityId: transfer.id,
				newValues: {
					sourceWarehouseId: parsed.data.sourceWarehouseId,
					destinationWarehouseId: parsed.data.destinationWarehouseId,
					itemCount: parsed.data.items.length
				}
			});
		} catch (auditErr) {
			console.error('[audit] Failed to log transfer creation:', auditErr);
		}

		return json({ data: transfer, warnings }, { status: 201 });
	} catch (err) {
		if (err instanceof Error) {
			throw error(500, err.message);
		}
		throw error(500, 'Internal error');
	}
};
