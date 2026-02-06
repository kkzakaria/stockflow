import { desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	const [users, [{ count: total }]] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				isActive: user.isActive,
				createdAt: user.createdAt
			})
			.from(user)
			.orderBy(desc(user.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ count: sql<number>`COUNT(*)` }).from(user)
	]);

	return { users, pagination: { page, limit, total } };
};
