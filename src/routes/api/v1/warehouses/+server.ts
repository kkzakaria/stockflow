import { json, error } from '@sveltejs/kit';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses } from '$lib/server/db/schema';
import { requireAuth, getUserWarehouseIds } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createWarehouseSchema } from '$lib/validators/warehouse';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals.user);
	const role = user.role as Role;

	const warehouseIds = await getUserWarehouseIds(user.id, role);

	let result;
	if (warehouseIds === null) {
		// Global scope — see all
		result = await db.select().from(warehouses).where(eq(warehouses.isActive, true));
	} else {
		if (warehouseIds.length === 0) return json({ data: [] });
		result = await db
			.select()
			.from(warehouses)
			.where(and(eq(warehouses.isActive, true), inArray(warehouses.id, warehouseIds)));
	}

	return json({ data: result });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals.user);
	requireRole(user.role as Role, 'admin');

	const body = await request.json();
	const parsed = createWarehouseSchema.safeParse(body);

	if (!parsed.success) {
		error(400, { message: parsed.error.issues.map((i) => i.message).join(', ') });
	}

	const [warehouse] = await db
		.insert(warehouses)
		.values({
			name: parsed.data.name,
			address: parsed.data.address,
			contactName: parsed.data.contactName,
			contactPhone: parsed.data.contactPhone,
			contactEmail: parsed.data.contactEmail || null
		})
		.returning();

	return json({ data: warehouse }, { status: 201 });
};
