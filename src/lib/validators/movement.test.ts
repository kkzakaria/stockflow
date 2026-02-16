import { describe, it, expect } from 'vitest';
import { createMovementSchema } from './movement';

describe('createMovementSchema', () => {
	it('should accept valid stock entry with purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'in',
			quantity: 100,
			reason: 'achat',
			purchasePrice: 5000
		});
		expect(result.success).toBe(true);
	});

	it('should reject stock entry without purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'in',
			quantity: 100,
			reason: 'achat'
		});
		expect(result.success).toBe(false);
	});

	it('should accept stock exit without purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'out',
			quantity: 50,
			reason: 'vente'
		});
		expect(result.success).toBe(true);
	});

	it('should reject zero quantity', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'in',
			quantity: 0,
			reason: 'achat',
			purchasePrice: 1000
		});
		expect(result.success).toBe(false);
	});

	it('should reject negative quantity', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'out',
			quantity: -5,
			reason: 'vente'
		});
		expect(result.success).toBe(false);
	});

	it('should require purchase price for adjustment_in', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'adjustment_in',
			quantity: 10,
			reason: 'ajustement'
		});
		expect(result.success).toBe(false);
	});

	it('should accept adjustment_in with purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'adjustment_in',
			quantity: 10,
			reason: 'ajustement',
			purchasePrice: 2000
		});
		expect(result.success).toBe(true);
	});

	it('should accept adjustment_out without purchase price', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'adjustment_out',
			quantity: 5,
			reason: 'perte'
		});
		expect(result.success).toBe(true);
	});

	it('should reject empty productId', () => {
		const result = createMovementSchema.safeParse({
			productId: '',
			warehouseId: 'wh1',
			type: 'out',
			quantity: 1,
			reason: 'vente'
		});
		expect(result.success).toBe(false);
	});

	it('should reject empty warehouseId', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: '',
			type: 'out',
			quantity: 1,
			reason: 'vente'
		});
		expect(result.success).toBe(false);
	});

	it('should reject empty reason', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'out',
			quantity: 1,
			reason: ''
		});
		expect(result.success).toBe(false);
	});

	it('should accept optional reference', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'out',
			quantity: 10,
			reason: 'vente',
			reference: 'CMD-2024-001'
		});
		expect(result.success).toBe(true);
	});

	it('should reject invalid movement type', () => {
		const result = createMovementSchema.safeParse({
			productId: 'p1',
			warehouseId: 'wh1',
			type: 'invalid',
			quantity: 10,
			reason: 'test'
		});
		expect(result.success).toBe(false);
	});
});
