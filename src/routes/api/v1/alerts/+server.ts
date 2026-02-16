import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards';
import { alertService } from '$lib/server/services/alerts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
	const offset = (page - 1) * limit;

	const alerts = alertService.getUserAlerts(user.id, limit, offset);
	const unreadCount = alertService.getUnreadCount(user.id);

	return json({ data: alerts, unreadCount, pagination: { page, limit } });
};
