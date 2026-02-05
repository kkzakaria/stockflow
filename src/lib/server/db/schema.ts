import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Helper for generating IDs
const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => nanoid());

const timestamp = (name: string) => text(name);
const createdAt = () => timestamp('created_at').default(sql`(datetime('now'))`);
const updatedAt = () => timestamp('updated_at').default(sql`(datetime('now'))`);

// ============================================================================
// BETTER AUTH TABLES (managed by Better Auth — do not rename columns)
// ============================================================================

export const user = sqliteTable(
	'user',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
		image: text('image'),
		role: text('role', {
			enum: ['admin', 'admin_manager', 'manager', 'user', 'admin_viewer', 'viewer']
		})
			.notNull()
			.default('viewer'),
		isActive: integer('is_active', { mode: 'boolean' }).default(true),
		createdAt: text('created_at').default(sql`(datetime('now'))`),
		updatedAt: text('updated_at').default(sql`(datetime('now'))`)
	},
	(table) => [
		index('idx_user_role').on(table.role),
		index('idx_user_active').on(table.isActive),
		uniqueIndex('idx_user_email').on(table.email)
	]
);

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: text('expires_at').notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: text('access_token_expires_at'),
	refreshTokenExpiresAt: text('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: text('expires_at').notNull(),
	createdAt: text('created_at').default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').default(sql`(datetime('now'))`)
});

// ============================================================================
// BUSINESS TABLES
// ============================================================================

export const warehouses = sqliteTable('warehouses', {
	id: id(),
	name: text('name').notNull(),
	address: text('address'),
	contactName: text('contact_name'),
	contactPhone: text('contact_phone'),
	contactEmail: text('contact_email'),
	isActive: integer('is_active', { mode: 'boolean' }).default(true),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const userWarehouses = sqliteTable(
	'user_warehouses',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		warehouseId: text('warehouse_id')
			.notNull()
			.references(() => warehouses.id, { onDelete: 'cascade' })
	},
	(table) => [
		index('idx_uw_user').on(table.userId),
		index('idx_uw_warehouse').on(table.warehouseId)
	]
);

export const categories = sqliteTable('categories', {
	id: id(),
	name: text('name').notNull(),
	parentId: text('parent_id'),
	createdAt: createdAt()
});

export const products = sqliteTable(
	'products',
	{
		id: id(),
		sku: text('sku').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		categoryId: text('category_id').references(() => categories.id),
		unit: text('unit').notNull().default('unité'),
		purchasePrice: real('purchase_price').default(0),
		salePrice: real('sale_price').default(0),
		minStock: integer('min_stock').default(0),
		isActive: integer('is_active', { mode: 'boolean' }).default(true),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		uniqueIndex('idx_products_sku').on(table.sku),
		index('idx_products_name').on(table.name),
		index('idx_products_category').on(table.categoryId)
	]
);

export const productWarehouse = sqliteTable(
	'product_warehouse',
	{
		productId: text('product_id')
			.notNull()
			.references(() => products.id),
		warehouseId: text('warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		quantity: integer('quantity').default(0),
		minStock: integer('min_stock'),
		pump: real('pump').default(0),
		updatedAt: updatedAt()
	},
	(table) => [
		index('idx_pw_product').on(table.productId),
		index('idx_pw_warehouse').on(table.warehouseId)
	]
);

export const movements = sqliteTable(
	'movements',
	{
		id: id(),
		productId: text('product_id')
			.notNull()
			.references(() => products.id),
		warehouseId: text('warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		type: text('type', {
			enum: ['in', 'out', 'adjustment_in', 'adjustment_out']
		}).notNull(),
		quantity: integer('quantity').notNull(),
		reason: text('reason').notNull(),
		reference: text('reference'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		createdAt: createdAt()
	},
	(table) => [
		index('idx_movements_product').on(table.productId),
		index('idx_movements_warehouse').on(table.warehouseId),
		index('idx_movements_date').on(table.createdAt),
		index('idx_movements_type').on(table.type)
	]
);

export const transfers = sqliteTable(
	'transfers',
	{
		id: id(),
		sourceWarehouseId: text('source_warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		destinationWarehouseId: text('destination_warehouse_id')
			.notNull()
			.references(() => warehouses.id),
		status: text('status', {
			enum: [
				'pending',
				'approved',
				'rejected',
				'shipped',
				'received',
				'partially_received',
				'cancelled',
				'disputed'
			]
		})
			.notNull()
			.default('pending'),
		requestedBy: text('requested_by')
			.notNull()
			.references(() => user.id),
		approvedBy: text('approved_by').references(() => user.id),
		shippedBy: text('shipped_by').references(() => user.id),
		receivedBy: text('received_by').references(() => user.id),
		requestedAt: text('requested_at').default(sql`(datetime('now'))`),
		approvedAt: text('approved_at'),
		rejectedAt: text('rejected_at'),
		shippedAt: text('shipped_at'),
		receivedAt: text('received_at'),
		notes: text('notes'),
		rejectionReason: text('rejection_reason'),
		disputeReason: text('dispute_reason'),
		disputeResolvedBy: text('dispute_resolved_by').references(() => user.id),
		disputeResolvedAt: text('dispute_resolved_at')
	},
	(table) => [
		index('idx_transfers_status').on(table.status),
		index('idx_transfers_source').on(table.sourceWarehouseId),
		index('idx_transfers_dest').on(table.destinationWarehouseId)
	]
);

export const transferItems = sqliteTable('transfer_items', {
	id: id(),
	transferId: text('transfer_id')
		.notNull()
		.references(() => transfers.id, { onDelete: 'cascade' }),
	productId: text('product_id')
		.notNull()
		.references(() => products.id),
	quantityRequested: integer('quantity_requested').notNull(),
	quantitySent: integer('quantity_sent'),
	quantityReceived: integer('quantity_received'),
	anomalyNotes: text('anomaly_notes')
});

export const inventories = sqliteTable('inventories', {
	id: id(),
	warehouseId: text('warehouse_id')
		.notNull()
		.references(() => warehouses.id),
	status: text('status', { enum: ['in_progress', 'validated'] })
		.notNull()
		.default('in_progress'),
	createdBy: text('created_by')
		.notNull()
		.references(() => user.id),
	validatedBy: text('validated_by').references(() => user.id),
	createdAt: createdAt(),
	validatedAt: text('validated_at')
});

export const inventoryItems = sqliteTable('inventory_items', {
	id: id(),
	inventoryId: text('inventory_id')
		.notNull()
		.references(() => inventories.id, { onDelete: 'cascade' }),
	productId: text('product_id')
		.notNull()
		.references(() => products.id),
	systemQuantity: integer('system_quantity').notNull(),
	countedQuantity: integer('counted_quantity'),
	difference: integer('difference'),
	countedBy: text('counted_by').references(() => user.id),
	countedAt: text('counted_at')
});

export const alerts = sqliteTable(
	'alerts',
	{
		id: id(),
		type: text('type', {
			enum: [
				'low_stock',
				'transfer_pending',
				'transfer_approved',
				'transfer_shipped',
				'transfer_received',
				'transfer_dispute',
				'inventory_started'
			]
		}).notNull(),
		productId: text('product_id').references(() => products.id),
		warehouseId: text('warehouse_id').references(() => warehouses.id),
		transferId: text('transfer_id').references(() => transfers.id),
		message: text('message').notNull(),
		isRead: integer('is_read', { mode: 'boolean' }).default(false),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		createdAt: createdAt(),
		readAt: text('read_at')
	},
	(table) => [index('idx_alerts_user').on(table.userId), index('idx_alerts_read').on(table.isRead)]
);

export const auditLogs = sqliteTable(
	'audit_logs',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		action: text('action', {
			enum: ['create', 'update', 'delete', 'movement', 'transfer', 'inventory', 'login']
		}).notNull(),
		entityType: text('entity_type', {
			enum: ['product', 'warehouse', 'user', 'movement', 'transfer', 'inventory', 'alert']
		}).notNull(),
		entityId: text('entity_id').notNull(),
		oldValues: text('old_values'),
		newValues: text('new_values'),
		ipAddress: text('ip_address'),
		createdAt: createdAt()
	},
	(table) => [
		index('idx_logs_user').on(table.userId),
		index('idx_logs_entity').on(table.entityType, table.entityId),
		index('idx_logs_date').on(table.createdAt)
	]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	warehouses: many(userWarehouses),
	movements: many(movements),
	alerts: many(alerts)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

export const warehouseRelations = relations(warehouses, ({ many }) => ({
	users: many(userWarehouses),
	productStock: many(productWarehouse),
	movements: many(movements)
}));

export const userWarehouseRelations = relations(userWarehouses, ({ one }) => ({
	user: one(user, { fields: [userWarehouses.userId], references: [user.id] }),
	warehouse: one(warehouses, { fields: [userWarehouses.warehouseId], references: [warehouses.id] })
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
	parent: one(categories, { fields: [categories.parentId], references: [categories.id] }),
	products: many(products)
}));

export const productRelations = relations(products, ({ one, many }) => ({
	category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
	warehouseStock: many(productWarehouse),
	movements: many(movements)
}));

export const productWarehouseRelations = relations(productWarehouse, ({ one }) => ({
	product: one(products, { fields: [productWarehouse.productId], references: [products.id] }),
	warehouse: one(warehouses, {
		fields: [productWarehouse.warehouseId],
		references: [warehouses.id]
	})
}));

export const movementRelations = relations(movements, ({ one }) => ({
	product: one(products, { fields: [movements.productId], references: [products.id] }),
	warehouse: one(warehouses, { fields: [movements.warehouseId], references: [warehouses.id] }),
	user: one(user, { fields: [movements.userId], references: [user.id] })
}));

export const transferRelations = relations(transfers, ({ one, many }) => ({
	sourceWarehouse: one(warehouses, {
		fields: [transfers.sourceWarehouseId],
		references: [warehouses.id],
		relationName: 'sourceWarehouse'
	}),
	destinationWarehouse: one(warehouses, {
		fields: [transfers.destinationWarehouseId],
		references: [warehouses.id],
		relationName: 'destinationWarehouse'
	}),
	requestedByUser: one(user, {
		fields: [transfers.requestedBy],
		references: [user.id],
		relationName: 'requestedBy'
	}),
	items: many(transferItems)
}));

export const transferItemRelations = relations(transferItems, ({ one }) => ({
	transfer: one(transfers, { fields: [transferItems.transferId], references: [transfers.id] }),
	product: one(products, { fields: [transferItems.productId], references: [products.id] })
}));

export const inventoryRelations = relations(inventories, ({ one, many }) => ({
	warehouse: one(warehouses, { fields: [inventories.warehouseId], references: [warehouses.id] }),
	createdByUser: one(user, { fields: [inventories.createdBy], references: [user.id] }),
	items: many(inventoryItems)
}));

export const inventoryItemRelations = relations(inventoryItems, ({ one }) => ({
	inventory: one(inventories, {
		fields: [inventoryItems.inventoryId],
		references: [inventories.id]
	}),
	product: one(products, { fields: [inventoryItems.productId], references: [products.id] })
}));

export const alertRelations = relations(alerts, ({ one }) => ({
	user: one(user, { fields: [alerts.userId], references: [user.id] }),
	product: one(products, { fields: [alerts.productId], references: [products.id] }),
	warehouse: one(warehouses, { fields: [alerts.warehouseId], references: [warehouses.id] })
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
	user: one(user, { fields: [auditLogs.userId], references: [user.id] })
}));
