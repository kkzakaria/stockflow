import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { movements } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { type Role } from '$lib/server/auth/rbac';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const movement = await db.query.movements.findFirst({
		where: eq(movements.id, params.id),
		with: {
			product: true,
			warehouse: true,
			user: {
				columns: { id: true, name: true, email: true }
			}
		}
	});

	if (!movement) error(404, 'Mouvement introuvable');

	await requireWarehouseAccess(user.id, movement.warehouseId, role);

	return json({ data: movement });
};
