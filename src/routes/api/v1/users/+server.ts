import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createUserSchema } from '$lib/validators/user';
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const roleFilter = url.searchParams.get('role');
	const activeFilter = url.searchParams.get('active');

	let query = db.select().from(user).$dynamic();

	if (roleFilter) {
		query = query.where(eq(user.role, roleFilter as Role));
	}

	if (activeFilter !== null && activeFilter !== undefined) {
		query = query.where(eq(user.isActive, activeFilter === 'true'));
	}

	const users = await query;

	// Strip sensitive fields
	const sanitized = users.map(({ ...u }) => ({
		id: u.id,
		name: u.name,
		email: u.email,
		role: u.role,
		isActive: u.isActive,
		createdAt: u.createdAt,
		updatedAt: u.updatedAt
	}));

	return json({ data: sanitized });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const body = await request.json();
	const parsed = createUserSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	// Use Better Auth to create the user (handles password hashing)
	const result = await auth.api.signUpEmail({
		body: {
			name: parsed.data.name,
			email: parsed.data.email,
			password: parsed.data.password
		}
	});

	if (!result?.user) {
		error(500, 'Erreur lors de la création du compte');
	}

	// Set the role (Better Auth creates with default)
	if (parsed.data.role && parsed.data.role !== 'viewer') {
		await db
			.update(user)
			.set({ role: parsed.data.role })
			.where(eq(user.id, result.user.id));
	}

	return json(
		{
			data: {
				id: result.user.id,
				name: result.user.name,
				email: result.user.email,
				role: parsed.data.role
			}
		},
		{ status: 201 }
	);
};
