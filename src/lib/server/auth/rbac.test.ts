import { describe, it, expect } from 'vitest';
import { requireRole, hasGlobalScope, canWrite, canManage, canApprove } from './rbac';

describe('RBAC helpers', () => {
	describe('requireRole', () => {
		it('should not throw when user has sufficient role', () => {
			expect(() => requireRole('admin', 'manager')).not.toThrow();
		});

		it('should throw 403 when user has insufficient role', () => {
			expect(() => requireRole('viewer', 'manager')).toThrow();
		});

		it('should not throw when roles are equal', () => {
			expect(() => requireRole('manager', 'manager')).not.toThrow();
		});
	});

	describe('hasGlobalScope', () => {
		it('should return true for admin', () => {
			expect(hasGlobalScope('admin')).toBe(true);
		});

		it('should return true for admin_manager', () => {
			expect(hasGlobalScope('admin_manager')).toBe(true);
		});

		it('should return true for admin_viewer', () => {
			expect(hasGlobalScope('admin_viewer')).toBe(true);
		});

		it('should return false for manager', () => {
			expect(hasGlobalScope('manager')).toBe(false);
		});

		it('should return false for user', () => {
			expect(hasGlobalScope('user')).toBe(false);
		});

		it('should return false for viewer', () => {
			expect(hasGlobalScope('viewer')).toBe(false);
		});
	});

	describe('canWrite', () => {
		it('should return true for admin', () => {
			expect(canWrite('admin')).toBe(true);
		});

		it('should return true for user', () => {
			expect(canWrite('user')).toBe(true);
		});

		it('should return false for admin_viewer', () => {
			expect(canWrite('admin_viewer')).toBe(false);
		});

		it('should return false for viewer', () => {
			expect(canWrite('viewer')).toBe(false);
		});
	});

	describe('canManage', () => {
		it('should return true for admin', () => {
			expect(canManage('admin')).toBe(true);
		});

		it('should return true for manager', () => {
			expect(canManage('manager')).toBe(true);
		});

		it('should return false for user', () => {
			expect(canManage('user')).toBe(false);
		});
	});

	describe('canApprove', () => {
		it('should return true for admin', () => {
			expect(canApprove('admin')).toBe(true);
		});

		it('should return true for admin_manager', () => {
			expect(canApprove('admin_manager')).toBe(true);
		});

		it('should return false for manager', () => {
			expect(canApprove('manager')).toBe(false);
		});
	});
});
