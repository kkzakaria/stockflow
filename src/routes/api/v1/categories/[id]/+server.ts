import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories, products } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { updateCategorySchema } from '$lib/validators/category';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	requireAuth(locals.user);

	const category = await db.query.categories.findFirst({
		where: eq(categories.id, params.id)
	});

	if (!category) error(404, 'Catégorie introuvable');

	return json({ data: category });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Accès non autorisé');

	const body = await request.json();
	const parsed = updateCategorySchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const existing = await db.query.categories.findFirst({
		where: eq(categories.id, params.id)
	});
	if (!existing) error(404, 'Catégorie introuvable');

	const [updated] = await db
		.update(categories)
		.set(parsed.data)
		.where(eq(categories.id, params.id))
		.returning();

	return json({ data: updated });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) error(403, 'Accès non autorisé');

	const existing = await db.query.categories.findFirst({
		where: eq(categories.id, params.id)
	});
	if (!existing) error(404, 'Catégorie introuvable');

	// Check no products use this category
	const productsUsingCategory = await db
		.select({ id: products.id })
		.from(products)
		.where(eq(products.categoryId, params.id))
		.limit(1);

	if (productsUsingCategory.length > 0) {
		error(409, { message: 'Impossible de supprimer : des produits utilisent cette catégorie' });
	}

	// Check no subcategories
	const subcategories = await db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.parentId, params.id))
		.limit(1);

	if (subcategories.length > 0) {
		error(409, { message: 'Impossible de supprimer : cette catégorie a des sous-catégories' });
	}

	await db.delete(categories).where(eq(categories.id, params.id));

	return json({ success: true });
};
