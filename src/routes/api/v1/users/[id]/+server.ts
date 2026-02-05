import { json, error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateUserSchema } from '$lib/validators/user';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const found = await db.query.user.findFirst({
		where: eq(user.id, params.id),
		with: {
			warehouses: {
				with: {
					warehouse: true
				}
			}
		}
	});

	if (!found) error(404, 'Utilisateur non trouvé');

	return json({
		data: {
			id: found.id,
			name: found.name,
			email: found.email,
			role: found.role,
			isActive: found.isActive,
			createdAt: found.createdAt,
			updatedAt: found.updatedAt,
			warehouses: found.warehouses.map((uw) => uw.warehouse)
		}
	});
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const body = await request.json();
	const parsed = updateUserSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const [updated] = await db
		.update(user)
		.set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
		.where(eq(user.id, params.id))
		.returning();

	if (!updated) error(404, 'Utilisateur non trouvé');

	return json({
		data: {
			id: updated.id,
			name: updated.name,
			email: updated.email,
			role: updated.role,
			isActive: updated.isActive
		}
	});
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	if (params.id === currentUser.id) {
		error(400, 'Vous ne pouvez pas désactiver votre propre compte');
	}

	const [deactivated] = await db
		.update(user)
		.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
		.where(eq(user.id, params.id))
		.returning();

	if (!deactivated) error(404, 'Utilisateur non trouvé');

	return json({ data: { id: deactivated.id, isActive: false } });
};
