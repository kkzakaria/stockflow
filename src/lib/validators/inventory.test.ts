import { describe, it, expect } from 'vitest';
import { createInventorySchema, countItemSchema } from './inventory';

describe('createInventorySchema', () => {
	it('should validate a valid inventory session', () => {
		const result = createInventorySchema.safeParse({
			warehouseId: 'wh-001',
			productIds: ['prod-001', 'prod-002']
		});
		expect(result.success).toBe(true);
	});

	it('should accept empty productIds (means all products)', () => {
		const result = createInventorySchema.safeParse({
			warehouseId: 'wh-001'
		});
		expect(result.success).toBe(true);
	});

	it('should reject missing warehouseId', () => {
		const result = createInventorySchema.safeParse({
			productIds: ['prod-001']
		});
		expect(result.success).toBe(false);
	});
});

describe('countItemSchema', () => {
	it('should validate a valid count', () => {
		const result = countItemSchema.safeParse({
			countedQuantity: 42
		});
		expect(result.success).toBe(true);
	});

	it('should accept zero count', () => {
		const result = countItemSchema.safeParse({
			countedQuantity: 0
		});
		expect(result.success).toBe(true);
	});

	it('should reject negative count', () => {
		const result = countItemSchema.safeParse({
			countedQuantity: -5
		});
		expect(result.success).toBe(false);
	});
});
