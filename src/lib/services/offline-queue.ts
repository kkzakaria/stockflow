import { browser } from '$app/environment';

const DB_NAME = 'stockflow-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-operations';

export interface PendingOperation {
	id?: number;
	url: string;
	method: string;
	body: unknown;
	timestamp: string;
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function txPromise<T>(
	db: IDBDatabase,
	mode: IDBTransactionMode,
	fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, mode);
		const store = tx.objectStore(STORE_NAME);
		const request = fn(store);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function enqueue(op: Omit<PendingOperation, 'id'>): Promise<void> {
	if (!browser) return;
	const db = await openDB();
	await txPromise(db, 'readwrite', (store) => store.add(op));
	db.close();
}

async function flush(): Promise<{ succeeded: number; failed: number }> {
	if (!browser) return { succeeded: 0, failed: 0 };

	const db = await openDB();
	const operations = await txPromise<PendingOperation[]>(db, 'readonly', (store) =>
		store.getAll()
	);

	let succeeded = 0;
	let failed = 0;

	for (const op of operations) {
		try {
			const response = await fetch(op.url, {
				method: op.method,
				headers: { 'Content-Type': 'application/json' },
				body: op.body != null ? JSON.stringify(op.body) : undefined
			});

			if (response.ok) {
				// 2xx — success, remove from queue
				await txPromise(db, 'readwrite', (store) => store.delete(op.id!));
				succeeded++;
			} else if (response.status >= 400 && response.status < 500) {
				// 4xx — client error (invalid data), remove from queue
				await txPromise(db, 'readwrite', (store) => store.delete(op.id!));
				failed++;
			} else {
				// 5xx — server error, stop flushing (retry later)
				break;
			}
		} catch {
			// Network error — stop flushing (retry later)
			break;
		}
	}

	db.close();
	return { succeeded, failed };
}

async function getPendingCount(): Promise<number> {
	if (!browser) return 0;
	const db = await openDB();
	const count = await txPromise<number>(db, 'readonly', (store) => store.count());
	db.close();
	return count;
}

async function clear(): Promise<void> {
	if (!browser) return;
	const db = await openDB();
	await txPromise(db, 'readwrite', (store) => store.clear());
	db.close();
}

export const offlineQueue = {
	enqueue,
	flush,
	getPendingCount,
	clear
};

// Auto-flush when coming back online
if (browser) {
	window.addEventListener('online', () => {
		offlineQueue.flush();
	});
}
