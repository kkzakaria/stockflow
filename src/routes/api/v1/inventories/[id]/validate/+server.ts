import { json, error } from '@sveltejs/kit';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { inventoryService } from '$lib/server/services/inventory';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canManage(role)) error(403, 'Acc\u00e8s non autoris\u00e9');

	// Fetch inventory to check warehouse access
	const inventory = inventoryService.getById(params.id);
	if (!inventory) error(404, 'Inventaire introuvable');

	await requireWarehouseAccess(user.id, inventory.warehouseId, role);

	try {
		const validated = inventoryService.validate(params.id, user.id);

		return json({ data: validated });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : '';
		if (msg === 'INVENTORY_NOT_FOUND') throw error(404, 'Inventory not found');
		if (msg === 'INVENTORY_ALREADY_VALIDATED') throw error(409, 'Inventory already validated');
		if (msg === 'INCOMPLETE_COUNT')
			throw error(400, 'All items must be counted before validation');
		console.error(`[inventories/${params.id}/validate]`, e);
		throw error(500, 'Internal error');
	}
};
