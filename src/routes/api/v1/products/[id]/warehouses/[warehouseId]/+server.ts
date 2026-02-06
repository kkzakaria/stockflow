import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { productWarehouse, products, warehouses } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { updateProductWarehouseSchema } from '$lib/validators/product';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canManage(role)) error(403, 'Accès non autorisé');
	await requireWarehouseAccess(user.id, params.warehouseId, role);

	const body = await request.json();
	const parsed = updateProductWarehouseSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify product and warehouse exist
	const product = await db.query.products.findFirst({ where: eq(products.id, params.id) });
	if (!product) error(404, 'Produit introuvable');

	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, params.warehouseId)
	});
	if (!warehouse) error(404, 'Entrepôt introuvable');

	// Upsert product_warehouse row
	await db
		.insert(productWarehouse)
		.values({
			productId: params.id,
			warehouseId: params.warehouseId,
			minStock: parsed.data.minStock,
			quantity: 0,
			pump: 0
		})
		.onConflictDoUpdate({
			target: [productWarehouse.productId, productWarehouse.warehouseId],
			set: { minStock: parsed.data.minStock }
		});

	return json({ success: true });
};
