import { error } from '@sveltejs/kit';

export type Role = 'admin' | 'admin_manager' | 'manager' | 'user' | 'admin_viewer' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
	admin: 100,
	admin_manager: 80,
	manager: 60,
	user: 40,
	admin_viewer: 20,
	viewer: 10
};

const GLOBAL_SCOPE_ROLES: Role[] = ['admin', 'admin_manager', 'admin_viewer'];
const READ_ONLY_ROLES: Role[] = ['admin_viewer', 'viewer'];
const MANAGEMENT_ROLES: Role[] = ['admin', 'admin_manager', 'manager'];
const APPROVAL_ROLES: Role[] = ['admin', 'admin_manager'];

export function requireRole(userRole: Role, minRole: Role): void {
	if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
		error(403, 'Accès non autorisé');
	}
}

export function hasGlobalScope(role: Role): boolean {
	return GLOBAL_SCOPE_ROLES.includes(role);
}

export function canWrite(role: Role): boolean {
	return !READ_ONLY_ROLES.includes(role);
}

export function canManage(role: Role): boolean {
	return MANAGEMENT_ROLES.includes(role);
}

export function canApprove(role: Role): boolean {
	return APPROVAL_ROLES.includes(role);
}
