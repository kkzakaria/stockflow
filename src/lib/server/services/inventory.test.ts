import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import {
	products,
	warehouses,
	productWarehouse,
	movements,
	inventories,
	inventoryItems,
	user
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { stockService } from './stock';
import { inventoryService } from './inventory';

// Test fixtures
const TEST_USER_ID = 'test-inv-user-001';
const TEST_COUNTER_ID = 'test-inv-user-002';
const TEST_WAREHOUSE_ID = 'test-inv-wh-001';
const TEST_PRODUCT_A_ID = 'test-inv-prod-a';
const TEST_PRODUCT_B_ID = 'test-inv-prod-b';

function cleanupTestData() {
	// Order matters: delete child rows first due to FK constraints
	db.delete(inventoryItems).run();
	db.delete(inventories).run();
	db.delete(movements).where(eq(movements.userId, TEST_USER_ID)).run();
	db.delete(movements).where(eq(movements.userId, TEST_COUNTER_ID)).run();
	db.delete(productWarehouse)
		.where(eq(productWarehouse.warehouseId, TEST_WAREHOUSE_ID))
		.run();
	db.delete(products).where(eq(products.id, TEST_PRODUCT_A_ID)).run();
	db.delete(products).where(eq(products.id, TEST_PRODUCT_B_ID)).run();
	db.delete(warehouses).where(eq(warehouses.id, TEST_WAREHOUSE_ID)).run();
	db.delete(user).where(eq(user.id, TEST_USER_ID)).run();
	db.delete(user).where(eq(user.id, TEST_COUNTER_ID)).run();
}

function seedTestData() {
	cleanupTestData();

	// Create users
	db.insert(user)
		.values([
			{ id: TEST_USER_ID, name: 'Inventory Creator', email: 'inv-creator@test.com', role: 'manager' },
			{ id: TEST_COUNTER_ID, name: 'Counter', email: 'inv-counter@test.com', role: 'user' }
		])
		.run();

	// Create warehouse
	db.insert(warehouses)
		.values({ id: TEST_WAREHOUSE_ID, name: 'Inventory Test Warehouse' })
		.run();

	// Create products
	db.insert(products)
		.values([
			{
				id: TEST_PRODUCT_A_ID,
				sku: 'INV-TEST-A',
				name: 'Inventory Product A',
				purchasePrice: 1000,
				salePrice: 1500
			},
			{
				id: TEST_PRODUCT_B_ID,
				sku: 'INV-TEST-B',
				name: 'Inventory Product B',
				purchasePrice: 2000,
				salePrice: 3000
			}
		])
		.run();

	// Seed warehouse stock: Product A = 50, Product B = 30
	stockService.recordMovement({
		productId: TEST_PRODUCT_A_ID,
		warehouseId: TEST_WAREHOUSE_ID,
		type: 'in',
		quantity: 50,
		reason: 'achat',
		userId: TEST_USER_ID,
		purchasePrice: 1000
	});

	stockService.recordMovement({
		productId: TEST_PRODUCT_B_ID,
		warehouseId: TEST_WAREHOUSE_ID,
		type: 'in',
		quantity: 30,
		reason: 'achat',
		userId: TEST_USER_ID,
		purchasePrice: 2000
	});
}

describe('inventoryService', () => {
	beforeEach(() => {
		seedTestData();
	});

	describe('createSession', () => {
		it('should create inventory with system quantity snapshot', () => {
			const inventory = inventoryService.createSession({
				warehouseId: TEST_WAREHOUSE_ID,
				createdBy: TEST_USER_ID
			});

			expect(inventory).toBeDefined();
			expect(inventory.id).toBeDefined();
			expect(inventory.status).toBe('in_progress');
			expect(inventory.warehouseId).toBe(TEST_WAREHOUSE_ID);
			expect(inventory.createdBy).toBe(TEST_USER_ID);

			// Verify items were created with correct system quantities
			const result = inventoryService.getById(inventory.id);
			expect(result).not.toBeNull();
			expect(result!.items).toHaveLength(2);

			const itemA = result!.items.find((i) => i.productId === TEST_PRODUCT_A_ID);
			const itemB = result!.items.find((i) => i.productId === TEST_PRODUCT_B_ID);

			expect(itemA).toBeDefined();
			expect(itemA!.systemQuantity).toBe(50);
			expect(itemA!.countedQuantity).toBeNull();

			expect(itemB).toBeDefined();
			expect(itemB!.systemQuantity).toBe(30);
			expect(itemB!.countedQuantity).toBeNull();
		});

		it('should only include specific products when productIds provided', () => {
			const inventory = inventoryService.createSession({
				warehouseId: TEST_WAREHOUSE_ID,
				createdBy: TEST_USER_ID,
				productIds: [TEST_PRODUCT_A_ID]
			});

			const result = inventoryService.getById(inventory.id);
			expect(result).not.toBeNull();
			expect(result!.items).toHaveLength(1);
			expect(result!.items[0].productId).toBe(TEST_PRODUCT_A_ID);
			expect(result!.items[0].systemQuantity).toBe(50);
		});
	});

	describe('recordCount', () => {
		it('should update counted quantity and calculate difference', () => {
			const inventory = inventoryService.createSession({
				warehouseId: TEST_WAREHOUSE_ID,
				createdBy: TEST_USER_ID
			});

			const result = inventoryService.getById(inventory.id);
			const itemA = result!.items.find((i) => i.productId === TEST_PRODUCT_A_ID)!;

			// Count 45 instead of system 50 => difference = -5
			inventoryService.recordCount(itemA.id, {
				countedQuantity: 45,
				countedBy: TEST_COUNTER_ID
			});

			const updated = inventoryService.getById(inventory.id);
			const updatedItemA = updated!.items.find((i) => i.productId === TEST_PRODUCT_A_ID)!;

			expect(updatedItemA.countedQuantity).toBe(45);
			expect(updatedItemA.difference).toBe(-5); // 45 - 50
			expect(updatedItemA.countedBy).toBe(TEST_COUNTER_ID);
			expect(updatedItemA.countedAt).toBeDefined();
		});
	});

	describe('validate', () => {
		it('should adjust stock for items with differences', () => {
			const inventory = inventoryService.createSession({
				warehouseId: TEST_WAREHOUSE_ID,
				createdBy: TEST_USER_ID
			});

			const result = inventoryService.getById(inventory.id);
			const itemA = result!.items.find((i) => i.productId === TEST_PRODUCT_A_ID)!;
			const itemB = result!.items.find((i) => i.productId === TEST_PRODUCT_B_ID)!;

			// Product A: counted 45 (system 50) => difference -5 => adjustment_out 5
			inventoryService.recordCount(itemA.id, {
				countedQuantity: 45,
				countedBy: TEST_COUNTER_ID
			});

			// Product B: counted 35 (system 30) => difference +5 => adjustment_in 5
			inventoryService.recordCount(itemB.id, {
				countedQuantity: 35,
				countedBy: TEST_COUNTER_ID
			});

			// Validate the inventory
			const validated = inventoryService.validate(inventory.id, TEST_USER_ID);

			expect(validated.status).toBe('validated');
			expect(validated.validatedBy).toBe(TEST_USER_ID);
			expect(validated.validatedAt).toBeDefined();

			// Check stock was adjusted
			const stockA = stockService.getStockByWarehouse(TEST_PRODUCT_A_ID);
			const pwA = stockA.find((s) => s.warehouseId === TEST_WAREHOUSE_ID);
			expect(pwA!.quantity).toBe(45); // 50 - 5

			const stockB = stockService.getStockByWarehouse(TEST_PRODUCT_B_ID);
			const pwB = stockB.find((s) => s.warehouseId === TEST_WAREHOUSE_ID);
			expect(pwB!.quantity).toBe(35); // 30 + 5
		});

		it('should throw INCOMPLETE_COUNT if not all items counted', () => {
			const inventory = inventoryService.createSession({
				warehouseId: TEST_WAREHOUSE_ID,
				createdBy: TEST_USER_ID
			});

			// Only count one of two items
			const result = inventoryService.getById(inventory.id);
			const itemA = result!.items.find((i) => i.productId === TEST_PRODUCT_A_ID)!;

			inventoryService.recordCount(itemA.id, {
				countedQuantity: 50,
				countedBy: TEST_COUNTER_ID
			});

			// Try to validate without counting Product B
			expect(() => inventoryService.validate(inventory.id, TEST_USER_ID)).toThrow(
				'INCOMPLETE_COUNT'
			);
		});
	});

	describe('getById', () => {
		it('should return inventory with items', () => {
			const inventory = inventoryService.createSession({
				warehouseId: TEST_WAREHOUSE_ID,
				createdBy: TEST_USER_ID
			});

			const result = inventoryService.getById(inventory.id);

			expect(result).not.toBeNull();
			expect(result!.id).toBe(inventory.id);
			expect(result!.status).toBe('in_progress');
			expect(result!.items).toBeDefined();
			expect(result!.items).toHaveLength(2);
			expect(result!.items[0].inventoryId).toBe(inventory.id);
		});

		it('should return null for non-existent inventory', () => {
			const result = inventoryService.getById('non-existent-id');
			expect(result).toBeNull();
		});
	});
});
