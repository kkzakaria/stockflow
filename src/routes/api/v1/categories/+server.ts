import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { createCategorySchema } from '$lib/validators/category';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals.user);

	const allCategories = await db.select().from(categories);

	return json({ data: allCategories });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	if (!canManage(user.role as Role)) {
		error(403, 'Accès non autorisé');
	}

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Corps JSON invalide' });
	}
	const parsed = createCategorySchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	if (parsed.data.parentId) {
		const parent = await db.query.categories.findFirst({
			where: eq(categories.id, parsed.data.parentId)
		});
		if (!parent) error(400, { message: 'Catégorie parente introuvable' });
	}

	const [category] = await db
		.insert(categories)
		.values({
			name: parsed.data.name,
			parentId: parsed.data.parentId ?? null
		})
		.returning();

	return json({ data: category }, { status: 201 });
};
