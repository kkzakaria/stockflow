import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import {
	alerts,
	products,
	warehouses,
	productWarehouse,
	movements,
	transfers,
	transferItems,
	user
} from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { stockService } from './stock';
import { transferService } from './transfers';

// Test fixtures
const TEST_USER_ID = 'trf-test-user-001';
const TEST_APPROVER_ID = 'trf-test-user-002';
const TEST_SHIPPER_ID = 'trf-test-user-003';
const TEST_RECEIVER_ID = 'trf-test-user-004';
const TEST_SOURCE_WH_ID = 'trf-test-wh-src';
const TEST_DEST_WH_ID = 'trf-test-wh-dst';
const TEST_PRODUCT_A_ID = 'trf-test-prod-a';
const TEST_PRODUCT_B_ID = 'trf-test-prod-b';

function cleanupTestData() {
	// Order matters: delete child rows first due to FK constraints
	// Delete ALL alerts that reference transfers (since we delete all transfers below)
	// Alert integration creates alerts for ALL admin users, not just test users
	db.delete(alerts)
		.where(
			or(
				eq(alerts.userId, TEST_USER_ID),
				eq(alerts.userId, TEST_APPROVER_ID),
				eq(alerts.userId, TEST_SHIPPER_ID),
				eq(alerts.userId, TEST_RECEIVER_ID),
				sql`${alerts.transferId} IS NOT NULL`
			)
		)
		.run();
	db.delete(transferItems).run();
	db.delete(transfers).run();
	db.delete(movements).where(eq(movements.userId, TEST_USER_ID)).run();
	db.delete(movements).where(eq(movements.userId, TEST_SHIPPER_ID)).run();
	db.delete(movements).where(eq(movements.userId, TEST_RECEIVER_ID)).run();
	db.delete(productWarehouse)
		.where(eq(productWarehouse.warehouseId, TEST_SOURCE_WH_ID))
		.run();
	db.delete(productWarehouse)
		.where(eq(productWarehouse.warehouseId, TEST_DEST_WH_ID))
		.run();
	db.delete(products).where(eq(products.id, TEST_PRODUCT_A_ID)).run();
	db.delete(products).where(eq(products.id, TEST_PRODUCT_B_ID)).run();
	db.delete(warehouses).where(eq(warehouses.id, TEST_SOURCE_WH_ID)).run();
	db.delete(warehouses).where(eq(warehouses.id, TEST_DEST_WH_ID)).run();
	db.delete(user).where(eq(user.id, TEST_USER_ID)).run();
	db.delete(user).where(eq(user.id, TEST_APPROVER_ID)).run();
	db.delete(user).where(eq(user.id, TEST_SHIPPER_ID)).run();
	db.delete(user).where(eq(user.id, TEST_RECEIVER_ID)).run();
}

function seedTestData() {
	cleanupTestData();

	// Create users
	db.insert(user)
		.values([
			{ id: TEST_USER_ID, name: 'Requester', email: 'trf-requester@test.com', role: 'user' },
			{
				id: TEST_APPROVER_ID,
				name: 'Approver',
				email: 'trf-approver@test.com',
				role: 'manager'
			},
			{ id: TEST_SHIPPER_ID, name: 'Shipper', email: 'trf-shipper@test.com', role: 'user' },
			{ id: TEST_RECEIVER_ID, name: 'Receiver', email: 'trf-receiver@test.com', role: 'user' }
		])
		.run();

	// Create warehouses
	db.insert(warehouses)
		.values([
			{ id: TEST_SOURCE_WH_ID, name: 'Source Warehouse' },
			{ id: TEST_DEST_WH_ID, name: 'Destination Warehouse' }
		])
		.run();

	// Create products
	db.insert(products)
		.values([
			{
				id: TEST_PRODUCT_A_ID,
				sku: 'TRF-TEST-A',
				name: 'Product A',
				purchasePrice: 1000,
				salePrice: 1500
			},
			{
				id: TEST_PRODUCT_B_ID,
				sku: 'TRF-TEST-B',
				name: 'Product B',
				purchasePrice: 2000,
				salePrice: 3000
			}
		])
		.run();

	// Seed source warehouse stock: Product A = 100, Product B = 50
	stockService.recordMovement({
		productId: TEST_PRODUCT_A_ID,
		warehouseId: TEST_SOURCE_WH_ID,
		type: 'in',
		quantity: 100,
		reason: 'achat',
		userId: TEST_USER_ID,
		purchasePrice: 1000
	});

	stockService.recordMovement({
		productId: TEST_PRODUCT_B_ID,
		warehouseId: TEST_SOURCE_WH_ID,
		type: 'in',
		quantity: 50,
		reason: 'achat',
		userId: TEST_USER_ID,
		purchasePrice: 2000
	});
}

describe('transferService', () => {
	beforeEach(() => {
		seedTestData();
	});

	describe('create', () => {
		it('should create a pending transfer with items', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [
					{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 },
					{ productId: TEST_PRODUCT_B_ID, quantityRequested: 5 }
				],
				notes: 'Urgent transfer'
			});

			expect(transfer).toBeDefined();
			expect(transfer.id).toBeDefined();
			expect(transfer.status).toBe('pending');
			expect(transfer.sourceWarehouseId).toBe(TEST_SOURCE_WH_ID);
			expect(transfer.destinationWarehouseId).toBe(TEST_DEST_WH_ID);
			expect(transfer.requestedBy).toBe(TEST_USER_ID);
			expect(transfer.notes).toBe('Urgent transfer');

			// Check items were created
			const result = transferService.getById(transfer.id);
			expect(result).not.toBeNull();
			expect(result!.items).toHaveLength(2);
			expect(result!.items[0].quantityRequested).toBe(10);
			expect(result!.items[1].quantityRequested).toBe(5);
		});
	});

	describe('approve', () => {
		it('should change status from pending to approved', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			const approved = transferService.approve(transfer.id, TEST_APPROVER_ID);

			expect(approved.status).toBe('approved');
			expect(approved.approvedBy).toBe(TEST_APPROVER_ID);
			expect(approved.approvedAt).toBeDefined();
		});
	});

	describe('reject', () => {
		it('should change status from pending to rejected with reason', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			const rejected = transferService.reject(
				transfer.id,
				TEST_APPROVER_ID,
				'Stock not available at source'
			);

			expect(rejected.status).toBe('rejected');
			expect(rejected.rejectionReason).toBe('Stock not available at source');
			expect(rejected.rejectedAt).toBeDefined();
		});
	});

	describe('ship', () => {
		it('should decrement source stock and set status to shipped', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [
					{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 },
					{ productId: TEST_PRODUCT_B_ID, quantityRequested: 5 }
				]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);
			const shipped = transferService.ship(transfer.id, TEST_SHIPPER_ID);

			expect(shipped.status).toBe('shipped');
			expect(shipped.shippedBy).toBe(TEST_SHIPPER_ID);
			expect(shipped.shippedAt).toBeDefined();

			// Check source stock was decremented
			const stockA = stockService.getStockByWarehouse(TEST_PRODUCT_A_ID);
			const sourceA = stockA.find((s) => s.warehouseId === TEST_SOURCE_WH_ID);
			expect(sourceA!.quantity).toBe(90); // 100 - 10

			const stockB = stockService.getStockByWarehouse(TEST_PRODUCT_B_ID);
			const sourceB = stockB.find((s) => s.warehouseId === TEST_SOURCE_WH_ID);
			expect(sourceB!.quantity).toBe(45); // 50 - 5

			// Check transfer items have quantitySent set
			const result = transferService.getById(transfer.id);
			expect(result!.items[0].quantitySent).toBe(10);
			expect(result!.items[1].quantitySent).toBe(5);
		});

		it('should throw INSUFFICIENT_STOCK when not enough stock', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 999 }]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);

			expect(() => transferService.ship(transfer.id, TEST_SHIPPER_ID)).toThrow(
				'INSUFFICIENT_STOCK'
			);
		});
	});

	describe('receive', () => {
		it('should increment destination stock and set status to received (full)', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [
					{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 },
					{ productId: TEST_PRODUCT_B_ID, quantityRequested: 5 }
				]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);
			transferService.ship(transfer.id, TEST_SHIPPER_ID);

			const result = transferService.getById(transfer.id);
			const itemA = result!.items.find((i) => i.productId === TEST_PRODUCT_A_ID)!;
			const itemB = result!.items.find((i) => i.productId === TEST_PRODUCT_B_ID)!;

			const received = transferService.receive(transfer.id, TEST_RECEIVER_ID, {
				items: [
					{ transferItemId: itemA.id, quantityReceived: 10 },
					{ transferItemId: itemB.id, quantityReceived: 5 }
				]
			});

			expect(received.status).toBe('received');
			expect(received.receivedBy).toBe(TEST_RECEIVER_ID);
			expect(received.receivedAt).toBeDefined();

			// Check destination stock was incremented
			const stockA = stockService.getStockByWarehouse(TEST_PRODUCT_A_ID);
			const destA = stockA.find((s) => s.warehouseId === TEST_DEST_WH_ID);
			expect(destA!.quantity).toBe(10);

			const stockB = stockService.getStockByWarehouse(TEST_PRODUCT_B_ID);
			const destB = stockB.find((s) => s.warehouseId === TEST_DEST_WH_ID);
			expect(destB!.quantity).toBe(5);
		});

		it('should auto-transition to disputed on partial receive', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);
			transferService.ship(transfer.id, TEST_SHIPPER_ID);

			const result = transferService.getById(transfer.id);
			const itemA = result!.items[0];

			const received = transferService.receive(transfer.id, TEST_RECEIVER_ID, {
				items: [
					{
						transferItemId: itemA.id,
						quantityReceived: 7,
						anomalyNotes: 'Only 7 units found in package'
					}
				]
			});

			// Should auto-transition from partially_received to disputed
			expect(received.status).toBe('disputed');
			expect(received.disputeReason).toBeDefined();

			// Destination stock should still be incremented for what was received
			const stockA = stockService.getStockByWarehouse(TEST_PRODUCT_A_ID);
			const destA = stockA.find((s) => s.warehouseId === TEST_DEST_WH_ID);
			expect(destA!.quantity).toBe(7);
		});
	});

	describe('cancel', () => {
		it('should cancel from pending status', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			const cancelled = transferService.cancel(transfer.id, TEST_USER_ID);

			expect(cancelled.status).toBe('cancelled');
		});

		it('should cancel from approved status', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);
			const cancelled = transferService.cancel(transfer.id, TEST_USER_ID);

			expect(cancelled.status).toBe('cancelled');
		});

		it('should throw INVALID_TRANSITION when cancelling after shipped', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);
			transferService.ship(transfer.id, TEST_SHIPPER_ID);

			expect(() => transferService.cancel(transfer.id, TEST_USER_ID)).toThrow(
				'INVALID_TRANSITION'
			);
		});
	});

	describe('resolveDispute', () => {
		it('should set resolved status on disputed transfer', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);
			transferService.ship(transfer.id, TEST_SHIPPER_ID);

			const result = transferService.getById(transfer.id);
			const itemA = result!.items[0];

			// Partial receive → auto-dispute
			transferService.receive(transfer.id, TEST_RECEIVER_ID, {
				items: [{ transferItemId: itemA.id, quantityReceived: 7 }]
			});

			const resolved = transferService.resolveDispute(transfer.id, TEST_APPROVER_ID, {
				resolution: 'Accepted 7 units, 3 units lost in transit — supplier compensated',
				adjustStock: false
			});

			expect(resolved.status).toBe('resolved');
			expect(resolved.disputeResolvedBy).toBe(TEST_APPROVER_ID);
			expect(resolved.disputeResolvedAt).toBeDefined();
			expect(resolved.notes).toContain(
				'Accepted 7 units, 3 units lost in transit — supplier compensated'
			);
		});
	});

	describe('invalid transitions', () => {
		it('should throw INVALID_TRANSITION for approved → received (skipping ship)', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			transferService.approve(transfer.id, TEST_APPROVER_ID);

			const result = transferService.getById(transfer.id);
			const itemA = result!.items[0];

			expect(() =>
				transferService.receive(transfer.id, TEST_RECEIVER_ID, {
					items: [{ transferItemId: itemA.id, quantityReceived: 10 }]
				})
			).toThrow('INVALID_TRANSITION');
		});

		it('should throw INVALID_TRANSITION for shipping a pending transfer', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			expect(() => transferService.ship(transfer.id, TEST_SHIPPER_ID)).toThrow(
				'INVALID_TRANSITION'
			);
		});
	});

	describe('list', () => {
		it('should list transfers filtered by status', () => {
			transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			const t2 = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_B_ID, quantityRequested: 5 }]
			});

			transferService.approve(t2.id, TEST_APPROVER_ID);

			const pending = transferService.list({ status: 'pending' });
			expect(pending).toHaveLength(1);

			const approved = transferService.list({ status: 'approved' });
			expect(approved).toHaveLength(1);
			expect(approved[0].id).toBe(t2.id);
		});

		it('should list transfers filtered by warehouseId (source OR destination)', () => {
			transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 }]
			});

			const bySource = transferService.list({ warehouseId: TEST_SOURCE_WH_ID });
			expect(bySource.length).toBeGreaterThanOrEqual(1);

			const byDest = transferService.list({ warehouseId: TEST_DEST_WH_ID });
			expect(byDest.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('getById', () => {
		it('should return null for non-existent transfer', () => {
			const result = transferService.getById('non-existent-id');
			expect(result).toBeNull();
		});

		it('should return transfer with items', () => {
			const transfer = transferService.create({
				sourceWarehouseId: TEST_SOURCE_WH_ID,
				destinationWarehouseId: TEST_DEST_WH_ID,
				requestedBy: TEST_USER_ID,
				items: [
					{ productId: TEST_PRODUCT_A_ID, quantityRequested: 10 },
					{ productId: TEST_PRODUCT_B_ID, quantityRequested: 5 }
				]
			});

			const result = transferService.getById(transfer.id);

			expect(result).not.toBeNull();
			expect(result!.id).toBe(transfer.id);
			expect(result!.items).toHaveLength(2);
		});
	});
});
