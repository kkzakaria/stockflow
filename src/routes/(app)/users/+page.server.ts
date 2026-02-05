import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user!.role as Role, 'admin');

	const users = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			createdAt: user.createdAt
		})
		.from(user);

	return { users };
};
