import { z } from 'zod';

export const createWarehouseSchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(255),
	address: z.string().max(500).optional(),
	contactName: z.string().max(255).optional(),
	contactPhone: z.string().max(50).optional(),
	contactEmail: z.string().email('Email invalide').optional().or(z.literal(''))
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export type CreateWarehouse = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouse = z.infer<typeof updateWarehouseSchema>;
