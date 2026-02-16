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
	user,
	userWarehouses
} from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { stockService } from './stock';
import { transferService } from './transfers';
import { alertService } from './alerts';

// Integration test fixtures — unique IDs to avoid collisions
const ADMIN_ID = 'integ-admin-001';
const REQUESTER_ID = 'integ-requester-001';
const SHIPPER_ID = 'integ-shipper-001';
const RECEIVER_ID = 'integ-receiver-001';
const SOURCE_WH_ID = 'integ-wh-src';
const DEST_WH_ID = 'integ-wh-dst';
const PRODUCT_A_ID = 'integ-prod-a';
const PRODUCT_B_ID = 'integ-prod-b';

const ALL_USER_IDS = [ADMIN_ID, REQUESTER_ID, SHIPPER_ID, RECEIVER_ID];

function cleanupTestData() {
	// Delete alerts first (reference transfers, users, products, warehouses)
	for (const uid of ALL_USER_IDS) {
		db.delete(alerts).where(eq(alerts.userId, uid)).run();
	}
	// Scope cleanup to transfers created by this test suite
	const integTransfers = db
		.select({ id: transfers.id })
		.from(transfers)
		.where(
			or(
				eq(transfers.sourceWarehouseId, SOURCE_WH_ID),
				eq(transfers.destinationWarehouseId, DEST_WH_ID)
			)
		)
		.all();
	for (const t of integTransfers) {
		db.delete(alerts).where(eq(alerts.transferId, t.id)).run();
		db.delete(transferItems).where(eq(transferItems.transferId, t.id)).run();
		db.delete(transfers).where(eq(transfers.id, t.id)).run();
	}
	for (const uid of ALL_USER_IDS) {
		db.delete(movements).where(eq(movements.userId, uid)).run();
	}
	db.delete(productWarehouse).where(eq(productWarehouse.warehouseId, SOURCE_WH_ID)).run();
	db.delete(productWarehouse).where(eq(productWarehouse.warehouseId, DEST_WH_ID)).run();
	db.delete(userWarehouses).where(eq(userWarehouses.warehouseId, SOURCE_WH_ID)).run();
	db.delete(userWarehouses).where(eq(userWarehouses.warehouseId, DEST_WH_ID)).run();
	db.delete(products).where(eq(products.id, PRODUCT_A_ID)).run();
	db.delete(products).where(eq(products.id, PRODUCT_B_ID)).run();
	db.delete(warehouses).where(eq(warehouses.id, SOURCE_WH_ID)).run();
	db.delete(warehouses).where(eq(warehouses.id, DEST_WH_ID)).run();
	for (const uid of ALL_USER_IDS) {
		db.delete(user).where(eq(user.id, uid)).run();
	}
}

function seedTestData() {
	cleanupTestData();

	db.insert(user)
		.values([
			{
				id: ADMIN_ID,
				name: 'Integration Admin',
				email: 'integ-admin@test.com',
				role: 'admin',
				isActive: true
			},
			{
				id: REQUESTER_ID,
				name: 'Integration Requester',
				email: 'integ-requester@test.com',
				role: 'manager',
				isActive: true
			},
			{
				id: SHIPPER_ID,
				name: 'Integration Shipper',
				email: 'integ-shipper@test.com',
				role: 'user',
				isActive: true
			},
			{
				id: RECEIVER_ID,
				name: 'Integration Receiver',
				email: 'integ-receiver@test.com',
				role: 'user',
				isActive: true
			}
		])
		.run();

	db.insert(warehouses)
		.values([
			{ id: SOURCE_WH_ID, name: 'Integration Source WH', isActive: true },
			{ id: DEST_WH_ID, name: 'Integration Dest WH', isActive: true }
		])
		.run();

	// Assign receiver to destination warehouse
	db.insert(userWarehouses)
		.values({ userId: RECEIVER_ID, warehouseId: DEST_WH_ID })
		.run();

	db.insert(products)
		.values([
			{
				id: PRODUCT_A_ID,
				sku: 'INTEG-A',
				name: 'Integration Product A',
				purchasePrice: 1000,
				salePrice: 1500,
				minStock: 10,
				isActive: true
			},
			{
				id: PRODUCT_B_ID,
				sku: 'INTEG-B',
				name: 'Integration Product B',
				purchasePrice: 2000,
				salePrice: 3000,
				minStock: 5,
				isActive: true
			}
		])
		.run();

	// Seed source stock: A=100, B=50
	stockService.recordMovement({
		productId: PRODUCT_A_ID,
		warehouseId: SOURCE_WH_ID,
		type: 'in',
		quantity: 100,
		reason: 'achat',
		userId: REQUESTER_ID,
		purchasePrice: 1000
	});
	stockService.recordMovement({
		productId: PRODUCT_B_ID,
		warehouseId: SOURCE_WH_ID,
		type: 'in',
		quantity: 50,
		reason: 'achat',
		userId: REQUESTER_ID,
		purchasePrice: 2000
	});
}

describe('Transfer Integration Tests', () => {
	beforeEach(() => {
		seedTestData();
	});

	describe('full transfer flow: create → approve → ship → receive', () => {
		it('should complete end-to-end transfer with correct stock adjustments', () => {
			// Step 1: Create transfer
			const transfer = transferService.create({
				sourceWarehouseId: SOURCE_WH_ID,
				destinationWarehouseId: DEST_WH_ID,
				requestedBy: REQUESTER_ID,
				items: [
					{ productId: PRODUCT_A_ID, quantityRequested: 20 },
					{ productId: PRODUCT_B_ID, quantityRequested: 10 }
				],
				notes: 'Integration test transfer'
			});
			expect(transfer.status).toBe('pending');

			// Step 2: Approve
			const approved = transferService.approve(transfer.id, ADMIN_ID);
			expect(approved.status).toBe('approved');

			// Step 3: Ship — decrements source stock
			const shipped = transferService.ship(transfer.id, SHIPPER_ID);
			expect(shipped.status).toBe('shipped');

			// Verify source stock decremented
			const srcStockA = stockService.checkMinStock(PRODUCT_A_ID, SOURCE_WH_ID);
			expect(srcStockA!.currentQty).toBe(80); // 100 - 20
			const srcStockB = stockService.checkMinStock(PRODUCT_B_ID, SOURCE_WH_ID);
			expect(srcStockB!.currentQty).toBe(40); // 50 - 10

			// Step 4: Receive — increments destination stock
			const detail = transferService.getById(transfer.id);
			const itemA = detail!.items.find((i) => i.productId === PRODUCT_A_ID)!;
			const itemB = detail!.items.find((i) => i.productId === PRODUCT_B_ID)!;

			const received = transferService.receive(transfer.id, RECEIVER_ID, {
				items: [
					{ transferItemId: itemA.id, quantityReceived: 20 },
					{ transferItemId: itemB.id, quantityReceived: 10 }
				]
			});
			expect(received.status).toBe('received');

			// Verify destination stock incremented
			const dstStockA = stockService.checkMinStock(PRODUCT_A_ID, DEST_WH_ID);
			expect(dstStockA!.currentQty).toBe(20);
			const dstStockB = stockService.checkMinStock(PRODUCT_B_ID, DEST_WH_ID);
			expect(dstStockB!.currentQty).toBe(10);

			// Verify PUMP on destination (should inherit from source)
			const dstPwA = db
				.select()
				.from(productWarehouse)
				.where(
					sql`${productWarehouse.productId} = ${PRODUCT_A_ID} AND ${productWarehouse.warehouseId} = ${DEST_WH_ID}`
				)
				.get();
			expect(dstPwA!.pump).toBe(1000); // Same as source PUMP
		});
	});

	describe('partial receive → dispute → resolve flow', () => {
		it('should handle partial receipt and dispute resolution', () => {
			// Create, approve, ship
			const transfer = transferService.create({
				sourceWarehouseId: SOURCE_WH_ID,
				destinationWarehouseId: DEST_WH_ID,
				requestedBy: REQUESTER_ID,
				items: [{ productId: PRODUCT_A_ID, quantityRequested: 20 }]
			});
			transferService.approve(transfer.id, ADMIN_ID);
			transferService.ship(transfer.id, SHIPPER_ID);

			// Partial receive — only 15 of 20
			const detail = transferService.getById(transfer.id);
			const itemA = detail!.items[0];

			const disputed = transferService.receive(transfer.id, RECEIVER_ID, {
				items: [
					{
						transferItemId: itemA.id,
						quantityReceived: 15,
						anomalyNotes: '5 units damaged in transit'
					}
				]
			});
			expect(disputed.status).toBe('disputed');
			expect(disputed.disputeReason).toContain('Partial receipt');

			// Destination stock should have 15 (received amount)
			const dstStock = stockService.checkMinStock(PRODUCT_A_ID, DEST_WH_ID);
			expect(dstStock!.currentQty).toBe(15);

			// Resolve dispute
			const resolved = transferService.resolveDispute(transfer.id, ADMIN_ID, {
				resolution: 'Written off 5 damaged units',
				adjustStock: false
			});
			expect(resolved.status).toBe('resolved');
			expect(resolved.disputeResolvedBy).toBe(ADMIN_ID);
		});
	});

	describe('alert triggers during transfer lifecycle', () => {
		it('should create alerts for relevant users on state transitions', () => {
			// Clear alerts for our users first
			for (const uid of ALL_USER_IDS) {
				alertService.markAllAsRead(uid);
			}

			// Create and approve transfer
			const transfer = transferService.create({
				sourceWarehouseId: SOURCE_WH_ID,
				destinationWarehouseId: DEST_WH_ID,
				requestedBy: REQUESTER_ID,
				items: [{ productId: PRODUCT_A_ID, quantityRequested: 10 }]
			});

			// Approve should alert the requester
			transferService.approve(transfer.id, ADMIN_ID);
			const requesterAlerts = alertService.getUserAlerts(REQUESTER_ID);
			const approveAlert = requesterAlerts.find(
				(a) => a.type === 'transfer_approved' && a.transferId === transfer.id
			);
			expect(approveAlert).toBeDefined();

			// Ship should alert destination warehouse users and admins
			transferService.ship(transfer.id, SHIPPER_ID);
			const adminAlerts = alertService.getUserAlerts(ADMIN_ID);
			const shipAlert = adminAlerts.find(
				(a) => a.type === 'transfer_shipped' && a.transferId === transfer.id
			);
			expect(shipAlert).toBeDefined();
		});
	});

	describe('stock alert integration', () => {
		it('should create low_stock alert when stock drops below threshold', () => {
			// Record outgoing movement to bring stock below min threshold
			// Product A has minStock=10, current stock=100
			stockService.recordMovement({
				productId: PRODUCT_A_ID,
				warehouseId: SOURCE_WH_ID,
				type: 'out',
				quantity: 95,
				reason: 'vente',
				userId: REQUESTER_ID
			});

			// Check stock is now below threshold
			const stockCheck = stockService.checkMinStock(PRODUCT_A_ID, SOURCE_WH_ID);
			expect(stockCheck!.currentQty).toBe(5);
			expect(stockCheck!.isBelowMin).toBe(true);

			// Manually trigger stock alert (in prod, the API endpoint does this)
			alertService.createStockAlert(
				PRODUCT_A_ID,
				SOURCE_WH_ID,
				stockCheck!.currentQty,
				stockCheck!.threshold
			);

			// Admin should have received a low_stock alert
			const adminAlerts = alertService.getUserAlerts(ADMIN_ID);
			const lowStockAlert = adminAlerts.find(
				(a) =>
					a.type === 'low_stock' &&
					a.productId === PRODUCT_A_ID &&
					a.warehouseId === SOURCE_WH_ID
			);
			expect(lowStockAlert).toBeDefined();
			expect(lowStockAlert!.message).toContain('5');
			expect(lowStockAlert!.message).toContain('10');

			// Deduplication: calling again should NOT create a second alert
			alertService.createStockAlert(
				PRODUCT_A_ID,
				SOURCE_WH_ID,
				stockCheck!.currentQty,
				stockCheck!.threshold
			);
			const adminAlertsAfter = alertService.getUserAlerts(ADMIN_ID);
			const lowStockAlerts = adminAlertsAfter.filter(
				(a) =>
					a.type === 'low_stock' &&
					a.productId === PRODUCT_A_ID &&
					a.warehouseId === SOURCE_WH_ID
			);
			expect(lowStockAlerts).toHaveLength(1);
		});
	});
});
