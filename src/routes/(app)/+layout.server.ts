import { redirect } from '@sveltejs/kit';
import { alertService } from '$lib/server/services/alerts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session) {
		redirect(302, '/login');
	}

	let unreadAlertCount = 0;
	try {
		unreadAlertCount = alertService.getUnreadCount(locals.user.id);
	} catch (err) {
		console.error('Failed to fetch unread alert count:', err);
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			role: locals.user.role
		},
		unreadAlertCount
	};
};
