/**
 * Seed script for StockFlow demo data.
 *
 * WARNING: This script deletes ALL existing data before inserting demo data.
 * Do not run against a production database.
 *
 * Usage: pnpm db:seed
 * (or manually: DATABASE_URL=local.db npx tsx scripts/seed.ts)
 *
 * Requires: dev server running on localhost:5173 (for user creation via Better Auth API).
 * Users are created through the API because Better Auth manages password hashing
 * and account/session setup that cannot be easily replicated with raw SQL.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { nanoid } from 'nanoid';
import * as schema from '../src/lib/server/db/schema';

// ---------------------------------------------------------------------------
// DB setup (standalone — no SvelteKit context)
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('ERROR: DATABASE_URL env var is required. Run with: DATABASE_URL=local.db npx tsx scripts/seed.ts');
	process.exit(1);
}

const sqlite = new Database(DATABASE_URL);
sqlite.pragma('foreign_keys = ON');

// Patch Statement prototype for Date/boolean coercion (duplicated from src/lib/server/db/index.ts).
// If you modify this logic, update the other copy as well.
const dummyStmt = sqlite.prepare('SELECT 1');
const StmtProto = Object.getPrototypeOf(dummyStmt);

function coerce(v: unknown): unknown {
	if (typeof v === 'boolean') return v ? 1 : 0;
	if (v instanceof Date) return v.toISOString();
	return v;
}

for (const method of ['run', 'get', 'all', 'bind'] as const) {
	const original = StmtProto[method];
	if (!original || typeof original !== 'function') continue;
	StmtProto[method] = function (...args: unknown[]) {
		const coerced = args.map(coerce);
		return original.apply(this, coerced);
	};
}

const db = drizzle(sqlite, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEV_SERVER = 'http://localhost:5173';
const now = new Date().toISOString();

function ago(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString();
}

// ---------------------------------------------------------------------------
// 1. Clean existing data (FKs disabled during deletion)
// ---------------------------------------------------------------------------

function cleanDatabase() {
	console.log('Cleaning existing data...');
	const tables = [
		'audit_logs',
		'alerts',
		'inventory_items',
		'inventories',
		'transfer_items',
		'transfers',
		'movements',
		'product_warehouse',
		'user_warehouses',
		'products',
		'categories',
		'warehouses',
		'verification',
		'account',
		'session',
		'user'
	];
	sqlite.pragma('foreign_keys = OFF');
	try {
		for (const table of tables) {
			sqlite.exec(`DELETE FROM "${table}"`);
		}
	} finally {
		sqlite.pragma('foreign_keys = ON');
	}
	console.log('  Done.');
}

// ---------------------------------------------------------------------------
// 2. Create users via Better Auth API
// ---------------------------------------------------------------------------

interface UserDef {
	name: string;
	email: string;
	role: string;
	password: string;
}

const USERS: UserDef[] = [
	{ name: 'Karim Diallo', email: 'karim@stockflow.com', role: 'admin', password: 'password123' },
	{
		name: 'Fatou Sow',
		email: 'fatou@stockflow.com',
		role: 'admin_manager',
		password: 'password123'
	},
	{ name: 'Moussa Traoré', email: 'moussa@stockflow.com', role: 'manager', password: 'password123' },
	{ name: 'Aminata Koné', email: 'aminata@stockflow.com', role: 'user', password: 'password123' },
	{
		name: 'Ibrahim Bah',
		email: 'ibrahim@stockflow.com',
		role: 'admin_viewer',
		password: 'password123'
	},
	{ name: 'Aïssatou Diop', email: 'aissatou@stockflow.com', role: 'viewer', password: 'password123' }
];

async function createUsers(): Promise<Record<string, string>> {
	console.log('Creating users via Better Auth API...');
	const userIds: Record<string, string> = {};

	for (const u of USERS) {
		const res = await fetch(`${DEV_SERVER}/api/auth/sign-up/email`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: DEV_SERVER
			},
			body: JSON.stringify({ name: u.name, email: u.email, password: u.password })
		});

		if (!res.ok) {
			const text = await res.text();
			console.error(`  Failed to create user ${u.email}: ${res.status} ${text}`);
			process.exit(1);
		}

		const data = (await res.json()) as { user?: { id: string } };
		const userId = data.user?.id;
		if (!userId) {
			console.error(`  No user ID returned for ${u.email}`);
			process.exit(1);
		}

		// Update role via direct SQL (Better Auth API doesn't support custom fields on sign-up)
		const roleResult = sqlite
			.prepare(`UPDATE "user" SET role = ? WHERE id = ?`)
			.run(u.role, userId);
		if (roleResult.changes === 0) {
			console.error(`  ERROR: Failed to update role for user ${userId} (${u.email})`);
			process.exit(1);
		}

		userIds[u.email] = userId;
		console.log(`  Created ${u.name} (${u.role}) -> ${userId}`);
	}

	return userIds;
}

// ---------------------------------------------------------------------------
// 3. Warehouses
// ---------------------------------------------------------------------------

interface WarehouseDef {
	key: string;
	name: string;
	address: string;
	contactName: string;
	contactPhone: string;
}

const WAREHOUSES: WarehouseDef[] = [
	{
		key: 'dakar_centre',
		name: 'Entrepôt Dakar Centre',
		address: '12 Rue Félix Faure, Dakar',
		contactName: 'Ousmane Ndiaye',
		contactPhone: '+221 33 821 12 34'
	},
	{
		key: 'dakar_port',
		name: 'Entrepôt Dakar Port',
		address: 'Zone Portuaire, Môle 2, Dakar',
		contactName: 'Cheikh Fall',
		contactPhone: '+221 33 849 56 78'
	},
	{
		key: 'thies',
		name: 'Entrepôt Thiès',
		address: 'Route Nationale 2, Zone Industrielle, Thiès',
		contactName: 'Abdoulaye Diop',
		contactPhone: '+221 33 951 23 45'
	},
	{
		key: 'saint_louis',
		name: 'Entrepôt Saint-Louis',
		address: 'Quartier Nord, Avenue Dodds, Saint-Louis',
		contactName: 'Mamadou Ba',
		contactPhone: '+221 33 961 67 89'
	}
];

function insertWarehouses(): Record<string, string> {
	console.log('Inserting warehouses...');
	const ids: Record<string, string> = {};

	for (const w of WAREHOUSES) {
		const id = nanoid();
		db.insert(schema.warehouses)
			.values({
				id,
				name: w.name,
				address: w.address,
				contactName: w.contactName,
				contactPhone: w.contactPhone,
				isActive: true
			})
			.run();
		ids[w.key] = id;
		console.log(`  ${w.name} -> ${id}`);
	}

	return ids;
}

// ---------------------------------------------------------------------------
// 4. User-Warehouse assignments
// ---------------------------------------------------------------------------

function insertUserWarehouses(
	userIds: Record<string, string>,
	warehouseIds: Record<string, string>
) {
	console.log('Assigning users to warehouses...');

	const assignments = [
		{ email: 'moussa@stockflow.com', warehouses: ['dakar_centre', 'dakar_port'] },
		{ email: 'aminata@stockflow.com', warehouses: ['dakar_centre', 'thies'] },
		{ email: 'aissatou@stockflow.com', warehouses: ['saint_louis'] }
	];

	for (const a of assignments) {
		for (const wKey of a.warehouses) {
			db.insert(schema.userWarehouses)
				.values({ userId: userIds[a.email], warehouseId: warehouseIds[wKey] })
				.run();
		}
		console.log(`  ${a.email} -> ${a.warehouses.join(', ')}`);
	}
}

// ---------------------------------------------------------------------------
// 5. Categories
// ---------------------------------------------------------------------------

function insertCategories(): Record<string, string> {
	console.log('Inserting categories...');
	const ids: Record<string, string> = {};

	const parents = [
		{ key: 'construction', name: 'Matériaux de construction' },
		{ key: 'plomberie', name: 'Plomberie' },
		{ key: 'electricite', name: 'Électricité' },
		{ key: 'peinture', name: 'Peinture' },
		{ key: 'quincaillerie', name: 'Quincaillerie' }
	];

	for (const c of parents) {
		const id = nanoid();
		db.insert(schema.categories).values({ id, name: c.name }).run();
		ids[c.key] = id;
		console.log(`  ${c.name} -> ${id}`);
	}

	// Sub-categories under "Matériaux de construction"
	const subs = [
		{ key: 'ciment', name: 'Ciment', parentKey: 'construction' },
		{ key: 'acier', name: 'Acier', parentKey: 'construction' },
		{ key: 'bois', name: 'Bois', parentKey: 'construction' }
	];

	for (const c of subs) {
		const id = nanoid();
		db.insert(schema.categories)
			.values({ id, name: c.name, parentId: ids[c.parentKey] })
			.run();
		ids[c.key] = id;
		console.log(`  ${c.name} (sub of ${c.parentKey}) -> ${id}`);
	}

	return ids;
}

// ---------------------------------------------------------------------------
// 6. Products
// ---------------------------------------------------------------------------

interface ProductDef {
	key: string;
	sku: string;
	name: string;
	categoryKey: string;
	unit: string;
	purchasePrice: number;
	salePrice: number;
	minStock: number;
}

const PRODUCTS: ProductDef[] = [
	{
		key: 'ciment_cem2',
		sku: 'CIM-001',
		name: 'Ciment CEM II 42.5 (50kg)',
		categoryKey: 'ciment',
		unit: 'sac',
		purchasePrice: 4200,
		salePrice: 5500,
		minStock: 100
	},
	{
		key: 'ciment_cem1',
		sku: 'CIM-002',
		name: 'Ciment CEM I 52.5 (50kg)',
		categoryKey: 'ciment',
		unit: 'sac',
		purchasePrice: 5000,
		salePrice: 6500,
		minStock: 50
	},
	{
		key: 'barre_acier_10',
		sku: 'ACI-001',
		name: 'Barre acier HA 10mm (12m)',
		categoryKey: 'acier',
		unit: 'barre',
		purchasePrice: 3500,
		salePrice: 4800,
		minStock: 200
	},
	{
		key: 'barre_acier_12',
		sku: 'ACI-002',
		name: 'Barre acier HA 12mm (12m)',
		categoryKey: 'acier',
		unit: 'barre',
		purchasePrice: 5200,
		salePrice: 6800,
		minStock: 150
	},
	{
		key: 'planche_pin',
		sku: 'BOI-001',
		name: 'Planche pin 4m x 20cm',
		categoryKey: 'bois',
		unit: 'planche',
		purchasePrice: 2800,
		salePrice: 3800,
		minStock: 50
	},
	{
		key: 'contreplaque',
		sku: 'BOI-002',
		name: 'Contreplaqué 244x122cm 15mm',
		categoryKey: 'bois',
		unit: 'panneau',
		purchasePrice: 8500,
		salePrice: 11000,
		minStock: 20
	},
	{
		key: 'tuyau_pvc_100',
		sku: 'PLB-001',
		name: 'Tuyau PVC 100mm (4m)',
		categoryKey: 'plomberie',
		unit: 'tube',
		purchasePrice: 6500,
		salePrice: 8500,
		minStock: 30
	},
	{
		key: 'coude_pvc',
		sku: 'PLB-002',
		name: 'Coude PVC 90° 100mm',
		categoryKey: 'plomberie',
		unit: 'pièce',
		purchasePrice: 1200,
		salePrice: 1800,
		minStock: 50
	},
	{
		key: 'cable_2_5',
		sku: 'ELE-001',
		name: 'Câble électrique 2.5mm² (100m)',
		categoryKey: 'electricite',
		unit: 'rouleau',
		purchasePrice: 15000,
		salePrice: 19500,
		minStock: 15
	},
	{
		key: 'disjoncteur_20a',
		sku: 'ELE-002',
		name: 'Disjoncteur 20A monophasé',
		categoryKey: 'electricite',
		unit: 'pièce',
		purchasePrice: 4500,
		salePrice: 6200,
		minStock: 20
	},
	{
		key: 'peinture_blanche',
		sku: 'PEI-001',
		name: 'Peinture vinylique blanche 15L',
		categoryKey: 'peinture',
		unit: 'seau',
		purchasePrice: 12000,
		salePrice: 16000,
		minStock: 10
	},
	{
		key: 'peinture_ext',
		sku: 'PEI-002',
		name: 'Peinture façade extérieure 15L',
		categoryKey: 'peinture',
		unit: 'seau',
		purchasePrice: 18000,
		salePrice: 24000,
		minStock: 8
	},
	{
		key: 'vis_50mm',
		sku: 'QUI-001',
		name: 'Vis à bois 5x50mm (boîte 200)',
		categoryKey: 'quincaillerie',
		unit: 'boîte',
		purchasePrice: 3200,
		salePrice: 4500,
		minStock: 25
	},
	{
		key: 'charniere',
		sku: 'QUI-002',
		name: 'Charnière inox 100mm (paire)',
		categoryKey: 'quincaillerie',
		unit: 'paire',
		purchasePrice: 1800,
		salePrice: 2600,
		minStock: 30
	},
	{
		key: 'cadenas',
		sku: 'QUI-003',
		name: 'Cadenas laiton 50mm',
		categoryKey: 'quincaillerie',
		unit: 'pièce',
		purchasePrice: 2500,
		salePrice: 3500,
		minStock: 20
	}
];

function insertProducts(
	categoryIds: Record<string, string>
): Record<string, { id: string; def: ProductDef }> {
	console.log('Inserting products...');
	const result: Record<string, { id: string; def: ProductDef }> = {};

	for (const p of PRODUCTS) {
		const id = nanoid();
		db.insert(schema.products)
			.values({
				id,
				sku: p.sku,
				name: p.name,
				categoryId: categoryIds[p.categoryKey],
				unit: p.unit,
				purchasePrice: p.purchasePrice,
				salePrice: p.salePrice,
				minStock: p.minStock,
				isActive: true
			})
			.run();
		result[p.key] = { id, def: p };
		console.log(`  ${p.sku} ${p.name} -> ${id}`);
	}

	return result;
}

// ---------------------------------------------------------------------------
// 7. Stock initialization (product_warehouse + movements)
// ---------------------------------------------------------------------------

// [productKey, warehouseKey, quantity]
type StockEntry = [string, string, number];

const STOCK_LEVELS: StockEntry[] = [
	// Dakar Centre — well stocked
	['ciment_cem2', 'dakar_centre', 350],
	['ciment_cem1', 'dakar_centre', 120],
	['barre_acier_10', 'dakar_centre', 500],
	['barre_acier_12', 'dakar_centre', 300],
	['planche_pin', 'dakar_centre', 80],
	['contreplaque', 'dakar_centre', 45],
	['tuyau_pvc_100', 'dakar_centre', 60],
	['coude_pvc', 'dakar_centre', 120],
	['cable_2_5', 'dakar_centre', 25],
	['disjoncteur_20a', 'dakar_centre', 40],
	['peinture_blanche', 'dakar_centre', 30],
	['peinture_ext', 'dakar_centre', 15],
	['vis_50mm', 'dakar_centre', 50],
	['charniere', 'dakar_centre', 60],
	['cadenas', 'dakar_centre', 35],

	// Dakar Port — bulk storage, some items low
	['ciment_cem2', 'dakar_port', 800],
	['ciment_cem1', 'dakar_port', 200],
	['barre_acier_10', 'dakar_port', 1000],
	['barre_acier_12', 'dakar_port', 600],
	['planche_pin', 'dakar_port', 150],
	['contreplaque', 'dakar_port', 70],
	['peinture_blanche', 'dakar_port', 5], // LOW — below minStock of 10
	['peinture_ext', 'dakar_port', 3], // LOW — below minStock of 8

	// Thiès — medium, some below threshold
	['ciment_cem2', 'thies', 80], // LOW — below minStock of 100
	['barre_acier_10', 'thies', 150], // LOW — below minStock of 200
	['barre_acier_12', 'thies', 100], // LOW — below minStock of 150
	['tuyau_pvc_100', 'thies', 40],
	['coude_pvc', 'thies', 80],
	['cable_2_5', 'thies', 10], // LOW — below minStock of 15
	['vis_50mm', 'thies', 30],

	// Saint-Louis — small, limited selection
	['ciment_cem2', 'saint_louis', 60], // LOW
	['barre_acier_10', 'saint_louis', 100], // LOW
	['planche_pin', 'saint_louis', 15], // LOW — below minStock of 50
	['tuyau_pvc_100', 'saint_louis', 20], // LOW — below minStock of 30
	['cadenas', 'saint_louis', 10] // LOW — below minStock of 20
];

function insertStock(
	productMap: Record<string, { id: string; def: ProductDef }>,
	warehouseIds: Record<string, string>,
	adminUserId: string
) {
	console.log('Inserting stock levels and initial movements...');

	for (const [productKey, warehouseKey, quantity] of STOCK_LEVELS) {
		const product = productMap[productKey];
		const warehouseId = warehouseIds[warehouseKey];

		// product_warehouse row
		db.insert(schema.productWarehouse)
			.values({
				productId: product.id,
				warehouseId,
				quantity,
				minStock: product.def.minStock,
				pump: product.def.purchasePrice // Initial PUMP = purchase price
			})
			.run();

		// Matching stock-in movement
		db.insert(schema.movements)
			.values({
				id: nanoid(),
				productId: product.id,
				warehouseId,
				type: 'in',
				quantity,
				reason: 'stock_initial',
				reference: 'SEED',
				userId: adminUserId,
				createdAt: ago(30) // 30 days ago
			})
			.run();
	}

	console.log(`  Inserted ${STOCK_LEVELS.length} stock entries with movements.`);
}

// ---------------------------------------------------------------------------
// 8. Transfers
// ---------------------------------------------------------------------------

function insertTransfers(
	productMap: Record<string, { id: string; def: ProductDef }>,
	warehouseIds: Record<string, string>,
	userIds: Record<string, string>
) {
	console.log('Inserting transfers...');

	const moussa = userIds['moussa@stockflow.com'];
	const fatou = userIds['fatou@stockflow.com'];
	const aminata = userIds['aminata@stockflow.com'];

	// Transfer 1: Pending — Dakar Centre → Thiès
	const t1Id = nanoid();
	db.insert(schema.transfers)
		.values({
			id: t1Id,
			sourceWarehouseId: warehouseIds['dakar_centre'],
			destinationWarehouseId: warehouseIds['thies'],
			status: 'pending',
			requestedBy: aminata,
			requestedAt: ago(2),
			notes: 'Réapprovisionnement urgent en ciment et acier pour chantier Thiès'
		})
		.run();
	db.insert(schema.transferItems)
		.values({
			id: nanoid(),
			transferId: t1Id,
			productId: productMap['ciment_cem2'].id,
			quantityRequested: 50
		})
		.run();
	db.insert(schema.transferItems)
		.values({
			id: nanoid(),
			transferId: t1Id,
			productId: productMap['barre_acier_10'].id,
			quantityRequested: 100
		})
		.run();
	console.log('  Transfer 1 (pending): Dakar Centre -> Thiès');

	// Transfer 2: Approved — Dakar Port → Dakar Centre
	const t2Id = nanoid();
	db.insert(schema.transfers)
		.values({
			id: t2Id,
			sourceWarehouseId: warehouseIds['dakar_port'],
			destinationWarehouseId: warehouseIds['dakar_centre'],
			status: 'approved',
			requestedBy: moussa,
			approvedBy: fatou,
			requestedAt: ago(5),
			approvedAt: ago(4),
			notes: 'Transfert de peinture et contreplaqué pour stock Dakar Centre'
		})
		.run();
	db.insert(schema.transferItems)
		.values({
			id: nanoid(),
			transferId: t2Id,
			productId: productMap['peinture_blanche'].id,
			quantityRequested: 10
		})
		.run();
	db.insert(schema.transferItems)
		.values({
			id: nanoid(),
			transferId: t2Id,
			productId: productMap['peinture_ext'].id,
			quantityRequested: 5
		})
		.run();
	db.insert(schema.transferItems)
		.values({
			id: nanoid(),
			transferId: t2Id,
			productId: productMap['contreplaque'].id,
			quantityRequested: 15
		})
		.run();
	console.log('  Transfer 2 (approved): Dakar Port -> Dakar Centre');

	// Transfer 3: Shipped — Dakar Centre → Saint-Louis (stock decremented)
	const t3Id = nanoid();
	const t3Items: { productKey: string; qty: number }[] = [
		{ productKey: 'tuyau_pvc_100', qty: 15 },
		{ productKey: 'cadenas', qty: 10 }
	];
	db.insert(schema.transfers)
		.values({
			id: t3Id,
			sourceWarehouseId: warehouseIds['dakar_centre'],
			destinationWarehouseId: warehouseIds['saint_louis'],
			status: 'shipped',
			requestedBy: moussa,
			approvedBy: fatou,
			shippedBy: moussa,
			requestedAt: ago(7),
			approvedAt: ago(6),
			shippedAt: ago(3),
			notes: 'Envoi de plomberie et quincaillerie vers Saint-Louis'
		})
		.run();
	for (const item of t3Items) {
		db.insert(schema.transferItems)
			.values({
				id: nanoid(),
				transferId: t3Id,
				productId: productMap[item.productKey].id,
				quantityRequested: item.qty,
				quantitySent: item.qty
			})
			.run();

		// Stock out movement from source
		db.insert(schema.movements)
			.values({
				id: nanoid(),
				productId: productMap[item.productKey].id,
				warehouseId: warehouseIds['dakar_centre'],
				type: 'out',
				quantity: item.qty,
				reason: 'transfer',
				reference: t3Id,
				userId: moussa,
				createdAt: ago(3)
			})
			.run();

		// Decrement stock at source
		sqlite
			.prepare(
				`UPDATE product_warehouse SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`
			)
			.run(item.qty, productMap[item.productKey].id, warehouseIds['dakar_centre']);
	}
	console.log('  Transfer 3 (shipped): Dakar Centre -> Saint-Louis (stock decremented)');

	// Transfer 4: Received — Thiès → Dakar Port (completed)
	const t4Id = nanoid();
	const t4Qty = 20;
	db.insert(schema.transfers)
		.values({
			id: t4Id,
			sourceWarehouseId: warehouseIds['thies'],
			destinationWarehouseId: warehouseIds['dakar_port'],
			status: 'received',
			requestedBy: aminata,
			approvedBy: fatou,
			shippedBy: aminata,
			receivedBy: moussa,
			requestedAt: ago(14),
			approvedAt: ago(13),
			shippedAt: ago(10),
			receivedAt: ago(8),
			notes: 'Retour de vis excédentaires vers Dakar Port'
		})
		.run();
	db.insert(schema.transferItems)
		.values({
			id: nanoid(),
			transferId: t4Id,
			productId: productMap['vis_50mm'].id,
			quantityRequested: t4Qty,
			quantitySent: t4Qty,
			quantityReceived: t4Qty
		})
		.run();

	// Stock out from Thiès
	db.insert(schema.movements)
		.values({
			id: nanoid(),
			productId: productMap['vis_50mm'].id,
			warehouseId: warehouseIds['thies'],
			type: 'out',
			quantity: t4Qty,
			reason: 'transfer',
			reference: t4Id,
			userId: aminata,
			createdAt: ago(10)
		})
		.run();
	sqlite
		.prepare(
			`UPDATE product_warehouse SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?`
		)
		.run(t4Qty, productMap['vis_50mm'].id, warehouseIds['thies']);

	// Stock in at Dakar Port
	db.insert(schema.movements)
		.values({
			id: nanoid(),
			productId: productMap['vis_50mm'].id,
			warehouseId: warehouseIds['dakar_port'],
			type: 'in',
			quantity: t4Qty,
			reason: 'transfer',
			reference: t4Id,
			userId: moussa,
			createdAt: ago(8)
		})
		.run();
	// Dakar Port didn't have vis_50mm in stock init — insert new row
	db.insert(schema.productWarehouse)
		.values({
			productId: productMap['vis_50mm'].id,
			warehouseId: warehouseIds['dakar_port'],
			quantity: t4Qty,
			minStock: productMap['vis_50mm'].def.minStock,
			pump: productMap['vis_50mm'].def.purchasePrice
		})
		.run();
	console.log('  Transfer 4 (received): Thiès -> Dakar Port (completed)');

	return { t1Id, t2Id, t3Id, t4Id };
}

// ---------------------------------------------------------------------------
// 9. Inventory session
// ---------------------------------------------------------------------------

function insertInventory(
	productMap: Record<string, { id: string; def: ProductDef }>,
	warehouseIds: Record<string, string>,
	userIds: Record<string, string>
) {
	console.log('Inserting inventory session...');

	const moussa = userIds['moussa@stockflow.com'];
	const invId = nanoid();

	db.insert(schema.inventories)
		.values({
			id: invId,
			warehouseId: warehouseIds['dakar_centre'],
			status: 'in_progress',
			createdBy: moussa,
			createdAt: ago(1)
		})
		.run();

	// Items to count — some counted with differences, some not yet counted
	const items: {
		productKey: string;
		systemQty: number;
		countedQty: number | null;
	}[] = [
		{ productKey: 'ciment_cem2', systemQty: 350, countedQty: 348 }, // -2 difference
		{ productKey: 'ciment_cem1', systemQty: 120, countedQty: 120 }, // exact
		{ productKey: 'barre_acier_10', systemQty: 500, countedQty: 495 }, // -5 difference
		{ productKey: 'barre_acier_12', systemQty: 300, countedQty: null }, // not counted
		{ productKey: 'planche_pin', systemQty: 80, countedQty: 82 }, // +2 surplus
		{ productKey: 'tuyau_pvc_100', systemQty: 45, countedQty: null }, // not counted (qty after shipped transfer)
		{ productKey: 'cable_2_5', systemQty: 25, countedQty: 25 }, // exact
		{ productKey: 'peinture_blanche', systemQty: 30, countedQty: 28 } // -2 difference
	];

	for (const item of items) {
		const difference = item.countedQty !== null ? item.countedQty - item.systemQty : null;
		db.insert(schema.inventoryItems)
			.values({
				id: nanoid(),
				inventoryId: invId,
				productId: productMap[item.productKey].id,
				systemQuantity: item.systemQty,
				countedQuantity: item.countedQty,
				difference,
				countedBy: item.countedQty !== null ? moussa : null,
				countedAt: item.countedQty !== null ? ago(1) : null
			})
			.run();
	}

	console.log(`  Inventory session at Dakar Centre: ${items.filter((i) => i.countedQty !== null).length} counted, ${items.filter((i) => i.countedQty === null).length} pending`);
	return invId;
}

// ---------------------------------------------------------------------------
// 10. Alerts
// ---------------------------------------------------------------------------

function insertAlerts(
	productMap: Record<string, { id: string; def: ProductDef }>,
	warehouseIds: Record<string, string>,
	userIds: Record<string, string>,
	transferIds: { t1Id: string; t2Id: string }
) {
	console.log('Inserting alerts...');

	const karim = userIds['karim@stockflow.com'];
	const moussa = userIds['moussa@stockflow.com'];
	const aminata = userIds['aminata@stockflow.com'];

	const alertData = [
		{
			type: 'low_stock' as const,
			productId: productMap['ciment_cem2'].id,
			warehouseId: warehouseIds['thies'],
			message: 'Stock bas: Ciment CEM II 42.5 à Thiès — 80 unités (seuil: 100)',
			userId: moussa,
			createdAt: ago(1)
		},
		{
			type: 'low_stock' as const,
			productId: productMap['planche_pin'].id,
			warehouseId: warehouseIds['saint_louis'],
			message: 'Stock bas: Planche pin 4m à Saint-Louis — 15 unités (seuil: 50)',
			userId: karim,
			createdAt: ago(1)
		},
		{
			type: 'transfer_pending' as const,
			transferId: transferIds.t1Id,
			warehouseId: warehouseIds['dakar_centre'],
			message: 'Nouveau transfert en attente: Dakar Centre → Thiès (2 articles)',
			userId: moussa,
			createdAt: ago(2)
		},
		{
			type: 'transfer_approved' as const,
			transferId: transferIds.t2Id,
			warehouseId: warehouseIds['dakar_port'],
			message: 'Transfert approuvé: Dakar Port → Dakar Centre (3 articles)',
			userId: moussa,
			isRead: true,
			readAt: ago(3),
			createdAt: ago(4)
		},
		{
			type: 'inventory_started' as const,
			warehouseId: warehouseIds['dakar_centre'],
			message: 'Session d\'inventaire démarrée à Entrepôt Dakar Centre',
			userId: aminata,
			createdAt: ago(1)
		}
	];

	for (const a of alertData) {
		db.insert(schema.alerts)
			.values({
				id: nanoid(),
				type: a.type,
				productId: a.productId ?? null,
				warehouseId: a.warehouseId ?? null,
				transferId: a.transferId ?? null,
				message: a.message,
				isRead: 'isRead' in a ? a.isRead : false,
				readAt: 'readAt' in a ? a.readAt : null,
				userId: a.userId,
				createdAt: a.createdAt
			})
			.run();
	}

	console.log(`  Inserted ${alertData.length} alerts.`);
}

// ---------------------------------------------------------------------------
// 11. Audit logs
// ---------------------------------------------------------------------------

function insertAuditLogs(
	userIds: Record<string, string>,
	productMap: Record<string, { id: string; def: ProductDef }>,
	transferIds: { t1Id: string; t2Id: string; t3Id: string; t4Id: string }
) {
	console.log('Inserting audit logs...');

	const karim = userIds['karim@stockflow.com'];
	const fatou = userIds['fatou@stockflow.com'];
	const moussa = userIds['moussa@stockflow.com'];
	const aminata = userIds['aminata@stockflow.com'];

	const logs = [
		{
			userId: karim,
			action: 'login' as const,
			entityType: 'user' as const,
			entityId: karim,
			createdAt: ago(30)
		},
		{
			userId: karim,
			action: 'create' as const,
			entityType: 'product' as const,
			entityId: productMap['ciment_cem2'].id,
			newValues: JSON.stringify({ sku: 'CIM-001', name: 'Ciment CEM II 42.5 (50kg)' }),
			createdAt: ago(30)
		},
		{
			userId: karim,
			action: 'create' as const,
			entityType: 'product' as const,
			entityId: productMap['barre_acier_10'].id,
			newValues: JSON.stringify({ sku: 'ACI-001', name: 'Barre acier HA 10mm (12m)' }),
			createdAt: ago(30)
		},
		{
			userId: moussa,
			action: 'movement' as const,
			entityType: 'movement' as const,
			entityId: productMap['ciment_cem2'].id,
			newValues: JSON.stringify({ type: 'in', quantity: 350, warehouse: 'Dakar Centre' }),
			createdAt: ago(30)
		},
		{
			userId: aminata,
			action: 'transfer' as const,
			entityType: 'transfer' as const,
			entityId: transferIds.t1Id,
			newValues: JSON.stringify({ status: 'pending', from: 'Dakar Centre', to: 'Thiès' }),
			createdAt: ago(2)
		},
		{
			userId: fatou,
			action: 'transfer' as const,
			entityType: 'transfer' as const,
			entityId: transferIds.t2Id,
			newValues: JSON.stringify({ status: 'approved', from: 'Dakar Port', to: 'Dakar Centre' }),
			createdAt: ago(4)
		},
		{
			userId: moussa,
			action: 'transfer' as const,
			entityType: 'transfer' as const,
			entityId: transferIds.t3Id,
			newValues: JSON.stringify({ status: 'shipped', from: 'Dakar Centre', to: 'Saint-Louis' }),
			createdAt: ago(3)
		},
		{
			userId: moussa,
			action: 'inventory' as const,
			entityType: 'inventory' as const,
			entityId: 'inv-dakar-centre',
			newValues: JSON.stringify({ warehouse: 'Dakar Centre', status: 'in_progress' }),
			createdAt: ago(1)
		}
	];

	for (const log of logs) {
		db.insert(schema.auditLogs)
			.values({
				id: nanoid(),
				userId: log.userId,
				action: log.action,
				entityType: log.entityType,
				entityId: log.entityId,
				oldValues: null,
				newValues: log.newValues ?? null,
				ipAddress: '127.0.0.1',
				createdAt: log.createdAt
			})
			.run();
	}

	console.log(`  Inserted ${logs.length} audit log entries.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== StockFlow Database Seed ===\n');

	// Step 1: Clean
	cleanDatabase();

	// Step 2: Users (via HTTP API — must be outside transaction since it's async/HTTP)
	const userIds = await createUsers();

	// Steps 3-11: All synchronous DB inserts wrapped in a transaction for atomicity
	const seedData = sqlite.transaction(() => {
		const warehouseIds = insertWarehouses();
		insertUserWarehouses(userIds, warehouseIds);
		const categoryIds = insertCategories();
		const productMap = insertProducts(categoryIds);
		insertStock(productMap, warehouseIds, userIds['karim@stockflow.com']);
		const transferIds = insertTransfers(productMap, warehouseIds, userIds);
		insertInventory(productMap, warehouseIds, userIds);
		insertAlerts(productMap, warehouseIds, userIds, transferIds);
		insertAuditLogs(userIds, productMap, transferIds);
	});
	seedData();

	console.log('\n=== Seed complete! ===');
	console.log('\nDemo accounts:');
	for (const u of USERS) {
		console.log(`  ${u.email} / ${u.password} (${u.role})`);
	}
}

main()
	.then(() => sqlite.close())
	.catch((err) => {
		console.error('Seed failed:', err);
		sqlite.close();
		process.exit(1);
	});
