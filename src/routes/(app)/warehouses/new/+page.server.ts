import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { warehouses } from '$lib/server/db/schema';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createWarehouseSchema } from '$lib/validators/warehouse';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user!.role as Role, 'admin');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: formData.get('name') as string,
			address: (formData.get('address') as string) || undefined,
			contactName: (formData.get('contactName') as string) || undefined,
			contactPhone: (formData.get('contactPhone') as string) || undefined,
			contactEmail: (formData.get('contactEmail') as string) || undefined
		};

		const parsed = createWarehouseSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				data,
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const [warehouse] = await db
			.insert(warehouses)
			.values({
				name: parsed.data.name,
				address: parsed.data.address,
				contactName: parsed.data.contactName,
				contactPhone: parsed.data.contactPhone,
				contactEmail: parsed.data.contactEmail || null
			})
			.returning();

		redirect(303, `/warehouses/${warehouse.id}`);
	}
};
