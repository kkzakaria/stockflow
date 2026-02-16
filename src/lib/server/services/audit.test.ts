import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import { auditLogs, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auditService } from './audit';

// Test fixtures
const TEST_USER_ID = 'test-audit-user-001';

function cleanupTestData() {
	db.delete(auditLogs).where(eq(auditLogs.userId, TEST_USER_ID)).run();
	db.delete(user).where(eq(user.id, TEST_USER_ID)).run();
}

function seedTestData() {
	cleanupTestData();

	db.insert(user)
		.values({
			id: TEST_USER_ID,
			name: 'Audit Test User',
			email: 'audit-test@test.com',
			role: 'admin'
		})
		.run();
}

describe('auditService', () => {
	beforeEach(() => {
		seedTestData();
	});

	describe('log', () => {
		it('creates an audit log entry', () => {
			auditService.log({
				userId: TEST_USER_ID,
				action: 'create',
				entityType: 'product',
				entityId: 'prod-001',
				newValues: { name: 'Widget', sku: 'WDG-001' }
			});

			const [entry] = db
				.select()
				.from(auditLogs)
				.where(
					and(
						eq(auditLogs.entityType, 'product'),
						eq(auditLogs.entityId, 'prod-001')
					)
				)
				.all();

			expect(entry).toBeDefined();
			expect(entry.id).toBeDefined();
			expect(entry.userId).toBe(TEST_USER_ID);
			expect(entry.action).toBe('create');
			expect(entry.entityType).toBe('product');
			expect(entry.entityId).toBe('prod-001');
			expect(entry.createdAt).toBeDefined();

			// newValues stored as JSON string, parse it back
			const parsed = JSON.parse(entry.newValues!);
			expect(parsed).toEqual({ name: 'Widget', sku: 'WDG-001' });
		});

		it('stores both old and new values for updates', () => {
			auditService.log({
				userId: TEST_USER_ID,
				action: 'update',
				entityType: 'product',
				entityId: 'prod-002',
				oldValues: { name: 'Old Name', salePrice: 1000 },
				newValues: { name: 'New Name', salePrice: 1500 }
			});

			const [entry] = db
				.select()
				.from(auditLogs)
				.where(
					and(
						eq(auditLogs.entityType, 'product'),
						eq(auditLogs.entityId, 'prod-002')
					)
				)
				.all();

			expect(entry).toBeDefined();
			expect(entry.action).toBe('update');

			const oldParsed = JSON.parse(entry.oldValues!);
			expect(oldParsed).toEqual({ name: 'Old Name', salePrice: 1000 });

			const newParsed = JSON.parse(entry.newValues!);
			expect(newParsed).toEqual({ name: 'New Name', salePrice: 1500 });
		});

		it('stores IP address when provided', () => {
			auditService.log({
				userId: TEST_USER_ID,
				action: 'login',
				entityType: 'user',
				entityId: TEST_USER_ID,
				ipAddress: '192.168.1.100'
			});

			const [entry] = db
				.select()
				.from(auditLogs)
				.where(
					and(
						eq(auditLogs.action, 'login' as typeof entry.action),
						eq(auditLogs.entityId, TEST_USER_ID)
					)
				)
				.all();

			expect(entry).toBeDefined();
			expect(entry.ipAddress).toBe('192.168.1.100');
		});
	});

	describe('getByEntity', () => {
		it('returns logs for specific entity', () => {
			// Create 2 logs for entity A
			auditService.log({
				userId: TEST_USER_ID,
				action: 'create',
				entityType: 'warehouse',
				entityId: 'wh-A'
			});

			auditService.log({
				userId: TEST_USER_ID,
				action: 'update',
				entityType: 'warehouse',
				entityId: 'wh-A',
				oldValues: { name: 'Old' },
				newValues: { name: 'New' }
			});

			// Create 1 log for entity B
			auditService.log({
				userId: TEST_USER_ID,
				action: 'create',
				entityType: 'warehouse',
				entityId: 'wh-B'
			});

			const logsA = auditService.getByEntity('warehouse', 'wh-A');
			const logsB = auditService.getByEntity('warehouse', 'wh-B');

			expect(logsA).toHaveLength(2);
			expect(logsB).toHaveLength(1);

			// Verify both actions are present for entity A
			const actionsA = logsA.map((l) => l.action);
			expect(actionsA).toContain('create');
			expect(actionsA).toContain('update');

			// Verify entity B has the correct log
			expect(logsB[0].action).toBe('create');
			expect(logsB[0].entityId).toBe('wh-B');
		});
	});
});
