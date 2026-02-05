import { z } from 'zod';

export const ROLES = [
	'admin',
	'admin_manager',
	'manager',
	'user',
	'admin_viewer',
	'viewer'
] as const;

export const createUserSchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(255),
	email: z.string().email('Email invalide'),
	password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
	role: z.enum(ROLES).default('viewer')
});

export const updateUserSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	role: z.enum(ROLES).optional(),
	isActive: z.boolean().optional()
});

export const assignWarehousesSchema = z.object({
	warehouseIds: z.array(z.string().min(1)).min(0)
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type AssignWarehouses = z.infer<typeof assignWarehousesSchema>;
