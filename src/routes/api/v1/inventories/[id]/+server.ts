import { json, error } from '@sveltejs/kit';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { type Role } from '$lib/server/auth/rbac';
import { inventoryService } from '$lib/server/services/inventory';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const inventory = inventoryService.getById(params.id);
	if (!inventory) error(404, 'Inventaire introuvable');

	// Verify warehouse access
	await requireWarehouseAccess(user.id, inventory.warehouseId, role);

	return json({ data: inventory });
};
