import { z } from 'zod';

export const createTransferSchema = z
	.object({
		sourceWarehouseId: z.string().min(1, "L'entrepôt source est requis"),
		destinationWarehouseId: z.string().min(1, "L'entrepôt destination est requis"),
		items: z
			.array(
				z.object({
					productId: z.string().min(1, 'Le produit est requis'),
					quantityRequested: z.number().int().positive('La quantité doit être positive')
				})
			)
			.min(1, 'Au moins un article est requis'),
		notes: z.string().max(1000).optional()
	})
	.refine((data) => data.sourceWarehouseId !== data.destinationWarehouseId, {
		message: "L'entrepôt source et destination doivent être différents",
		path: ['destinationWarehouseId']
	});

export const receiveTransferSchema = z.object({
	items: z
		.array(
			z.object({
				transferItemId: z.string().min(1, "L'article de transfert est requis"),
				quantityReceived: z.number().int().min(0, 'La quantité reçue doit être >= 0'),
				anomalyNotes: z.string().max(1000).optional()
			})
		)
		.min(1, 'Au moins un article est requis')
});

export const rejectTransferSchema = z.object({
	reason: z.string().min(1, 'Le motif de rejet est requis').max(1000)
});

export const resolveDisputeSchema = z.object({
	resolution: z.string().min(1, 'La résolution est requise').max(2000),
	adjustStock: z.boolean()
});

export type CreateTransfer = z.infer<typeof createTransferSchema>;
export type ReceiveTransfer = z.infer<typeof receiveTransferSchema>;
export type RejectTransfer = z.infer<typeof rejectTransferSchema>;
export type ResolveDispute = z.infer<typeof resolveDisputeSchema>;
