import { z } from 'zod';

export const MOVEMENT_TYPES = ['in', 'out', 'adjustment_in', 'adjustment_out'] as const;

export const MOVEMENT_REASONS = [
	'achat',
	'vente',
	'retour',
	'perte',
	'ajustement',
	'transfert',
	'autre'
] as const;

export const createMovementSchema = z
	.object({
		productId: z.string().min(1, 'Le produit est requis'),
		warehouseId: z.string().min(1, "L'entrepôt est requis"),
		type: z.enum(MOVEMENT_TYPES),
		quantity: z.number().int().positive('La quantité doit être positive'),
		reason: z.string().min(1, 'Le motif est requis').max(255),
		reference: z.string().max(100).optional(),
		purchasePrice: z.number().min(0).optional()
	})
	.refine(
		(data) => {
			if (data.type === 'in' || data.type === 'adjustment_in') {
				return data.purchasePrice !== undefined && data.purchasePrice >= 0;
			}
			return true;
		},
		{ message: "Le prix d'achat est requis pour les entrées", path: ['purchasePrice'] }
	);

export type CreateMovement = z.infer<typeof createMovementSchema>;
