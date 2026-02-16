import { describe, it, expect } from 'vitest';
import {
	createTransferSchema,
	receiveTransferSchema,
	rejectTransferSchema,
	resolveDisputeSchema
} from './transfer';

describe('createTransferSchema', () => {
	it('should validate a valid transfer request', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-002',
			items: [{ productId: 'p1', quantityRequested: 10 }],
			notes: 'Urgent restock'
		});
		expect(result.success).toBe(true);
	});

	it('should reject same source and destination', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-001',
			items: [{ productId: 'p1', quantityRequested: 10 }]
		});
		expect(result.success).toBe(false);
	});

	it('should reject empty items array', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-002',
			items: []
		});
		expect(result.success).toBe(false);
	});

	it('should reject zero quantity', () => {
		const result = createTransferSchema.safeParse({
			sourceWarehouseId: 'wh-001',
			destinationWarehouseId: 'wh-002',
			items: [{ productId: 'p1', quantityRequested: 0 }]
		});
		expect(result.success).toBe(false);
	});
});

describe('receiveTransferSchema', () => {
	it('should validate full reception', () => {
		const result = receiveTransferSchema.safeParse({
			items: [{ transferItemId: 'ti-001', quantityReceived: 10 }]
		});
		expect(result.success).toBe(true);
	});

	it('should validate partial reception with anomaly notes', () => {
		const result = receiveTransferSchema.safeParse({
			items: [
				{
					transferItemId: 'ti-001',
					quantityReceived: 5,
					anomalyNotes: '5 items damaged during transport'
				}
			]
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items[0].anomalyNotes).toBe('5 items damaged during transport');
		}
	});
});

describe('rejectTransferSchema', () => {
	it('should reject empty reason', () => {
		const result = rejectTransferSchema.safeParse({
			reason: ''
		});
		expect(result.success).toBe(false);
	});

	it('should validate with a reason', () => {
		const result = rejectTransferSchema.safeParse({
			reason: 'Insufficient stock at source warehouse'
		});
		expect(result.success).toBe(true);
	});
});

describe('resolveDisputeSchema', () => {
	it('should validate resolution with comment', () => {
		const result = resolveDisputeSchema.safeParse({
			resolution: 'Stock adjusted after physical count',
			adjustStock: true
		});
		expect(result.success).toBe(true);
	});

	it('should reject empty resolution comment', () => {
		const result = resolveDisputeSchema.safeParse({
			resolution: '',
			adjustStock: false
		});
		expect(result.success).toBe(false);
	});
});
