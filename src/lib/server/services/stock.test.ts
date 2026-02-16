import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import {
	alerts,
	products,
	warehouses,
	productWarehouse,
	movements,
	user
} from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { stockService } from './stock';

// Test fixtures
const TEST_USER_ID = 'test-user-001';
const TEST_WAREHOUSE_ID = 'test-wh-001';
const TEST_PRODUCT_ID = 'test-prod-001';

function cleanupTestData() {
	// Delete alerts that may reference our test data (created by alert integration in other tests)
	db.delete(alerts).where(eq(alerts.userId, TEST_USER_ID)).run();
	db.delete(alerts).where(eq(alerts.productId, TEST_PRODUCT_ID)).run();
	db.delete(alerts).where(eq(alerts.warehouseId, TEST_WAREHOUSE_ID)).run();
	db.delete(movements).where(eq(movements.userId, TEST_USER_ID)).run();
	db.delete(productWarehouse)
		.where(eq(productWarehouse.productId, TEST_PRODUCT_ID))
		.run();
	db.delete(products).where(eq(products.id, TEST_PRODUCT_ID)).run();
	db.delete(warehouses).where(eq(warehouses.id, TEST_WAREHOUSE_ID)).run();
	db.delete(user).where(eq(user.id, TEST_USER_ID)).run();
}

function seedTestData() {
	cleanupTestData();

	db.insert(user)
		.values({
			id: TEST_USER_ID,
			name: 'Test User',
			email: 'stock-test@test.com',
			role: 'admin'
		})
		.run();

	db.insert(warehouses)
		.values({
			id: TEST_WAREHOUSE_ID,
			name: 'Test Warehouse'
		})
		.run();

	db.insert(products)
		.values({
			id: TEST_PRODUCT_ID,
			sku: 'TEST-STOCK-001',
			name: 'Test Product Stock',
			purchasePrice: 1000,
			salePrice: 1500
		})
		.run();
}

function getProductWarehouse() {
	return db
		.select()
		.from(productWarehouse)
		.where(
			and(
				eq(productWarehouse.productId, TEST_PRODUCT_ID),
				eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID)
			)
		)
		.all();
}

describe('stockService', () => {
	beforeEach(() => {
		seedTestData();
	});

	describe('recordMovement - stock in', () => {
		it('should increment quantity on stock entry', () => {
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const [pw] = getProductWarehouse();

			expect(pw.quantity).toBe(100);
		});

		it('should set PUMP to purchase price on first entry', () => {
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const [pw] = getProductWarehouse();

			expect(pw.pump).toBe(1000);
		});

		it('should recalculate PUMP correctly on second entry', () => {
			// First entry: 100 units at 1000
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			// Second entry: 50 units at 2000
			// PUMP = (100 * 1000 + 50 * 2000) / (100 + 50) = 200000 / 150 ≈ 1333.33
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 50,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 2000
			});

			const [pw] = getProductWarehouse();

			expect(pw.quantity).toBe(150);
			expect(pw.pump).toBeCloseTo(1333.33, 1);
		});
	});

	describe('recordMovement - stock out', () => {
		it('should decrement quantity on stock exit', () => {
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'out',
				quantity: 30,
				reason: 'vente',
				userId: TEST_USER_ID
			});

			const [pw] = getProductWarehouse();

			expect(pw.quantity).toBe(70);
		});

		it('should NOT change PUMP on stock exit', () => {
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'out',
				quantity: 30,
				reason: 'vente',
				userId: TEST_USER_ID
			});

			const [pw] = getProductWarehouse();

			expect(pw.pump).toBe(1000);
		});

		it('should throw INSUFFICIENT_STOCK when not enough stock', () => {
			expect(() =>
				stockService.recordMovement({
					productId: TEST_PRODUCT_ID,
					warehouseId: TEST_WAREHOUSE_ID,
					type: 'out',
					quantity: 10,
					reason: 'vente',
					userId: TEST_USER_ID
				})
			).toThrow('INSUFFICIENT_STOCK');
		});

		it('should throw INSUFFICIENT_STOCK when removing more than available', () => {
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 50,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			expect(() =>
				stockService.recordMovement({
					productId: TEST_PRODUCT_ID,
					warehouseId: TEST_WAREHOUSE_ID,
					type: 'out',
					quantity: 51,
					reason: 'vente',
					userId: TEST_USER_ID
				})
			).toThrow('INSUFFICIENT_STOCK');
		});
	});

	describe('recordMovement - stock zero then entry', () => {
		it('should reset PUMP to purchase price after zero stock', () => {
			// Add 10 at 1000
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 10,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			// Remove all 10
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'out',
				quantity: 10,
				reason: 'vente',
				userId: TEST_USER_ID
			});

			// Add 5 at 2000 — PUMP should be 2000 (not averaged with old)
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 5,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 2000
			});

			const [pw] = getProductWarehouse();

			expect(pw.quantity).toBe(5);
			expect(pw.pump).toBe(2000);
		});
	});

	describe('recordMovement - creates movement record', () => {
		it('should create a movement entry in the database', () => {
			const movement = stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 50,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000,
				reference: 'BL-001'
			});

			expect(movement).toBeDefined();
			expect(movement.id).toBeDefined();
			expect(movement.quantity).toBe(50);
			expect(movement.reason).toBe('achat');
			expect(movement.reference).toBe('BL-001');
		});
	});

	describe('checkMinStock', () => {
		it('should detect stock below threshold', () => {
			db.update(products)
				.set({ minStock: 20 })
				.where(eq(products.id, TEST_PRODUCT_ID))
				.run();

			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 10,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const result = stockService.checkMinStock(TEST_PRODUCT_ID, TEST_WAREHOUSE_ID);

			expect(result).toBeDefined();
			expect(result!.isBelowMin).toBe(true);
			expect(result!.currentQty).toBe(10);
			expect(result!.threshold).toBe(20);
		});
	});

	describe('getStockConsolidated', () => {
		it('should return consolidated stock across warehouses', () => {
			stockService.recordMovement({
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID,
				type: 'in',
				quantity: 100,
				reason: 'achat',
				userId: TEST_USER_ID,
				purchasePrice: 1000
			});

			const result = stockService.getStockConsolidated(TEST_PRODUCT_ID);

			expect(result.totalQuantity).toBe(100);
			expect(result.totalValue).toBe(100000);
		});
	});
});
