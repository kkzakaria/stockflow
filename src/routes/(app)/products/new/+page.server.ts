import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, categories } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createProductSchema } from '$lib/validators/product';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) redirect(303, '/products');

	const allCategories = await db.select().from(categories);
	return { categories: allCategories };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals.user);
		if (!canManage(user.role as Role)) return fail(403, { error: 'Acces non autorise' });

		const formData = await request.formData();
		const data = {
			sku: (formData.get('sku') as string)?.trim(),
			name: (formData.get('name') as string)?.trim(),
			description: (formData.get('description') as string) || undefined,
			categoryId: (formData.get('categoryId') as string) || null,
			unit: (formData.get('unit') as string) || 'unite',
			purchasePrice: Number(formData.get('purchasePrice')) || 0,
			salePrice: Number(formData.get('salePrice')) || 0,
			minStock: Number(formData.get('minStock')) || 0
		};

		const parsed = createProductSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { data, errors: parsed.error.flatten().fieldErrors });
		}

		// Check SKU uniqueness
		const existing = await db.query.products.findFirst({
			where: eq(products.sku, parsed.data.sku)
		});
		if (existing) {
			return fail(409, { data, errors: { sku: ['Ce SKU existe deja'] } });
		}

		const [product] = await db
			.insert(products)
			.values({
				sku: parsed.data.sku,
				name: parsed.data.name,
				description: parsed.data.description,
				categoryId: parsed.data.categoryId ?? null,
				unit: parsed.data.unit,
				purchasePrice: parsed.data.purchasePrice,
				salePrice: parsed.data.salePrice,
				minStock: parsed.data.minStock
			})
			.returning();

		redirect(303, `/products/${product.id}`);
	}
};
