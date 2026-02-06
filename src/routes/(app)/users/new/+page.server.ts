import { redirect, fail, isRedirect } from '@sveltejs/kit';
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

		let createdUserId: string | undefined;

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

			createdUserId = result.user.id;

			// Set the role immediately after creation
			if (parsed.data.role !== 'viewer') {
				await db.update(user).set({ role: parsed.data.role }).where(eq(user.id, createdUserId));
			}

			redirect(303, `/users/${createdUserId}`);
		} catch (e) {
			if (isRedirect(e)) throw e;

			// Cleanup: deactivate partially-created user if role update failed
			if (createdUserId) {
				await db.update(user).set({ isActive: false }).where(eq(user.id, createdUserId));
			}

			return fail(500, {
				data: { name: data.name, email: data.email, role: data.role },
				errors: { email: ['Erreur lors de la creation du compte'] } as Record<string, string[]>
			});
		}
	}
};
