import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { userWarehouses } from '$lib/server/db/schema';
import { hasGlobalScope, type Role } from './rbac';
import type { User } from '$lib/server/auth';

export function requireAuth(user: User | null): User {
	if (!user) {
		error(401, 'Authentification requise');
	}
	return user;
}

export async function requireWarehouseAccess(
	userId: string,
	warehouseId: string,
	role: Role
): Promise<void> {
	if (hasGlobalScope(role)) return;

	const access = await db.query.userWarehouses.findFirst({
		where: and(eq(userWarehouses.userId, userId), eq(userWarehouses.warehouseId, warehouseId))
	});

	if (!access) {
		error(403, 'Accès non autorisé à cet entrepôt');
	}
}

export async function getUserWarehouseIds(userId: string, role: Role): Promise<string[] | null> {
	if (hasGlobalScope(role)) return null; // null means "all warehouses"

	const rows = await db.query.userWarehouses.findMany({
		where: eq(userWarehouses.userId, userId)
	});

	return rows.map((r) => r.warehouseId);
}
