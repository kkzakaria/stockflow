import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards';
import { canWrite, type Role } from '$lib/server/auth/rbac';
import { countItemSchema } from '$lib/validators/inventory';
import { inventoryService } from '$lib/server/services/inventory';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canWrite(role)) error(403, 'Acc\u00e8s non autoris\u00e9');

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Corps JSON invalide' });
	}

	const parsed = countItemSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	try {
		const item = inventoryService.recordCount(params.itemId, {
			countedQuantity: parsed.data.countedQuantity,
			countedBy: user.id
		});

		return json({ data: item });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : '';
		if (msg === 'INVENTORY_ITEM_NOT_FOUND') throw error(404, 'Inventory item not found');
		throw error(500, 'Internal error');
	}
};
