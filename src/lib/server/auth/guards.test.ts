import { describe, it, expect } from 'vitest';
import { requireAuth } from './guards';

describe('requireAuth', () => {
	it('should throw 401 when user is null', () => {
		expect(() => requireAuth(null)).toThrow();
	});

	it('should return user when authenticated', () => {
		const mockUser = { id: '123', role: 'admin', name: 'Test', email: 'test@test.com' };
		expect(requireAuth(mockUser as any)).toEqual(mockUser);
	});
});
