import { z } from 'zod';

export const createProductSchema = z.object({
	sku: z.string().min(1, 'Le SKU est requis').max(50),
	name: z.string().min(1, 'Le nom est requis').max(255),
	description: z.string().max(1000).optional(),
	categoryId: z.string().nullable().optional(),
	unit: z.string().min(1).max(50).default('unité'),
	purchasePrice: z.number().min(0, 'Le prix doit être positif').default(0),
	salePrice: z.number().min(0, 'Le prix doit être positif').default(0),
	minStock: z.number().int().min(0).default(0)
});

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });

export const updateProductWarehouseSchema = z.object({
	minStock: z.number().int().min(0).nullable()
});

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type UpdateProductWarehouse = z.infer<typeof updateProductWarehouseSchema>;
