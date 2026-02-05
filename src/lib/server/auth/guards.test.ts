import { describe, it, expect } from 'vitest';
import { requireAuth } from './guards';

describe('requireAuth', () => {
	it('should throw 401 when user is null', () => {
		expect(() => requireAuth(null)).toThrow();
	});

	it('should return user when authenticated', () => {
		const mockUser = {
			id: '123',
			role: 'admin',
			name: 'Test',
			email: 'test@test.com',
			emailVerified: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			image: null,
			isActive: true
		};
		expect(requireAuth(mockUser)).toEqual(mockUser);
	});
});
