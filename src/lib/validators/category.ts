import { z } from 'zod';

export const createCategorySchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(255),
	parentId: z.string().nullable().optional()
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
