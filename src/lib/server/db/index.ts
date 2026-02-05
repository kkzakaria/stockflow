import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const sqlite = new Database(env.DATABASE_URL);

// Patch better-sqlite3 Statement to coerce unsupported JS types.
// better-sqlite3 can only bind numbers, strings, bigints, buffers, and null.
// Better Auth passes Date objects and booleans which must be converted.
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

// Drizzle instance for business queries
export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
