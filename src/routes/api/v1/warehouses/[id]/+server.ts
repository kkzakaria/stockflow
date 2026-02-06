import { json, error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, productWarehouse } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateWarehouseSchema } from '$lib/validators/warehouse';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	await requireWarehouseAccess(user.id, params.id, role);

	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, params.id)
	});

	if (!warehouse) error(404, 'Entrepôt non trouvé');

	return json({ data: warehouse });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	requireRole(user.role as Role, 'admin');

	const body = await request.json();
	const parsed = updateWarehouseSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const [updated] = await db
		.update(warehouses)
		.set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
		.where(eq(warehouses.id, params.id))
		.returning();

	if (!updated) error(404, 'Entrepôt non trouvé');

	return json({ data: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	requireRole(user.role as Role, 'admin');

	// Check if warehouse has stock
	const stock = await db
		.select({ total: sql<number>`SUM(${productWarehouse.quantity})` })
		.from(productWarehouse)
		.where(eq(productWarehouse.warehouseId, params.id));

	if (stock[0]?.total && stock[0].total > 0) {
		error(409, "Impossible de désactiver un entrepôt avec du stock. Transférez d'abord le stock.");
	}

	const [deactivated] = await db
		.update(warehouses)
		.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
		.where(eq(warehouses.id, params.id))
		.returning();

	if (!deactivated) error(404, 'Entrepôt non trouvé');

	return json({ data: deactivated });
};
