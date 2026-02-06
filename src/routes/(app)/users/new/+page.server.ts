import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, warehouses } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createUserSchema, ROLES } from '$lib/validators/user';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = requireAuth(locals.user);
	requireRole(currentUser.role as Role, 'admin');

	const warehouseList = await db
		.select({ id: warehouses.id, name: warehouses.name })
		.from(warehouses)
		.where(eq(warehouses.isActive, true));

	return {
		roles: ROLES,
		warehouses: warehouseList
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = requireAuth(locals.user);
		requireRole(currentUser.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: (formData.get('name') as string)?.trim(),
			email: (formData.get('email') as string)?.trim(),
			password: formData.get('password') as string,
			role: formData.get('role') as string
		};

		const parsed = createUserSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				data: { name: data.name, email: data.email, role: data.role },
				errors: parsed.error.flatten().fieldErrors
			});
		}

		// Check if email already exists
		const existing = await db.query.user.findFirst({
			where: eq(user.email, parsed.data.email)
		});

		if (existing) {
			return fail(400, {
				data: { name: data.name, email: data.email, role: data.role },
				errors: { email: ['Cet email est deja utilise'] } as Record<string, string[]>
			});
		}

		try {
			const result = await auth.api.signUpEmail({
				body: {
					name: parsed.data.name,
					email: parsed.data.email,
					password: parsed.data.password
				}
			});

			if (!result?.user) {
				return fail(500, {
					data: { name: data.name, email: data.email, role: data.role },
					errors: { email: ['Erreur lors de la creation du compte'] } as Record<string, string[]>
				});
			}

			// Set the role
			if (parsed.data.role !== 'viewer') {
				await db.update(user).set({ role: parsed.data.role }).where(eq(user.id, result.user.id));
			}

			redirect(303, `/users/${result.user.id}`);
		} catch (e) {
			// Re-throw redirect
			if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 303) {
				throw e;
			}
			return fail(500, {
				data: { name: data.name, email: data.email, role: data.role },
				errors: { email: ['Erreur lors de la creation du compte'] } as Record<string, string[]>
			});
		}
	}
};
