import { error, redirect, fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, productWarehouse, userWarehouses, user } from '$lib/server/db/schema';
import { requireWarehouseAccess } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateWarehouseSchema } from '$lib/validators/warehouse';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user!;
	const role = currentUser.role as Role;

	await requireWarehouseAccess(currentUser.id, params.id, role);

	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, params.id)
	});

	if (!warehouse) {
		error(404, 'Entrepot non trouve');
	}

	// Get stock stats
	const [stats] = await db
		.select({
			productCount: sql<number>`COUNT(DISTINCT ${productWarehouse.productId})`,
			totalQuantity: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
			totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
		})
		.from(productWarehouse)
		.where(eq(productWarehouse.warehouseId, params.id));

	// Get assigned users
	const assignedUsers = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role
		})
		.from(userWarehouses)
		.innerJoin(user, eq(userWarehouses.userId, user.id))
		.where(eq(userWarehouses.warehouseId, params.id));

	return {
		warehouse,
		stats: stats ?? { productCount: 0, totalQuantity: 0, totalValue: 0 },
		assignedUsers,
		canEdit: role === 'admin'
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: formData.get('name') as string,
			address: (formData.get('address') as string) || undefined,
			contactName: (formData.get('contactName') as string) || undefined,
			contactPhone: (formData.get('contactPhone') as string) || undefined,
			contactEmail: (formData.get('contactEmail') as string) || undefined
		};

		const parsed = updateWarehouseSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				data,
				errors: parsed.error.flatten().fieldErrors
			});
		}

		await db
			.update(warehouses)
			.set({
				...parsed.data,
				contactEmail: parsed.data.contactEmail || null,
				updatedAt: sql`(datetime('now'))`
			})
			.where(eq(warehouses.id, params.id));

		return { success: true };
	},

	delete: async ({ params, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		// Check if warehouse has stock
		const [stock] = await db
			.select({ total: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)` })
			.from(productWarehouse)
			.where(eq(productWarehouse.warehouseId, params.id));

		if (stock?.total && stock.total > 0) {
			return fail(409, {
				deleteError:
					"Impossible de supprimer un entrepot avec du stock. Transferez d'abord le stock."
			});
		}

		await db
			.update(warehouses)
			.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
			.where(eq(warehouses.id, params.id));

		redirect(303, '/warehouses');
	}
};
