import { redirect, fail } from '@sveltejs/kit';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, categories } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createInventorySchema } from '$lib/validators/inventory';
import { inventoryService } from '$lib/server/services/inventory';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = requireAuth(locals.user);
	const role = currentUser.role as Role;
	if (!canManage(role)) redirect(303, '/inventory');

	// Get accessible warehouses
	const warehouseIds = await getUserWarehouseIds(currentUser.id, role);
	let warehouseList: (typeof warehouses.$inferSelect)[] = [];
	if (warehouseIds === null) {
		warehouseList = await db.select().from(warehouses).where(eq(warehouses.isActive, true));
	} else {
		if (warehouseIds.length === 0) {
			warehouseList = [];
		} else {
			warehouseList = await db
				.select()
				.from(warehouses)
				.where(and(eq(warehouses.isActive, true), inArray(warehouses.id, warehouseIds)));
		}
	}

	// Load categories for optional product filtering
	const categoryList = await db.select().from(categories);

	return {
		warehouses: warehouseList,
		categories: categoryList
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canManage(role))
			return fail(403, {
				data: {} as Record<string, string>,
				errors: { warehouseId: ['Acces non autorise'] }
			});

		const formData = await request.formData();

		const data = {
			warehouseId: (formData.get('warehouseId') as string) ?? '',
			productIds: undefined as string[] | undefined
		};

		// Parse optional category filter — not used directly in schema but
		// could filter products. For now we pass all products of the warehouse.

		const parsed = createInventorySchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, {
				data: {
					warehouseId: data.warehouseId
				},
				errors: parsed.error.flatten().fieldErrors
			});
		}

		try {
			const inventory = inventoryService.createSession({
				warehouseId: parsed.data.warehouseId,
				createdBy: currentUser.id,
				productIds: parsed.data.productIds
			});

			redirect(303, `/inventory/${inventory.id}`);
		} catch (err) {
			if (err instanceof Error && err.message === 'NO_STOCK_ENTRIES') {
				return fail(400, {
					data: {
						warehouseId: data.warehouseId
					},
					errors: { warehouseId: ['Aucun produit en stock dans cet entrepot'] }
				});
			}
			throw err;
		}
	}
};
