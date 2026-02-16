import { z } from 'zod';

export const createCategorySchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(255),
	parentId: z.string().nullable().optional()
});

export const updateCategorySchema = createCategorySchema.partial().refine(
	(data) => Object.values(data).some((v) => v !== undefined),
	{ message: 'Au moins un champ est requis' }
);

export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
