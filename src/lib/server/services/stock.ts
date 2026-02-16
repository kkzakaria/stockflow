import { db } from '$lib/server/db';
import { movements, productWarehouse, products } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type MovementType = 'in' | 'out' | 'adjustment_in' | 'adjustment_out';

export interface RecordMovementInput {
	productId: string;
	warehouseId: string;
	type: MovementType;
	quantity: number;
	reason: string;
	userId: string;
	reference?: string;
	purchasePrice?: number;
}

export const stockService = {
	recordMovement(data: RecordMovementInput) {
		const isOut = data.type === 'out' || data.type === 'adjustment_out';
		const isIn = data.type === 'in' || data.type === 'adjustment_in';
		const delta = isOut ? -data.quantity : data.quantity;

		return db.transaction((tx) => {
			// 1. Check sufficient stock for outgoing movements
			if (isOut) {
				const [current] = tx
					.select({ quantity: productWarehouse.quantity })
					.from(productWarehouse)
					.where(
						and(
							eq(productWarehouse.productId, data.productId),
							eq(productWarehouse.warehouseId, data.warehouseId)
						)
					)
					.all();

				if (!current || (current.quantity ?? 0) < data.quantity) {
					throw new Error('INSUFFICIENT_STOCK');
				}
			}

			// 2. Record the movement
			const [movement] = tx
				.insert(movements)
				.values({
					productId: data.productId,
					warehouseId: data.warehouseId,
					type: data.type,
					quantity: data.quantity,
					reason: data.reason,
					reference: data.reference,
					userId: data.userId
				})
				.returning()
				.all();

			// 3. Update stock + PUMP (upsert)
			const purchasePrice = data.purchasePrice ?? 0;

			tx.insert(productWarehouse)
				.values({
					productId: data.productId,
					warehouseId: data.warehouseId,
					quantity: isOut ? 0 : data.quantity,
					pump: isIn ? purchasePrice : 0
				})
				.onConflictDoUpdate({
					target: [productWarehouse.productId, productWarehouse.warehouseId],
					set: {
						quantity: sql`MAX(0, ${productWarehouse.quantity} + ${delta})`,
						pump: isIn
							? sql`CASE
								WHEN (${productWarehouse.quantity} + ${data.quantity}) > 0
								THEN ((${productWarehouse.quantity} * ${productWarehouse.pump})
									 + (${data.quantity} * ${purchasePrice}))
									 / (${productWarehouse.quantity} + ${data.quantity})
								ELSE ${purchasePrice}
							END`
							: productWarehouse.pump,
						updatedAt: sql`(datetime('now'))`
					}
				})
				.run();

			return movement;
		});
	},

	getStockByWarehouse(productId: string) {
		return db
			.select({
				warehouseId: productWarehouse.warehouseId,
				quantity: productWarehouse.quantity,
				pump: productWarehouse.pump,
				minStock: productWarehouse.minStock,
				valuation: sql<number>`${productWarehouse.quantity} * ${productWarehouse.pump}`
			})
			.from(productWarehouse)
			.where(eq(productWarehouse.productId, productId))
			.all();
	},

	getStockConsolidated(productId: string) {
		const [result] = db
			.select({
				totalQuantity: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
				totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
			})
			.from(productWarehouse)
			.where(eq(productWarehouse.productId, productId))
			.all();

		return result;
	},

	getValuation(warehouseId?: string) {
		const conditions = warehouseId
			? eq(productWarehouse.warehouseId, warehouseId)
			: undefined;

		const [result] = db
			.select({
				totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
			})
			.from(productWarehouse)
			.where(conditions)
			.all();

		return result.totalValue;
	},

	checkMinStock(productId: string, warehouseId: string) {
		const [pw] = db
			.select()
			.from(productWarehouse)
			.where(
				and(
					eq(productWarehouse.productId, productId),
					eq(productWarehouse.warehouseId, warehouseId)
				)
			)
			.all();

		if (!pw) return null;

		const [product] = db.select().from(products).where(eq(products.id, productId)).all();
		const threshold = pw.minStock ?? product?.minStock ?? 0;

		return {
			currentQty: pw.quantity ?? 0,
			threshold,
			isBelowMin: (pw.quantity ?? 0) <= threshold
		};
	}
};
