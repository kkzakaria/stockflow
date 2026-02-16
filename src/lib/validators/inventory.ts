import { z } from 'zod';

export const createInventorySchema = z.object({
	warehouseId: z.string().min(1, "L'entrepôt est requis"),
	productIds: z.array(z.string().min(1)).optional()
});

export const countItemSchema = z.object({
	countedQuantity: z.number().int().min(0, 'La quantité doit être positive ou nulle')
});

export type CreateInventory = z.infer<typeof createInventorySchema>;
export type CountItem = z.infer<typeof countItemSchema>;
