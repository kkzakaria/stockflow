import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards';
import { alertService } from '$lib/server/services/alerts';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params }) => {
	const user = requireAuth(locals.user);
	alertService.markAsRead(params.id, user.id);
	return json({ success: true });
};
