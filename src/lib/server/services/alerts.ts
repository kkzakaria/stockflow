import { db } from '$lib/server/db';
import { alerts, user, userWarehouses } from '$lib/server/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { hasGlobalScope, type Role } from '$lib/server/auth/rbac';

export type AlertType =
	| 'low_stock'
	| 'transfer_pending'
	| 'transfer_approved'
	| 'transfer_shipped'
	| 'transfer_received'
	| 'transfer_dispute'
	| 'inventory_started';

export interface CreateAlertInput {
	type: AlertType;
	userId: string;
	message: string;
	productId?: string;
	warehouseId?: string;
	transferId?: string;
}

export const alertService = {
	createAlert(data: CreateAlertInput) {
		const [alert] = db
			.insert(alerts)
			.values({
				type: data.type,
				userId: data.userId,
				message: data.message,
				productId: data.productId ?? null,
				warehouseId: data.warehouseId ?? null,
				transferId: data.transferId ?? null
			})
			.returning()
			.all();

		return alert;
	},

	getUserAlerts(userId: string, limit = 50, offset = 0) {
		return db
			.select()
			.from(alerts)
			.where(eq(alerts.userId, userId))
			.orderBy(desc(alerts.createdAt))
			.limit(limit)
			.offset(offset)
			.all();
	},

	getUnreadCount(userId: string): number {
		const [result] = db
			.select({ count: count() })
			.from(alerts)
			.where(and(eq(alerts.userId, userId), eq(alerts.isRead, false)))
			.all();

		return result.count;
	},

	markAsRead(alertId: string, userId: string) {
		db.update(alerts)
			.set({
				isRead: true,
				readAt: new Date().toISOString()
			})
			.where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)))
			.run();
	},

	markAllAsRead(userId: string) {
		db.update(alerts)
			.set({
				isRead: true,
				readAt: new Date().toISOString()
			})
			.where(and(eq(alerts.userId, userId), eq(alerts.isRead, false)))
			.run();
	},

	createStockAlert(
		productId: string,
		warehouseId: string,
		currentQty: number,
		threshold: number
	) {
		const message = `Stock bas: quantite ${currentQty} sous le seuil de ${threshold}`;

		// 1. Find all global-scope users (admin, admin_manager, admin_viewer)
		const globalUsers = db
			.select({ id: user.id, role: user.role })
			.from(user)
			.where(eq(user.isActive, true))
			.all()
			.filter((u) => hasGlobalScope(u.role as Role));

		// 2. Find users assigned to the warehouse
		const warehouseUsers = db
			.select({ userId: userWarehouses.userId })
			.from(userWarehouses)
			.where(eq(userWarehouses.warehouseId, warehouseId))
			.all();

		// 3. Combine and deduplicate user IDs
		const targetUserIds = new Set<string>();
		for (const u of globalUsers) {
			targetUserIds.add(u.id);
		}
		for (const uw of warehouseUsers) {
			targetUserIds.add(uw.userId);
		}

		// 4. Create alerts, skipping if unread alert already exists for same product/warehouse/user
		for (const userId of targetUserIds) {
			const existing = db
				.select({ id: alerts.id })
				.from(alerts)
				.where(
					and(
						eq(alerts.userId, userId),
						eq(alerts.type, 'low_stock'),
						eq(alerts.productId, productId),
						eq(alerts.warehouseId, warehouseId),
						eq(alerts.isRead, false)
					)
				)
				.all();

			if (existing.length === 0) {
				this.createAlert({
					type: 'low_stock',
					userId,
					message,
					productId,
					warehouseId
				});
			}
		}
	},

	createTransferAlert(
		transferId: string,
		type: AlertType,
		message: string,
		targetUserIds: string[]
	) {
		for (const userId of targetUserIds) {
			this.createAlert({
				type,
				userId,
				message,
				transferId
			});
		}
	}
};
