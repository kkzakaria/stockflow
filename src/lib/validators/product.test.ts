import { describe, it, expect } from 'vitest';
import { createProductSchema, updateProductSchema, updateProductWarehouseSchema } from './product';

describe('createProductSchema', () => {
	it('should accept valid product', () => {
		const result = createProductSchema.safeParse({
			sku: 'PRD-001',
			name: 'Filtre à huile',
			purchasePrice: 5000,
			salePrice: 7500
		});
		expect(result.success).toBe(true);
	});

	it('should apply defaults', () => {
		const result = createProductSchema.parse({
			sku: 'PRD-001',
			name: 'Filtre'
		});
		expect(result.unit).toBe('unité');
		expect(result.purchasePrice).toBe(0);
		expect(result.salePrice).toBe(0);
		expect(result.minStock).toBe(0);
	});

	it('should reject empty SKU', () => {
		const result = createProductSchema.safeParse({ sku: '', name: 'Test' });
		expect(result.success).toBe(false);
	});

	it('should reject negative price', () => {
		const result = createProductSchema.safeParse({
			sku: 'X',
			name: 'Test',
			purchasePrice: -100
		});
		expect(result.success).toBe(false);
	});
});

describe('updateProductSchema', () => {
	it('should allow partial updates without SKU', () => {
		const result = updateProductSchema.safeParse({ name: 'New name' });
		expect(result.success).toBe(true);
	});
});

describe('updateProductWarehouseSchema', () => {
	it('should accept valid minStock', () => {
		const result = updateProductWarehouseSchema.safeParse({ minStock: 10 });
		expect(result.success).toBe(true);
	});

	it('should accept null minStock', () => {
		const result = updateProductWarehouseSchema.safeParse({ minStock: null });
		expect(result.success).toBe(true);
	});
});
