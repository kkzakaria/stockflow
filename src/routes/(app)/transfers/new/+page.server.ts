import { redirect, fail } from '@sveltejs/kit';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, warehouses, productWarehouse } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createTransferSchema } from '$lib/validators/transfer';
import { transferService } from '$lib/server/services/transfers';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canManage(role)) redirect(303, '/transfers');

	// Get accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
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

	// Get all active products with stock per warehouse
	const productList = await db
		.select({ id: products.id, sku: products.sku, name: products.name })
		.from(products)
		.where(eq(products.isActive, true));

	// Get stock for all products across all warehouses
	const stockData = await db
		.select({
			productId: productWarehouse.productId,
			warehouseId: productWarehouse.warehouseId,
			quantity: productWarehouse.quantity
		})
		.from(productWarehouse);

	// Build stock map: productId -> warehouseId -> quantity
	const stockMap: Record<string, Record<string, number>> = {};
	for (const row of stockData) {
		if (!stockMap[row.productId]) stockMap[row.productId] = {};
		stockMap[row.productId][row.warehouseId] = row.quantity ?? 0;
	}

	return {
		warehouses: warehouseList,
		products: productList,
		stockMap
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const role = user.role as Role;
		if (!canManage(role))
			return fail(403, {
				data: {} as Record<string, string>,
				errors: { sourceWarehouseId: ["Acces non autorise"] }
			});

		const formData = await request.formData();

		// Parse items from form data
		const itemEntries: { productId: string; quantityRequested: number }[] = [];
		let i = 0;
		while (formData.has(`items[${i}].productId`)) {
			const productId = formData.get(`items[${i}].productId`) as string;
			const qty = Number(formData.get(`items[${i}].quantityRequested`)) || 0;
			if (productId) {
				itemEntries.push({ productId, quantityRequested: qty });
			}
			i++;
		}

		const data = {
			sourceWarehouseId: (formData.get('sourceWarehouseId') as string) ?? '',
			destinationWarehouseId: (formData.get('destinationWarehouseId') as string) ?? '',
			items: itemEntries,
			notes: ((formData.get('notes') as string) ?? '').trim() || undefined
		};

		const parsed = createTransferSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, {
				data: {
					sourceWarehouseId: data.sourceWarehouseId,
					destinationWarehouseId: data.destinationWarehouseId,
					notes: data.notes ?? ''
				},
				items: data.items,
				errors: parsed.error.flatten().fieldErrors
			});
		}

		try {
			const transfer = transferService.create({
				...parsed.data,
				requestedBy: user.id
			});

			redirect(303, `/transfers/${transfer.id}`);
		} catch (err) {
			if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
				return fail(400, {
					data: {
						sourceWarehouseId: data.sourceWarehouseId,
						destinationWarehouseId: data.destinationWarehouseId,
						notes: data.notes ?? ''
					},
					items: data.items,
					errors: { items: ['Stock insuffisant pour ce transfert'] }
				});
			}
			throw err;
		}
	}
};
