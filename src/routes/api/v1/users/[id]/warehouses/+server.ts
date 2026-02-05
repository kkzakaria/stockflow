import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, userWarehouses } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { assignWarehousesSchema } from '$lib/validators/user';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const body = await request.json();
	const parsed = assignWarehousesSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Verify user exists
	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, params.id)
	});
	if (!targetUser) error(404, 'Utilisateur non trouvé');

	// Replace all warehouse assignments
	await db.delete(userWarehouses).where(eq(userWarehouses.userId, params.id));

	if (parsed.data.warehouseIds.length > 0) {
		await db.insert(userWarehouses).values(
			parsed.data.warehouseIds.map((warehouseId) => ({
				userId: params.id,
				warehouseId
			}))
		);
	}

	// Return updated assignments
	const assignments = await db.query.userWarehouses.findMany({
		where: eq(userWarehouses.userId, params.id),
		with: { warehouse: true }
	});

	return json({
		data: assignments.map((a) => a.warehouse)
	});
};
