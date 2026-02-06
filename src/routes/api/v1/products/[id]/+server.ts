import { json, error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, productWarehouse, warehouses } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { updateProductSchema } from '$lib/validators/product';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const product = await db.query.products.findFirst({
		where: eq(products.id, params.id),
		with: { category: true }
	});

	if (!product || !product.isActive) error(404, 'Produit introuvable');

	// Stock by warehouse (filtered by user scope)
	const warehouseIds = await getUserWarehouseIds(user.id, role);
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

	// Filter by accessible warehouses if not global scope
	const filteredStock =
		warehouseIds === null
			? warehouseStock
			: warehouseStock.filter((s) => warehouseIds.includes(s.warehouseId));

	const totalStock = filteredStock.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
	const totalValue = filteredStock.reduce((sum, s) => sum + (s.valuation ?? 0), 0);

	return json({
		data: {
			...product,
			warehouses: filteredStock,
			totalStock,
			stockValue: totalValue
		}
	});
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Acces non autorise');

	const body = await request.json();
	const parsed = updateProductSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const existing = await db.query.products.findFirst({
		where: eq(products.id, params.id)
	});
	if (!existing) error(404, 'Produit introuvable');

	const [updated] = await db
		.update(products)
		.set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
		.where(eq(products.id, params.id))
		.returning();

	return json({ data: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Acces non autorise');

	const existing = await db.query.products.findFirst({
		where: eq(products.id, params.id)
	});
	if (!existing) error(404, 'Produit introuvable');

	// Soft delete
	await db
		.update(products)
		.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
		.where(eq(products.id, params.id));

	return json({ success: true });
};
