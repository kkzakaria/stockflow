import { redirect, fail, error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, categories } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { updateProductSchema } from '$lib/validators/product';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) redirect(303, '/products');

	const product = await db.query.products.findFirst({
		where: eq(products.id, params.id)
	});
	if (!product || !product.isActive) error(404, 'Produit introuvable');

	const allCategories = await db.select().from(categories);
	return { product, categories: allCategories };
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		const user = requireAuth(locals.user);
		if (!canManage(user.role as Role))
			return fail(403, {
				data: {} as Record<string, unknown>,
				errors: { name: ['Accès non autorisé'] }
			});

		const formData = await request.formData();
		const data = {
			name: (formData.get('name') as string)?.trim(),
			description: (formData.get('description') as string) || undefined,
			categoryId: (formData.get('categoryId') as string) || null,
			unit: (formData.get('unit') as string) || 'unite',
			purchasePrice: Number(formData.get('purchasePrice')) || 0,
			salePrice: Number(formData.get('salePrice')) || 0,
			minStock: Number(formData.get('minStock')) || 0
		};

		const parsed = updateProductSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { data, errors: parsed.error.flatten().fieldErrors });
		}

		const existing = await db.query.products.findFirst({
			where: eq(products.id, params.id)
		});
		if (!existing)
			return fail(404, {
				data: {} as Record<string, unknown>,
				errors: { name: ['Produit introuvable'] }
			});

		await db
			.update(products)
			.set({ ...parsed.data, updatedAt: sql`(datetime('now'))` })
			.where(eq(products.id, params.id));

		redirect(303, `/products/${params.id}`);
	}
};
