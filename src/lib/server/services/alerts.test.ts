import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { alerts, user, warehouses, userWarehouses, products } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { alertService } from './alerts';

// Test fixtures — unique IDs to avoid collisions with other test suites
const TEST_USER_ID = 'test-alert-user-001';
const TEST_USER2_ID = 'test-alert-user-002';
const TEST_ADMIN_ID = 'test-alert-admin-001';
const TEST_ADMIN_MGR_ID = 'test-alert-admin-mgr-001';
const TEST_ADMIN_VIEWER_ID = 'test-alert-admin-viewer-001';
const TEST_WH_USER_ID = 'test-alert-wh-user-001';
const TEST_WAREHOUSE_ID = 'test-alert-wh-001';
const TEST_PRODUCT_ID = 'test-alert-prod-001';

const ALL_TEST_USER_IDS = [
	TEST_USER_ID,
	TEST_USER2_ID,
	TEST_ADMIN_ID,
	TEST_ADMIN_MGR_ID,
	TEST_ADMIN_VIEWER_ID,
	TEST_WH_USER_ID
];

function cleanupTestData() {
	// Delete alerts by userId (our test users)
	for (const uid of ALL_TEST_USER_IDS) {
		db.delete(alerts).where(eq(alerts.userId, uid)).run();
	}
	// Also delete any alerts referencing our test product/warehouse (created for non-test users
	// by createStockAlert picking up other test suite's admin users)
	db.delete(alerts).where(eq(alerts.productId, TEST_PRODUCT_ID)).run();
	db.delete(alerts).where(eq(alerts.warehouseId, TEST_WAREHOUSE_ID)).run();

	db.delete(userWarehouses).where(eq(userWarehouses.warehouseId, TEST_WAREHOUSE_ID)).run();
	for (const uid of ALL_TEST_USER_IDS) {
		db.delete(user).where(eq(user.id, uid)).run();
	}
	db.delete(products).where(eq(products.id, TEST_PRODUCT_ID)).run();
	db.delete(warehouses).where(eq(warehouses.id, TEST_WAREHOUSE_ID)).run();
}

function seedTestData() {
	cleanupTestData();

	// Users with different roles
	db.insert(user)
		.values([
			{ id: TEST_USER_ID, name: 'Alert User 1', email: 'alert-user1@test.com', role: 'user' },
			{ id: TEST_USER2_ID, name: 'Alert User 2', email: 'alert-user2@test.com', role: 'user' },
			{ id: TEST_ADMIN_ID, name: 'Alert Admin', email: 'alert-admin@test.com', role: 'admin' },
			{
				id: TEST_ADMIN_MGR_ID,
				name: 'Alert Admin Mgr',
				email: 'alert-admin-mgr@test.com',
				role: 'admin_manager'
			},
			{
				id: TEST_ADMIN_VIEWER_ID,
				name: 'Alert Admin Viewer',
				email: 'alert-admin-viewer@test.com',
				role: 'admin_viewer'
			},
			{
				id: TEST_WH_USER_ID,
				name: 'Alert WH User',
				email: 'alert-wh-user@test.com',
				role: 'user'
			}
		])
		.run();

	// Warehouse
	db.insert(warehouses)
		.values({ id: TEST_WAREHOUSE_ID, name: 'Alert Test Warehouse' })
		.run();

	// Product
	db.insert(products)
		.values({
			id: TEST_PRODUCT_ID,
			sku: 'TEST-ALERT-001',
			name: 'Alert Test Product',
			minStock: 10
		})
		.run();

	// Assign warehouse user to the warehouse
	db.insert(userWarehouses)
		.values({ userId: TEST_WH_USER_ID, warehouseId: TEST_WAREHOUSE_ID })
		.run();
}

describe('alertService', () => {
	beforeEach(() => {
		seedTestData();
	});

	afterAll(() => {
		cleanupTestData();
	});

	describe('createAlert', () => {
		it('inserts an alert record with correct defaults', () => {
			const alert = alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Stock is low',
				productId: TEST_PRODUCT_ID,
				warehouseId: TEST_WAREHOUSE_ID
			});

			expect(alert).toBeDefined();
			expect(alert.id).toBeDefined();
			expect(alert.type).toBe('low_stock');
			expect(alert.userId).toBe(TEST_USER_ID);
			expect(alert.message).toBe('Stock is low');
			expect(alert.isRead).toBe(false);
			expect(alert.productId).toBe(TEST_PRODUCT_ID);
			expect(alert.warehouseId).toBe(TEST_WAREHOUSE_ID);
			expect(alert.createdAt).toBeDefined();
			expect(alert.readAt).toBeNull();
		});
	});

	describe('getUserAlerts', () => {
		it('returns only alerts for the specific user', () => {
			// Create alerts for user 1
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Alert for user 1'
			});
			alertService.createAlert({
				type: 'transfer_pending',
				userId: TEST_USER_ID,
				message: 'Another alert for user 1'
			});

			// Create alert for user 2
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER2_ID,
				message: 'Alert for user 2'
			});

			const user1Alerts = alertService.getUserAlerts(TEST_USER_ID);
			const user2Alerts = alertService.getUserAlerts(TEST_USER2_ID);

			expect(user1Alerts).toHaveLength(2);
			expect(user2Alerts).toHaveLength(1);

			// All returned alerts belong to the correct user
			for (const a of user1Alerts) {
				expect(a.userId).toBe(TEST_USER_ID);
			}
			expect(user2Alerts[0].userId).toBe(TEST_USER2_ID);
		});
	});

	describe('getUnreadCount', () => {
		it('returns count of unread alerts', () => {
			// Create 3 alerts
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Alert 1'
			});
			const alert2 = alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Alert 2'
			});
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Alert 3'
			});

			// Mark one as read
			alertService.markAsRead(alert2.id, TEST_USER_ID);

			const unreadCount = alertService.getUnreadCount(TEST_USER_ID);
			expect(unreadCount).toBe(2);
		});
	});

	describe('markAsRead', () => {
		it('marks a single alert as read with readAt timestamp', () => {
			const alert = alertService.createAlert({
				type: 'transfer_pending',
				userId: TEST_USER_ID,
				message: 'Pending transfer'
			});

			alertService.markAsRead(alert.id, TEST_USER_ID);

			const [updated] = db
				.select()
				.from(alerts)
				.where(eq(alerts.id, alert.id))
				.all();

			expect(updated.isRead).toBe(true);
			expect(updated.readAt).toBeDefined();
			expect(updated.readAt).not.toBeNull();
		});

		it('does not mark another user\'s alert as read', () => {
			const alert = alertService.createAlert({
				type: 'transfer_pending',
				userId: TEST_USER_ID,
				message: 'Alert owned by user 1'
			});

			// User 2 tries to mark user 1's alert
			alertService.markAsRead(alert.id, TEST_USER2_ID);

			const [unchanged] = db
				.select()
				.from(alerts)
				.where(eq(alerts.id, alert.id))
				.all();

			expect(unchanged.isRead).toBe(false);
			expect(unchanged.readAt).toBeNull();
		});
	});

	describe('markAllAsRead', () => {
		it('marks all unread alerts as read for user', () => {
			// Create 3 unread alerts for user 1
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Alert A'
			});
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Alert B'
			});
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER_ID,
				message: 'Alert C'
			});

			// Create alert for user 2 (should not be affected)
			alertService.createAlert({
				type: 'low_stock',
				userId: TEST_USER2_ID,
				message: 'Alert for user 2'
			});

			alertService.markAllAsRead(TEST_USER_ID);

			const user1Unread = alertService.getUnreadCount(TEST_USER_ID);
			const user2Unread = alertService.getUnreadCount(TEST_USER2_ID);

			expect(user1Unread).toBe(0);
			expect(user2Unread).toBe(1); // User 2's alert remains unread
		});
	});

	describe('createStockAlert', () => {
		it('creates targeted alerts for admins and warehouse-assigned users', () => {
			alertService.createStockAlert(TEST_PRODUCT_ID, TEST_WAREHOUSE_ID, 5, 10);

			// Admin should get an alert
			const adminAlerts = db
				.select()
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, TEST_ADMIN_ID),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, TEST_PRODUCT_ID)
					)
				)
				.all();
			expect(adminAlerts).toHaveLength(1);
			expect(adminAlerts[0].message).toBe(
				'Stock bas: quantite 5 sous le seuil de 10'
			);

			// Admin manager should get an alert
			const mgrAlerts = db
				.select()
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, TEST_ADMIN_MGR_ID),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, TEST_PRODUCT_ID)
					)
				)
				.all();
			expect(mgrAlerts).toHaveLength(1);

			// Admin viewer should get an alert
			const viewerAlerts = db
				.select()
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, TEST_ADMIN_VIEWER_ID),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, TEST_PRODUCT_ID)
					)
				)
				.all();
			expect(viewerAlerts).toHaveLength(1);

			// Warehouse-assigned user should get an alert
			const whUserAlerts = db
				.select()
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, TEST_WH_USER_ID),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, TEST_PRODUCT_ID)
					)
				)
				.all();
			expect(whUserAlerts).toHaveLength(1);

			// Regular user NOT assigned to warehouse should NOT get an alert
			const user1Alerts = db
				.select()
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, TEST_USER_ID),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, TEST_PRODUCT_ID)
					)
				)
				.all();
			expect(user1Alerts).toHaveLength(0);
		});

		it('deduplicates unread alerts for the same product/warehouse/user', () => {
			// Call twice — should only create one alert per user
			alertService.createStockAlert(TEST_PRODUCT_ID, TEST_WAREHOUSE_ID, 5, 10);
			alertService.createStockAlert(TEST_PRODUCT_ID, TEST_WAREHOUSE_ID, 3, 10);

			const adminAlerts = db
				.select()
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, TEST_ADMIN_ID),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, TEST_PRODUCT_ID),
						eq(alerts.warehouseId, TEST_WAREHOUSE_ID)
					)
				)
				.all();

			expect(adminAlerts).toHaveLength(1);
		});
	});
});
