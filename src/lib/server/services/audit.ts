import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type AuditAction = 'create' | 'update' | 'delete' | 'movement' | 'transfer' | 'inventory' | 'login';
export type AuditEntityType = 'product' | 'warehouse' | 'user' | 'movement' | 'transfer' | 'inventory' | 'alert';

export interface AuditLogInput {
	userId: string;
	action: AuditAction;
	entityType: AuditEntityType;
	entityId: string;
	oldValues?: Record<string, unknown>;
	newValues?: Record<string, unknown>;
	ipAddress?: string;
}

export const auditService = {
	log(data: AuditLogInput) {
		const [entry] = db
			.insert(auditLogs)
			.values({
				userId: data.userId,
				action: data.action,
				entityType: data.entityType,
				entityId: data.entityId,
				oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
				newValues: data.newValues ? JSON.stringify(data.newValues) : null,
				ipAddress: data.ipAddress ?? null
			})
			.returning()
			.all();

		return entry;
	},

	getByEntity(entityType: AuditEntityType, entityId: string) {
		return db
			.select()
			.from(auditLogs)
			.where(
				and(
					eq(auditLogs.entityType, entityType),
					eq(auditLogs.entityId, entityId)
				)
			)
			.orderBy(desc(auditLogs.createdAt))
			.all();
	}
};
