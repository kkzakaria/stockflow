import { error, fail, redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, products, user } from '$lib/server/db/schema';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canManage, canWrite, type Role } from '$lib/server/auth/rbac';
import { countItemSchema } from '$lib/validators/inventory';
import { inventoryService } from '$lib/server/services/inventory';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = requireAuth(locals.user);
	const role = currentUser.role as Role;

	const inventory = inventoryService.getById(params.id);
	if (!inventory) {
		error(404, 'Session d\'inventaire introuvable');
	}

	// Check warehouse access
	await requireWarehouseAccess(currentUser.id, inventory.warehouseId, role);

	// Get warehouse name, product info, and user names
	const [warehouseList, productList, userList] = await Promise.all([
		db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses),
		db
			.select({ id: products.id, name: products.name, sku: products.sku })
			.from(products),
		db.select({ id: user.id, name: user.name }).from(user)
	]);

	const warehouseMap = new Map(warehouseList.map((w) => [w.id, w.name]));
	const productMap = new Map(productList.map((p) => [p.id, { name: p.name, sku: p.sku }]));
	const userMap = new Map(userList.map((u) => [u.id, u.name]));

	// Enrich items with product info
	const enrichedItems = inventory.items.map((item) => ({
		...item,
		productName: productMap.get(item.productId)?.name ?? 'Inconnu',
		productSku: productMap.get(item.productId)?.sku ?? '---'
	}));

	// All items counted?
	const allCounted = enrichedItems.every((item) => item.countedQuantity !== null);

	return {
		inventory: {
			...inventory,
			warehouseName: warehouseMap.get(inventory.warehouseId) ?? 'Inconnu',
			createdByName: userMap.get(inventory.createdBy) ?? 'Inconnu',
			validatedByName: inventory.validatedBy
				? (userMap.get(inventory.validatedBy) ?? 'Inconnu')
				: null
		},
		items: enrichedItems,
		canCount: canWrite(role) && inventory.status === 'in_progress',
		canValidate: canManage(role) && inventory.status === 'in_progress' && allCounted
	};
};

export const actions: Actions = {
	count: async ({ params, locals, request }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canWrite(role)) return fail(403, { error: 'Acces non autorise' });

		const inventory = inventoryService.getById(params.id);
		if (!inventory) return fail(404, { error: 'Session introuvable' });
		if (inventory.status !== 'in_progress')
			return fail(400, { error: 'Cette session est deja validee' });

		await requireWarehouseAccess(currentUser.id, inventory.warehouseId, role);

		const formData = await request.formData();

		// Parse items from form data
		let i = 0;
		const errors: string[] = [];
		let countedCount = 0;

		while (formData.has(`items[${i}].id`)) {
			const itemId = formData.get(`items[${i}].id`) as string;
			const countedQtyStr = (formData.get(`items[${i}].countedQuantity`) as string) ?? '';
			i++;

			// Skip items without a counted quantity (user left the field empty)
			if (countedQtyStr.trim() === '') continue;

			const countedQuantity = Number(countedQtyStr);
			const parsed = countItemSchema.safeParse({ countedQuantity });

			if (!parsed.success) {
				const fieldErrors = parsed.error.flatten().fieldErrors;
				errors.push(
					`Article ${itemId}: ${fieldErrors.countedQuantity?.[0] ?? 'Quantite invalide'}`
				);
				continue;
			}

			try {
				inventoryService.recordCount(itemId, {
					countedQuantity: parsed.data.countedQuantity,
					countedBy: currentUser.id
				});
				countedCount++;
			} catch (err) {
				if (err instanceof Error && err.message === 'INVENTORY_ITEM_NOT_FOUND') {
					errors.push(`Article ${itemId}: Article introuvable`);
				} else {
					throw err;
				}
			}
		}

		if (errors.length > 0) {
			return fail(400, { error: errors.join('. ') });
		}

		if (countedCount === 0) {
			return fail(400, { error: 'Aucune quantite saisie' });
		}

		// Redirect to refresh data
		redirect(303, `/inventory/${params.id}`);
	},

	validate: async ({ params, locals }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canManage(role)) return fail(403, { error: 'Acces non autorise' });

		const inventory = inventoryService.getById(params.id);
		if (!inventory) return fail(404, { error: 'Session introuvable' });

		await requireWarehouseAccess(currentUser.id, inventory.warehouseId, role);

		try {
			inventoryService.validate(params.id, currentUser.id);
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === 'INVENTORY_NOT_FOUND')
					return fail(404, { error: 'Session introuvable' });
				if (err.message === 'INVENTORY_ALREADY_VALIDATED')
					return fail(400, { error: 'Cette session est deja validee' });
				if (err.message === 'INCOMPLETE_COUNT')
					return fail(400, {
						error: 'Tous les articles doivent etre comptes avant la validation'
					});
			}
			throw err;
		}

		redirect(303, `/inventory/${params.id}`);
	}
};
