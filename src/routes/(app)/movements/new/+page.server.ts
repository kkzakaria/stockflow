import { redirect, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, warehouses } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canWrite, type Role } from '$lib/server/auth/rbac';
import { createMovementSchema } from '$lib/validators/movement';
import { stockService } from '$lib/server/services/stock';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canWrite(role)) redirect(303, '/movements');

	// Pre-selection from URL params
	const productId = url.searchParams.get('productId') ?? '';
	const warehouseId = url.searchParams.get('warehouseId') ?? '';

	// Get accessible warehouses
	const warehouseIds = await getUserWarehouseIds(user.id, role);
	let warehouseList: (typeof warehouses.$inferSelect)[] = [];
	if (warehouseIds === null) {
		warehouseList = await db.select().from(warehouses).where(eq(warehouses.isActive, true));
	} else {
		if (warehouseIds.length === 0) {
			warehouseList = [];
		} else {
			warehouseList = await db.query.warehouses.findMany({
				where: and(eq(warehouses.isActive, true))
			});
			warehouseList = warehouseList.filter((w) => warehouseIds.includes(w.id));
		}
	}

	// Get all active products
	const productList = await db
		.select({ id: products.id, sku: products.sku, name: products.name })
		.from(products)
		.where(eq(products.isActive, true));

	// If productId provided, get the product for display
	let selectedProduct = null;
	if (productId) {
		selectedProduct = await db.query.products.findFirst({
			where: eq(products.id, productId)
		});
	}

	return {
		warehouses: warehouseList,
		products: productList,
		selectedProduct,
		preselected: { productId, warehouseId }
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		const role = user.role as Role;
		if (!canWrite(role))
			return fail(403, {
				data: {} as Record<string, string>,
				errors: { productId: ['Acces non autorise'] }
			});

		const formData = await request.formData();
		const data = {
			productId: formData.get('productId') as string,
			warehouseId: formData.get('warehouseId') as string,
			type: formData.get('type') as string,
			quantity: Number(formData.get('quantity')) || 0,
			reason: (formData.get('reason') as string)?.trim() ?? '',
			reference: (formData.get('reference') as string)?.trim() || undefined,
			purchasePrice: formData.get('purchasePrice')
				? Number(formData.get('purchasePrice'))
				: undefined
		};

		const parsed = createMovementSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { data, errors: parsed.error.flatten().fieldErrors });
		}

		// Verify warehouse access
		await requireWarehouseAccess(user.id, parsed.data.warehouseId, role);

		// Verify product exists and is active
		const product = await db.query.products.findFirst({
			where: eq(products.id, parsed.data.productId)
		});
		if (!product || !product.isActive) {
			return fail(400, { data, errors: { productId: ['Produit introuvable'] } });
		}

		try {
			await stockService.recordMovement({
				...parsed.data,
				userId: user.id
			});
		} catch (err) {
			if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
				return fail(400, {
					data,
					errors: { quantity: ['Stock insuffisant pour cette sortie'] }
				});
			}
			throw err;
		}

		redirect(303, '/movements');
	}
};
