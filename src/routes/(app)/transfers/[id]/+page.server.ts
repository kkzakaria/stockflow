import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, products, user } from '$lib/server/db/schema';
import { requireAuth } from '$lib/server/auth/guards';
import { canManage, canApprove, canWrite, type Role } from '$lib/server/auth/rbac';
import { rejectTransferSchema, receiveTransferSchema, resolveDisputeSchema } from '$lib/validators/transfer';
import { transferService } from '$lib/server/services/transfers';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = requireAuth(locals.user);
	const role = currentUser.role as Role;

	const transfer = transferService.getById(params.id);
	if (!transfer) {
		error(404, 'Transfert introuvable');
	}

	// Get warehouse names
	const [warehouseList, productList, userList] = await Promise.all([
		db.select({ id: warehouses.id, name: warehouses.name }).from(warehouses),
		db.select({ id: products.id, name: products.name, sku: products.sku }).from(products),
		db.select({ id: user.id, name: user.name }).from(user)
	]);

	const warehouseMap = new Map(warehouseList.map((w) => [w.id, w.name]));
	const productMap = new Map(productList.map((p) => [p.id, { name: p.name, sku: p.sku }]));
	const userMap = new Map(userList.map((u) => [u.id, u.name]));

	// Enrich items with product info
	const enrichedItems = transfer.items.map((item) => ({
		...item,
		productName: productMap.get(item.productId)?.name ?? 'Inconnu',
		productSku: productMap.get(item.productId)?.sku ?? '—'
	}));

	// Determine allowed actions based on status and role
	const status = transfer.status;
	const isApprover = canApprove(role);
	const isManager = canManage(role);
	const isWriter = canWrite(role);

	return {
		transfer: {
			...transfer,
			sourceWarehouseName: warehouseMap.get(transfer.sourceWarehouseId) ?? 'Inconnu',
			destinationWarehouseName: warehouseMap.get(transfer.destinationWarehouseId) ?? 'Inconnu',
			requestedByName: userMap.get(transfer.requestedBy) ?? 'Inconnu',
			approvedByName: transfer.approvedBy ? (userMap.get(transfer.approvedBy) ?? 'Inconnu') : null,
			shippedByName: transfer.shippedBy ? (userMap.get(transfer.shippedBy) ?? 'Inconnu') : null,
			receivedByName: transfer.receivedBy ? (userMap.get(transfer.receivedBy) ?? 'Inconnu') : null,
			disputeResolvedByName: transfer.disputeResolvedBy
				? (userMap.get(transfer.disputeResolvedBy) ?? 'Inconnu')
				: null
		},
		items: enrichedItems,
		canApprove: status === 'pending' && isApprover,
		canShip: status === 'approved' && isWriter,
		canReceive: status === 'shipped' && isWriter,
		canCancel: (status === 'pending' || status === 'approved') && isManager,
		canResolve: status === 'disputed' && isApprover
	};
};

export const actions: Actions = {
	approve: async ({ params, locals }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canApprove(role)) return fail(403, { error: 'Acces non autorise' });

		try {
			transferService.approve(params.id, currentUser.id);
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === 'TRANSFER_NOT_FOUND') return fail(404, { error: 'Transfert introuvable' });
				if (err.message === 'INVALID_TRANSITION') return fail(400, { error: 'Action non autorisee pour ce statut' });
			}
			throw err;
		}

		redirect(303, `/transfers/${params.id}`);
	},

	reject: async ({ params, locals, request }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canApprove(role)) return fail(403, { error: 'Acces non autorise' });

		const formData = await request.formData();
		const data = { reason: (formData.get('reason') as string)?.trim() ?? '' };

		const parsed = rejectTransferSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, {
				errors: parsed.error.flatten().fieldErrors,
				error: 'Donnees invalides'
			});
		}

		try {
			transferService.reject(params.id, currentUser.id, parsed.data.reason);
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === 'TRANSFER_NOT_FOUND') return fail(404, { error: 'Transfert introuvable' });
				if (err.message === 'INVALID_TRANSITION') return fail(400, { error: 'Action non autorisee pour ce statut' });
			}
			throw err;
		}

		redirect(303, `/transfers/${params.id}`);
	},

	ship: async ({ params, locals }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canWrite(role)) return fail(403, { error: 'Acces non autorise' });

		try {
			transferService.ship(params.id, currentUser.id);
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === 'TRANSFER_NOT_FOUND') return fail(404, { error: 'Transfert introuvable' });
				if (err.message === 'INVALID_TRANSITION') return fail(400, { error: 'Action non autorisee pour ce statut' });
				if (err.message === 'INSUFFICIENT_STOCK') return fail(400, { error: 'Stock insuffisant dans l\'entrepot source' });
			}
			throw err;
		}

		redirect(303, `/transfers/${params.id}`);
	},

	receive: async ({ params, locals, request }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canWrite(role)) return fail(403, { error: 'Acces non autorise' });

		const formData = await request.formData();

		// Parse received items from form
		const receivedItems: { transferItemId: string; quantityReceived: number; anomalyNotes?: string }[] = [];
		let i = 0;
		while (formData.has(`items[${i}].transferItemId`)) {
			const transferItemId = formData.get(`items[${i}].transferItemId`) as string;
			const quantityReceived = Number(formData.get(`items[${i}].quantityReceived`)) || 0;
			const anomalyNotes = ((formData.get(`items[${i}].anomalyNotes`) as string) ?? '').trim() || undefined;
			receivedItems.push({ transferItemId, quantityReceived, anomalyNotes });
			i++;
		}

		const data = { items: receivedItems };
		const parsed = receiveTransferSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, {
				errors: parsed.error.flatten().fieldErrors,
				error: 'Donnees invalides'
			});
		}

		try {
			transferService.receive(params.id, currentUser.id, parsed.data);
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === 'TRANSFER_NOT_FOUND') return fail(404, { error: 'Transfert introuvable' });
				if (err.message === 'INVALID_TRANSITION') return fail(400, { error: 'Action non autorisee pour ce statut' });
				if (err.message === 'TRANSFER_ITEM_NOT_FOUND') return fail(400, { error: 'Article de transfert introuvable' });
			}
			throw err;
		}

		redirect(303, `/transfers/${params.id}`);
	},

	cancel: async ({ params, locals }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canManage(role)) return fail(403, { error: 'Acces non autorise' });

		try {
			transferService.cancel(params.id, currentUser.id);
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === 'TRANSFER_NOT_FOUND') return fail(404, { error: 'Transfert introuvable' });
				if (err.message === 'INVALID_TRANSITION') return fail(400, { error: 'Action non autorisee pour ce statut' });
			}
			throw err;
		}

		redirect(303, `/transfers/${params.id}`);
	},

	resolve: async ({ params, locals, request }) => {
		const currentUser = requireAuth(locals.user);
		const role = currentUser.role as Role;
		if (!canApprove(role)) return fail(403, { error: 'Acces non autorise' });

		const formData = await request.formData();
		const data = {
			resolution: (formData.get('resolution') as string)?.trim() ?? '',
			adjustStock: formData.get('adjustStock') === 'true'
		};

		const parsed = resolveDisputeSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, {
				errors: parsed.error.flatten().fieldErrors,
				error: 'Donnees invalides'
			});
		}

		try {
			transferService.resolveDispute(params.id, currentUser.id, parsed.data);
		} catch (err) {
			if (err instanceof Error) {
				if (err.message === 'TRANSFER_NOT_FOUND') return fail(404, { error: 'Transfert introuvable' });
				if (err.message === 'INVALID_TRANSITION') return fail(400, { error: 'Action non autorisee pour ce statut' });
			}
			throw err;
		}

		redirect(303, `/transfers/${params.id}`);
	}
};
