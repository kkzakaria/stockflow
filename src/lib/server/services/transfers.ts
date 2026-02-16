import { db } from '$lib/server/db';
import {
	transfers,
	transferItems,
	productWarehouse,
	user,
	userWarehouses
} from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { stockService } from './stock';
import { alertService } from './alerts';
import { hasGlobalScope, type Role } from '$lib/server/auth/rbac';

// ============================================================================
// Types
// ============================================================================

type TransferStatus =
	| 'pending'
	| 'approved'
	| 'rejected'
	| 'shipped'
	| 'received'
	| 'partially_received'
	| 'cancelled'
	| 'disputed'
	| 'resolved';

interface CreateTransferInput {
	sourceWarehouseId: string;
	destinationWarehouseId: string;
	requestedBy: string;
	items: { productId: string; quantityRequested: number }[];
	notes?: string;
}

interface ReceiveItemInput {
	transferItemId: string;
	quantityReceived: number;
	anomalyNotes?: string;
}

interface ReceiveInput {
	items: ReceiveItemInput[];
}

interface ResolveDisputeInput {
	resolution: string;
	adjustStock: boolean;
}

interface ListFilters {
	status?: TransferStatus;
	warehouseId?: string;
	limit?: number;
	offset?: number;
}

// ============================================================================
// State machine: valid transitions
// ============================================================================

// Transfer state machine. Terminal states: received, rejected, cancelled, resolved.
// Partial receipts transition shipped → disputed directly (partially_received is not persisted).
const VALID_TRANSITIONS: Partial<Record<TransferStatus, TransferStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['shipped', 'cancelled'],
	shipped: ['received', 'disputed'],
	disputed: ['resolved']
};

function assertTransition(currentStatus: TransferStatus, targetStatus: TransferStatus): void {
	const allowed = VALID_TRANSITIONS[currentStatus];
	if (!allowed || !allowed.includes(targetStatus)) {
		throw new Error('INVALID_TRANSITION');
	}
}

// ============================================================================
// Service
// ============================================================================

export const transferService = {
	create(data: CreateTransferInput) {
		return db.transaction((tx) => {
			const transferId = nanoid();

			tx.insert(transfers)
				.values({
					id: transferId,
					sourceWarehouseId: data.sourceWarehouseId,
					destinationWarehouseId: data.destinationWarehouseId,
					status: 'pending',
					requestedBy: data.requestedBy,
					notes: data.notes ?? null
				})
				.run();

			for (const item of data.items) {
				tx.insert(transferItems)
					.values({
						id: nanoid(),
						transferId,
						productId: item.productId,
						quantityRequested: item.quantityRequested
					})
					.run();
			}

			const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();

			return transfer;
		});
	},

	getById(transferId: string) {
		const [transfer] = db.select().from(transfers).where(eq(transfers.id, transferId)).all();

		if (!transfer) return null;

		const items = db
			.select()
			.from(transferItems)
			.where(eq(transferItems.transferId, transferId))
			.all();

		return { ...transfer, items };
	},

	list(filters?: ListFilters) {
		const conditions = [];

		if (filters?.status) {
			conditions.push(eq(transfers.status, filters.status as typeof transfers.status.enumValues[number]));
		}

		if (filters?.warehouseId) {
			conditions.push(
				or(
					eq(transfers.sourceWarehouseId, filters.warehouseId),
					eq(transfers.destinationWarehouseId, filters.warehouseId)
				)!
			);
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const limit = filters?.limit ?? 50;
		const offset = filters?.offset ?? 0;

		return db.select().from(transfers).where(where).limit(limit).offset(offset).all();
	},

	approve(transferId: string, approvedBy: string) {
		const txResult = db.transaction((tx) => {
			const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

			assertTransition(transfer.status, 'approved');

			tx.update(transfers)
				.set({
					status: 'approved',
					approvedBy,
					approvedAt: new Date().toISOString()
				})
				.where(eq(transfers.id, transferId))
				.run();

			const [updated] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			return { result: updated, requestedBy: transfer.requestedBy };
		});

		// Alert requester AFTER transaction completes
		try {
			alertService.createTransferAlert(
				transferId,
				'transfer_approved',
				`Transfert approuve par ${approvedBy}`,
				[txResult.requestedBy]
			);
		} catch (alertErr) {
			console.error(`Failed to create approval alert for transfer ${transferId}:`, alertErr);
		}

		return txResult.result;
	},

	reject(transferId: string, rejectedBy: string, reason: string) {
		const txResult = db.transaction((tx) => {
			const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

			assertTransition(transfer.status, 'rejected');

			tx.update(transfers)
				.set({
					status: 'rejected',
					rejectionReason: reason,
					rejectedAt: new Date().toISOString()
				})
				.where(eq(transfers.id, transferId))
				.run();

			const [updated] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			return { result: updated, requestedBy: transfer.requestedBy };
		});

		// Alert requester AFTER transaction completes
		try {
			alertService.createTransferAlert(
				transferId,
				'transfer_rejected',
				`Transfert rejete: ${reason}`,
				[txResult.requestedBy]
			);
		} catch (alertErr) {
			console.error(`Failed to create rejection alert for transfer ${transferId}:`, alertErr);
		}

		return txResult.result;
	},

	ship(transferId: string, shippedBy: string) {
		const txResult = db.transaction((tx) => {
			const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

			assertTransition(transfer.status, 'shipped');

			const items = tx
				.select()
				.from(transferItems)
				.where(eq(transferItems.transferId, transferId))
				.all();

			// Decrement source warehouse stock for each item
			for (const item of items) {
				stockService.recordMovement({
					productId: item.productId,
					warehouseId: transfer.sourceWarehouseId,
					type: 'out',
					quantity: item.quantityRequested,
					reason: 'transfert',
					userId: shippedBy,
					reference: `TRF-${transferId}`
				});

				// Set quantitySent = quantityRequested
				tx.update(transferItems)
					.set({ quantitySent: item.quantityRequested })
					.where(eq(transferItems.id, item.id))
					.run();
			}

			tx.update(transfers)
				.set({
					status: 'shipped',
					shippedBy,
					shippedAt: new Date().toISOString()
				})
				.where(eq(transfers.id, transferId))
				.run();

			const [updated] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			return { result: updated, destinationWarehouseId: transfer.destinationWarehouseId };
		});

		// Alert destination warehouse managers and admins AFTER transaction completes
		const globalUsers = db
			.select({ id: user.id, role: user.role })
			.from(user)
			.where(eq(user.isActive, true))
			.all()
			.filter((u) => hasGlobalScope(u.role as Role));

		const destWarehouseUsers = db
			.select({ userId: userWarehouses.userId })
			.from(userWarehouses)
			.where(eq(userWarehouses.warehouseId, txResult.destinationWarehouseId))
			.all();

		const targetUserIds = new Set<string>();
		for (const u of globalUsers) targetUserIds.add(u.id);
		for (const uw of destWarehouseUsers) targetUserIds.add(uw.userId);

		try {
			alertService.createTransferAlert(
				transferId,
				'transfer_shipped',
				`Transfert expedie, en attente de reception`,
				[...targetUserIds]
			);
		} catch (alertErr) {
			console.error(`Failed to create shipment alert for transfer ${transferId}:`, alertErr);
		}

		return txResult.result;
	},

	receive(transferId: string, receivedBy: string, data: ReceiveInput) {
		const txResult = db.transaction((tx) => {
			const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

			// Validate shipped status allows receiving (both 'received' and 'disputed' are valid targets)
			assertTransition(transfer.status, 'received');

			const allItems = tx
				.select()
				.from(transferItems)
				.where(eq(transferItems.transferId, transferId))
				.all();

			let isPartial = false;
			const anomalyParts: string[] = [];

			// Process each received item
			for (const receivedItem of data.items) {
				const transferItem = allItems.find((i) => i.id === receivedItem.transferItemId);
				if (!transferItem) throw new Error('TRANSFER_ITEM_NOT_FOUND');

				// Update the transfer item with received quantity
				tx.update(transferItems)
					.set({
						quantityReceived: receivedItem.quantityReceived,
						anomalyNotes: receivedItem.anomalyNotes ?? null
					})
					.where(eq(transferItems.id, receivedItem.transferItemId))
					.run();

				// Look up the source warehouse PUMP for this product
				const [sourcePw] = tx
					.select({ pump: productWarehouse.pump })
					.from(productWarehouse)
					.where(
						and(
							eq(productWarehouse.productId, transferItem.productId),
							eq(productWarehouse.warehouseId, transfer.sourceWarehouseId)
						)
					)
					.all();

				if (!sourcePw || sourcePw.pump === null || sourcePw.pump === undefined) {
					throw new Error('SOURCE_PUMP_NOT_FOUND');
				}
				const purchasePrice = sourcePw.pump;

				// Increment destination stock
				stockService.recordMovement({
					productId: transferItem.productId,
					warehouseId: transfer.destinationWarehouseId,
					type: 'in',
					quantity: receivedItem.quantityReceived,
					reason: 'transfert',
					userId: receivedBy,
					reference: `TRF-${transferId}`,
					purchasePrice
				});

				// Check for partial receipt
				const quantitySent = transferItem.quantitySent ?? transferItem.quantityRequested;
				if (receivedItem.quantityReceived < quantitySent) {
					isPartial = true;
					const diff = quantitySent - receivedItem.quantityReceived;
					anomalyParts.push(
						`Product ${transferItem.productId}: sent ${quantitySent}, received ${receivedItem.quantityReceived} (missing ${diff})${receivedItem.anomalyNotes ? ' — ' + receivedItem.anomalyNotes : ''}`
					);
				}
			}

			const now = new Date().toISOString();

			if (isPartial) {
				// Partial receipt: transition directly to 'disputed' (partially_received is not persisted)
				const disputeReason = `Partial receipt: ${anomalyParts.join('; ')}`;
				tx.update(transfers)
					.set({
						status: 'disputed' as typeof transfers.status.enumValues[number],
						receivedBy,
						receivedAt: now,
						disputeReason
					})
					.where(eq(transfers.id, transferId))
					.run();
			} else {
				tx.update(transfers)
					.set({
						status: 'received',
						receivedBy,
						receivedAt: now
					})
					.where(eq(transfers.id, transferId))
					.run();
			}

			const [updated] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			return { result: updated, isPartial };
		});

		// Alert admins about received/disputed AFTER transaction completes
		const globalUsers = db
			.select({ id: user.id, role: user.role })
			.from(user)
			.where(eq(user.isActive, true))
			.all()
			.filter((u) => hasGlobalScope(u.role as Role));

		const targetIds = globalUsers.map((u) => u.id);

		try {
			if (txResult.isPartial) {
				alertService.createTransferAlert(
					transferId,
					'transfer_dispute',
					`Litige: reception partielle du transfert`,
					targetIds
				);
			} else {
				alertService.createTransferAlert(
					transferId,
					'transfer_received',
					`Transfert recu avec succes`,
					targetIds
				);
			}
		} catch (alertErr) {
			console.error(`Failed to create receive alert for transfer ${transferId}:`, alertErr);
		}

		return txResult.result;
	},

	cancel(transferId: string, cancelledBy: string) {
		return db.transaction((tx) => {
			const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

			assertTransition(transfer.status, 'cancelled');

			tx.update(transfers)
				.set({
					status: 'cancelled',
					notes: transfer.notes
						? `${transfer.notes}\nCancelled by ${cancelledBy}`
						: `Cancelled by ${cancelledBy}`
				})
				.where(eq(transfers.id, transferId))
				.run();

			const [updated] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			return updated;
		});
	},

	// TODO: data.adjustStock is accepted but not yet implemented. When true, it should
	// create stock adjustment movements to reconcile sent vs received quantities.
	resolveDispute(transferId: string, resolvedBy: string, data: ResolveDisputeInput) {
		return db.transaction((tx) => {
			const [transfer] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			if (!transfer) throw new Error('TRANSFER_NOT_FOUND');

			assertTransition(transfer.status, 'resolved');

			const now = new Date().toISOString();
			const updatedNotes = transfer.notes
				? `${transfer.notes}\nResolution: ${data.resolution}`
				: `Resolution: ${data.resolution}`;

			tx.update(transfers)
				.set({
					status: 'resolved' as typeof transfers.status.enumValues[number],
					disputeResolvedBy: resolvedBy,
					disputeResolvedAt: now,
					notes: updatedNotes
				})
				.where(eq(transfers.id, transferId))
				.run();

			const [updated] = tx.select().from(transfers).where(eq(transfers.id, transferId)).all();
			return updated;
		});
	}
};
