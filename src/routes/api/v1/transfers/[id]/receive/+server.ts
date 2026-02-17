import { json, error } from '@sveltejs/kit';
import { requireAuth, requireWarehouseAccess } from '$lib/server/auth/guards';
import { canManage, type Role } from '$lib/server/auth/rbac';
import { receiveTransferSchema } from '$lib/validators/transfer';
import { transferService } from '$lib/server/services/transfers';
import { auditService } from '$lib/server/services/audit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canManage(role)) error(403, 'Acc\u00e8s non autoris\u00e9');

	// Look up the transfer to check destination warehouse access
	const transfer = transferService.getById(params.id);
	if (!transfer) error(404, 'Transfer not found');

	await requireWarehouseAccess(user.id, transfer.destinationWarehouseId, role);

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Corps JSON invalide' });
	}

	const parsed = receiveTransferSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	try {
		const result = transferService.receive(params.id, user.id, parsed.data);
		try {
			auditService.log({
				userId: user.id,
				action: 'transfer',
				entityType: 'transfer',
				entityId: params.id,
				oldValues: { status: transfer.status },
				newValues: { status: result.status }
			});
		} catch (auditErr) {
			console.error('[audit] Failed to log transfer reception:', auditErr);
		}
		return json({ data: result });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : '';
		if (msg === 'TRANSFER_NOT_FOUND') throw error(404, 'Transfer not found');
		if (msg === 'INVALID_TRANSITION') throw error(409, 'Invalid status transition');
		if (msg === 'TRANSFER_ITEM_NOT_FOUND') throw error(400, 'Transfer item not found');
		if (msg === 'SOURCE_PUMP_NOT_FOUND') throw error(400, 'Source warehouse PUMP data not found');
		console.error(`[transfers/${params.id}/receive]`, e);
		throw error(500, 'Internal error');
	}
};
