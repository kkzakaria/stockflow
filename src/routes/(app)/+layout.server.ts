import { redirect } from '@sveltejs/kit';
import { alertService } from '$lib/server/services/alerts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session) {
		redirect(302, '/login');
	}

	const unreadAlertCount = alertService.getUnreadCount(locals.user.id);

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
