import { describe, it, expect } from 'vitest';
import { createCategorySchema, updateCategorySchema } from './category';

describe('createCategorySchema', () => {
	it('should accept valid category', () => {
		const result = createCategorySchema.safeParse({ name: 'Pièces détachées' });
		expect(result.success).toBe(true);
	});

	it('should accept category with parentId', () => {
		const result = createCategorySchema.safeParse({ name: 'Filtres', parentId: 'cat-001' });
		expect(result.success).toBe(true);
	});

	it('should reject empty name', () => {
		const result = createCategorySchema.safeParse({ name: '' });
		expect(result.success).toBe(false);
	});
});

describe('updateCategorySchema', () => {
	it('should accept partial update with name', () => {
		const result = updateCategorySchema.safeParse({ name: 'Nouveau nom' });
		expect(result.success).toBe(true);
	});

	it('should reject empty object', () => {
		const result = updateCategorySchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
