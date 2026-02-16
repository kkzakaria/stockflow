import { alertService } from '$lib/server/services/alerts';
import { requireAuth } from '$lib/server/auth/guards';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuth(locals.user);
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = 20;
	const offset = (page - 1) * limit;
	const typeFilter = url.searchParams.get('type') ?? '';

	const alerts = alertService.getUserAlerts(user.id, limit, offset);
	const unreadCount = alertService.getUnreadCount(user.id);

	const filteredAlerts = typeFilter
		? alerts.filter((a) => a.type === typeFilter || a.type.startsWith(typeFilter))
		: alerts;

	return {
		alerts: filteredAlerts,
		unreadCount,
		pagination: { page, limit },
		typeFilter
	};
};

export const actions: Actions = {
	markRead: async ({ locals, request }) => {
		const user = requireAuth(locals.user);
		const formData = await request.formData();
		const alertId = formData.get('alertId') as string;
		if (alertId) {
			alertService.markAsRead(alertId, user.id);
		}
		return { success: true };
	},
	markAllRead: async ({ locals }) => {
		const user = requireAuth(locals.user);
		alertService.markAllAsRead(user.id);
		return { success: true };
	}
};
