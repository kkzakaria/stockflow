import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards';
import { canApprove, type Role } from '$lib/server/auth/rbac';
import { transferService } from '$lib/server/services/transfers';
import { auditService } from '$lib/server/services/audit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canApprove(role)) error(403, 'Acc\u00e8s non autoris\u00e9');

	const transfer = transferService.getById(params.id);
	if (!transfer) error(404, 'Transfer not found');

	try {
		const result = transferService.approve(params.id, user.id);
		try {
			auditService.log({
				userId: user.id,
				action: 'transfer',
				entityType: 'transfer',
				entityId: params.id,
				oldValues: { status: transfer.status },
				newValues: { status: 'approved' }
			});
		} catch (auditErr) {
			console.error('[audit] Failed to log transfer approval:', auditErr);
		}
		return json({ data: result });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : '';
		if (msg === 'TRANSFER_NOT_FOUND') throw error(404, 'Transfer not found');
		if (msg === 'INVALID_TRANSITION') throw error(409, 'Invalid status transition');
		console.error(`[transfers/${params.id}/approve]`, e);
		throw error(500, 'Internal error');
	}
};
