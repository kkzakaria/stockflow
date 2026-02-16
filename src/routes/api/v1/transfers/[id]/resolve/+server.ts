import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards';
import { canApprove, type Role } from '$lib/server/auth/rbac';
import { resolveDisputeSchema } from '$lib/validators/transfer';
import { transferService } from '$lib/server/services/transfers';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;
	if (!canApprove(role)) error(403, 'Acc\u00e8s non autoris\u00e9');

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, { message: 'Corps JSON invalide' });
	}

	const parsed = resolveDisputeSchema.safeParse(body);
	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	try {
		const result = transferService.resolveDispute(params.id, user.id, parsed.data);
		return json({ data: result });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : '';
		if (msg === 'TRANSFER_NOT_FOUND') throw error(404, 'Transfer not found');
		if (msg === 'INVALID_TRANSITION') throw error(409, 'Invalid status transition');
		throw error(500, 'Internal error');
	}
};
