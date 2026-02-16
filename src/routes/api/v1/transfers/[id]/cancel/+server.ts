import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { transferService } from '$lib/server/services/transfers';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canManage(role)) error(403, 'Acc\u00e8s non autoris\u00e9');

	try {
		const result = transferService.cancel(params.id, user.id);
		return json({ data: result });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : '';
		if (msg === 'TRANSFER_NOT_FOUND') throw error(404, 'Transfer not found');
		if (msg === 'INVALID_TRANSITION') throw error(409, 'Invalid status transition');
		console.error(`[transfers/${params.id}/cancel]`, e);
		throw error(500, 'Internal error');
	}
};
