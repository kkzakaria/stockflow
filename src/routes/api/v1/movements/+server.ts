import { json, error } from '@sveltejs/kit';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { movements, products, warehouses } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canWrite, type Role } from '$lib/server/auth/rbac';
import { createMovementSchema, MOVEMENT_TYPES } from '$lib/validators/movement';
import { stockService } from '$lib/server/services/stock';
import { alertService } from '$lib/server/services/alerts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const productId = url.searchParams.get('productId');
	const warehouseId = url.searchParams.get('warehouseId');
	const type = url.searchParams.get('type');
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	const conditions: SQL[] = [];

	// Scope by accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	if (warehouseIds !== null) {
		if (warehouseIds.length === 0) return json({ data: [], pagination: { page, limit, total: 0 } });
		conditions.push(
			sql`${movements.warehouseId} IN (${sql.join(
				warehouseIds.map((id) => sql`${id}`),
				sql`, `
			)})`
		);
	}

	if (productId) conditions.push(eq(movements.productId, productId));
	if (warehouseId) conditions.push(eq(movements.warehouseId, warehouseId));
	if (type && (MOVEMENT_TYPES as readonly string[]).includes(type))
		conditions.push(eq(movements.type, type as (typeof MOVEMENT_TYPES)[number]));

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [movementList, [{ count: total }]] = await Promise.all([
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
				userId: movements.userId,
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
			.where(whereClause)
	]);

	return json({ data: movementList, pagination: { page, limit, total } });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canWrite(role)) error(403, 'Accès non autorisé');

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Corps JSON invalide' });
	}
	const parsed = createMovementSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify warehouse access
	await requireWarehouseAccess(user.id, parsed.data.warehouseId, role);

	// Verify product exists and is active
	const product = await db.query.products.findFirst({
		where: eq(products.id, parsed.data.productId)
	});
	if (!product || !product.isActive) error(404, 'Produit introuvable');

	// Verify warehouse exists and is active
	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, parsed.data.warehouseId)
	});
	if (!warehouse || !warehouse.isActive) error(404, 'Entrepôt introuvable');

	try {
		const movement = await stockService.recordMovement({
			...parsed.data,
			userId: user.id
		});

		// Check if stock dropped below minimum and trigger alert
		const stockCheck = stockService.checkMinStock(parsed.data.productId, parsed.data.warehouseId);
		if (stockCheck && stockCheck.isBelowMin) {
			alertService.createStockAlert(
				parsed.data.productId,
				parsed.data.warehouseId,
				stockCheck.currentQty,
				stockCheck.threshold
			);
		}

		return json({ data: movement }, { status: 201 });
	} catch (err) {
		if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
			error(400, { message: 'Stock insuffisant' });
		}
		throw err;
	}
};
