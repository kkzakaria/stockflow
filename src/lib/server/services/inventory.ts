import { db } from '$lib/server/db';
import { inventories, inventoryItems, productWarehouse } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { stockService } from './stock';

// ============================================================================
// Types
// ============================================================================

interface CreateSessionInput {
	warehouseId: string;
	createdBy: string;
	productIds?: string[];
}

interface RecordCountInput {
	countedQuantity: number;
	countedBy: string;
}

interface ListFilters {
	warehouseId?: string;
	status?: 'in_progress' | 'validated';
	limit?: number;
	offset?: number;
}

// ============================================================================
// Service
// ============================================================================

export const inventoryService = {
	createSession(data: CreateSessionInput) {
		return db.transaction((tx) => {
			const inventoryId = nanoid();

			tx.insert(inventories)
				.values({
					id: inventoryId,
					warehouseId: data.warehouseId,
					status: 'in_progress',
					createdBy: data.createdBy
				})
				.run();

			// Snapshot current stock for this warehouse
			let stockEntries = tx
				.select({
					productId: productWarehouse.productId,
					quantity: productWarehouse.quantity
				})
				.from(productWarehouse)
				.where(eq(productWarehouse.warehouseId, data.warehouseId))
				.all();

			// Filter to specific products if provided
			if (data.productIds && data.productIds.length > 0) {
				const productIdSet = new Set(data.productIds);
				stockEntries = stockEntries.filter((entry) => productIdSet.has(entry.productId));
			}

			// Create inventory items with system quantity snapshot
			for (const entry of stockEntries) {
				tx.insert(inventoryItems)
					.values({
						id: nanoid(),
						inventoryId,
						productId: entry.productId,
						systemQuantity: entry.quantity ?? 0
					})
					.run();
			}

			const [inventory] = tx
				.select()
				.from(inventories)
				.where(eq(inventories.id, inventoryId))
				.all();

			return inventory;
		});
	},

	recordCount(inventoryItemId: string, data: RecordCountInput) {
		const [item] = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.id, inventoryItemId))
			.all();

		if (!item) {
			throw new Error('INVENTORY_ITEM_NOT_FOUND');
		}

		const difference = data.countedQuantity - item.systemQuantity;

		db.update(inventoryItems)
			.set({
				countedQuantity: data.countedQuantity,
				difference,
				countedBy: data.countedBy,
				countedAt: new Date().toISOString()
			})
			.where(eq(inventoryItems.id, inventoryItemId))
			.run();

		const [updated] = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.id, inventoryItemId))
			.all();

		return updated;
	},

	validate(inventoryId: string, validatedBy: string) {
		return db.transaction((tx) => {
			const [inventory] = tx
				.select()
				.from(inventories)
				.where(eq(inventories.id, inventoryId))
				.all();

			if (!inventory) {
				throw new Error('INVENTORY_NOT_FOUND');
			}

			if (inventory.status !== 'in_progress') {
				throw new Error('INVENTORY_ALREADY_VALIDATED');
			}

			const items = tx
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.inventoryId, inventoryId))
				.all();

			// Check all items have been counted
			const uncounted = items.filter((item) => item.countedQuantity === null);
			if (uncounted.length > 0) {
				throw new Error('INCOMPLETE_COUNT');
			}

			// Create adjustment movements for items with differences.
			// stockService.recordMovement opens its own transaction, which creates
			// a nested savepoint within this outer transaction for atomicity.
			for (const item of items) {
				if (item.difference !== null && item.difference !== 0) {
					const type = item.difference > 0 ? 'adjustment_in' : 'adjustment_out';
					stockService.recordMovement({
						productId: item.productId,
						warehouseId: inventory.warehouseId,
						type,
						quantity: Math.abs(item.difference),
						reason: 'ajustement',
						userId: validatedBy,
						reference: `INV-${inventoryId}`
					});
				}
			}

			tx.update(inventories)
				.set({
					status: 'validated',
					validatedBy,
					validatedAt: new Date().toISOString()
				})
				.where(eq(inventories.id, inventoryId))
				.run();

			const [updated] = tx
				.select()
				.from(inventories)
				.where(eq(inventories.id, inventoryId))
				.all();

			return updated;
		});
	},

	getById(inventoryId: string) {
		const [inventory] = db
			.select()
			.from(inventories)
			.where(eq(inventories.id, inventoryId))
			.all();

		if (!inventory) return null;

		const items = db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.inventoryId, inventoryId))
			.all();

		return { ...inventory, items };
	},

	list(filters?: ListFilters) {
		const conditions = [];

		if (filters?.warehouseId) {
			conditions.push(eq(inventories.warehouseId, filters.warehouseId));
		}

		if (filters?.status) {
			conditions.push(
				eq(
					inventories.status,
					filters.status as (typeof inventories.status.enumValues)[number]
				)
			);
		}

		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const limit = filters?.limit ?? 50;
		const offset = filters?.offset ?? 0;

		return db.select().from(inventories).where(where).limit(limit).offset(offset).all();
	}
};
