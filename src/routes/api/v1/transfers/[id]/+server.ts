import { json, error } from '@sveltejs/kit';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { type Role } from '$lib/server/auth/rbac';
import { transferService } from '$lib/server/services/transfers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const transfer = transferService.getById(params.id);
	if (!transfer) error(404, 'Transfert introuvable');

	// Must have access to source or destination warehouse
	let hasAccess = false;
	try {
		await requireWarehouseAccess(user.id, transfer.sourceWarehouseId, role);
		hasAccess = true;
	} catch {
		// No access to source, try destination
	}

	if (!hasAccess) {
		await requireWarehouseAccess(user.id, transfer.destinationWarehouseId, role);
	}

	return json({ data: transfer });
};
