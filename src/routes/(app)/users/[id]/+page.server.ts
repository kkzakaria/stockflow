import { error, redirect, fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, userWarehouses, warehouses } from '$lib/server/db/schema';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateUserSchema, ROLES, assignWarehousesSchema } from '$lib/validators/user';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireRole(locals.user!.role as Role, 'admin');

	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, params.id),
		with: {
			warehouses: {
				with: {
					warehouse: true
				}
			}
		}
	});

	if (!targetUser) {
		error(404, 'Utilisateur non trouve');
	}

	const allWarehouses = await db
		.select({ id: warehouses.id, name: warehouses.name })
		.from(warehouses)
		.where(eq(warehouses.isActive, true));

	return {
		targetUser: {
			id: targetUser.id,
			name: targetUser.name,
			email: targetUser.email,
			role: targetUser.role,
			isActive: targetUser.isActive,
			createdAt: targetUser.createdAt,
			warehouses: targetUser.warehouses.map((uw) => uw.warehouse)
		},
		allWarehouses,
		roles: ROLES,
		isCurrentUser: locals.user!.id === params.id
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: (formData.get('name') as string) || undefined,
			role: (formData.get('role') as string) || undefined,
			isActive: formData.get('isActive') === 'true'
		};

		const parsed = updateUserSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				action: 'update' as const,
				errors: parsed.error.flatten().fieldErrors
			});
		}

		await db
			.update(user)
			.set({
				...parsed.data,
				updatedAt: sql`(datetime('now'))`
			})
			.where(eq(user.id, params.id));

		return { success: true, action: 'update' as const };
	},

	assignWarehouses: async ({ params, request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const warehouseIds = formData.getAll('warehouseIds') as string[];

		const parsed = assignWarehousesSchema.safeParse({ warehouseIds });

		if (!parsed.success) {
			return fail(400, {
				action: 'assignWarehouses' as const,
				errors: parsed.error.flatten().fieldErrors
			});
		}

		// Replace all assignments
		await db.delete(userWarehouses).where(eq(userWarehouses.userId, params.id));

		if (parsed.data.warehouseIds.length > 0) {
			await db.insert(userWarehouses).values(
				parsed.data.warehouseIds.map((warehouseId) => ({
					userId: params.id,
					warehouseId
				}))
			);
		}

		return { success: true, action: 'assignWarehouses' as const };
	},

	deactivate: async ({ params, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		if (locals.user!.id === params.id) {
			return fail(400, {
				action: 'deactivate' as const,
				error: 'Vous ne pouvez pas desactiver votre propre compte'
			});
		}

		await db
			.update(user)
			.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
			.where(eq(user.id, params.id));

		redirect(303, '/users');
	}
};
