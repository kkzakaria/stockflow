import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------- Mock $app/environment ----------
vi.mock('$app/environment', () => ({ browser: true }));

// ---------- Minimal in-memory IndexedDB mock ----------

/** Simple in-memory store that behaves just enough like IDBObjectStore */
let _store: Map<number, unknown>;
let _autoId: number;

function resetStore() {
	_store = new Map();
	_autoId = 0;
}

/** Tiny helper: wraps a value in an object that looks like IDBRequest */
function fakeRequest<T>(value: T): IDBRequest<T> {
	const req = {
		result: value,
		error: null as DOMException | null,
		onsuccess: null as ((ev: Event) => void) | null,
		onerror: null as ((ev: Event) => void) | null
	};
	// Fire onsuccess asynchronously (microtask) so callers can attach handlers first
	queueMicrotask(() => req.onsuccess?.({} as Event));
	return req as unknown as IDBRequest<T>;
}

function fakeObjectStore(): IDBObjectStore {
	return {
		add(value: unknown) {
			const id = ++_autoId;
			const record = { ...value as Record<string, unknown>, id };
			_store.set(id, record);
			return fakeRequest(id);
		},
		getAll() {
			return fakeRequest(Array.from(_store.values()));
		},
		delete(key: number) {
			_store.delete(key);
			return fakeRequest(undefined);
		},
		count() {
			return fakeRequest(_store.size);
		},
		clear() {
			_store.clear();
			return fakeRequest(undefined);
		}
	} as unknown as IDBObjectStore;
}

function fakeTransaction(): IDBTransaction {
	return {
		objectStore() {
			return fakeObjectStore();
		}
	} as unknown as IDBTransaction;
}

function fakeDB(): IDBDatabase {
	return {
		objectStoreNames: { contains: () => false } as unknown as DOMStringList,
		createObjectStore: vi.fn(),
		transaction() {
			return fakeTransaction();
		},
		close: vi.fn()
	} as unknown as IDBDatabase;
}

/** Mock indexedDB.open — always resolves immediately */
function createMockIndexedDB() {
	return {
		open(_name: string, _version?: number) {
			const db = fakeDB();
			const req = {
				result: db,
				error: null as DOMException | null,
				onupgradeneeded: null as ((ev: Event) => void) | null,
				onsuccess: null as ((ev: Event) => void) | null,
				onerror: null as ((ev: Event) => void) | null
			};
			queueMicrotask(() => {
				// Trigger upgrade first (creates the object store), then success
				req.onupgradeneeded?.({} as Event);
				req.onsuccess?.({} as Event);
			});
			return req as unknown as IDBOpenDBRequest;
		}
	};
}

// Track online event listeners
let onlineListeners: Array<() => void> = [];

// ---------- Install globals BEFORE importing the module ----------
beforeEach(() => {
	resetStore();
	onlineListeners = [];

	vi.stubGlobal('indexedDB', createMockIndexedDB());
	vi.stubGlobal(
		'window',
		Object.assign(globalThis, {
			addEventListener: (event: string, handler: () => void) => {
				if (event === 'online') {
					onlineListeners.push(handler);
				}
			}
		})
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

// We dynamically import the module so the globals are installed first.
// resetModules ensures each describe block (or test) can get a fresh module.
async function loadQueue() {
	vi.resetModules();
	const mod = await import('./offline-queue');
	return mod.offlineQueue;
}

// -----------------------------------------------------------

describe('offlineQueue', () => {
	describe('enqueue', () => {
		it('should enqueue an operation and increase pending count', async () => {
			expect.assertions(2);
			const queue = await loadQueue();

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1', quantity: 5 },
				timestamp: new Date().toISOString()
			});

			const count = await queue.getPendingCount();
			expect(count).toBe(1);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p2', quantity: 3 },
				timestamp: new Date().toISOString()
			});

			const count2 = await queue.getPendingCount();
			expect(count2).toBe(2);
		});
	});

	describe('flush', () => {
		it('should flush successfully on 2xx response — removes operation from queue', async () => {
			expect.assertions(3);
			const queue = await loadQueue();

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({ ok: true, status: 200 })
			);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1', quantity: 5 },
				timestamp: new Date().toISOString()
			});

			const result = await queue.flush();
			expect(result.succeeded).toBe(1);
			expect(result.failed).toBe(0);

			const remaining = await queue.getPendingCount();
			expect(remaining).toBe(0);
		});

		it('should remove operation on 4xx response and count as failed', async () => {
			expect.assertions(3);
			const queue = await loadQueue();

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: false,
					status: 422,
					text: () => Promise.resolve('Validation error')
				})
			);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { bad: 'data' },
				timestamp: new Date().toISOString()
			});

			const result = await queue.flush();
			expect(result.succeeded).toBe(0);
			expect(result.failed).toBe(1);

			const remaining = await queue.getPendingCount();
			expect(remaining).toBe(0);
		});

		it('should keep operation on 5xx response and stop flushing', async () => {
			expect.assertions(4);
			const queue = await loadQueue();

			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500
			});
			vi.stubGlobal('fetch', mockFetch);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1', quantity: 5 },
				timestamp: new Date().toISOString()
			});

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p2', quantity: 3 },
				timestamp: new Date().toISOString()
			});

			const result = await queue.flush();
			expect(result.succeeded).toBe(0);
			expect(result.failed).toBe(0);

			// Both operations should still be in queue (stopped at first 5xx)
			const remaining = await queue.getPendingCount();
			expect(remaining).toBe(2);

			// fetch should have been called only once (stopped after first 5xx)
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should stop flushing on network error and keep remaining operations', async () => {
			expect.assertions(3);
			const queue = await loadQueue();

			const mockFetch = vi.fn().mockRejectedValue(new Error('Network failed'));
			vi.stubGlobal('fetch', mockFetch);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1', quantity: 5 },
				timestamp: new Date().toISOString()
			});

			const result = await queue.flush();
			expect(result.succeeded).toBe(0);
			expect(result.failed).toBe(0);

			const remaining = await queue.getPendingCount();
			expect(remaining).toBe(1);
		});

		it('should process mixed responses correctly — 2xx then 4xx', async () => {
			expect.assertions(3);
			const queue = await loadQueue();

			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({ ok: true, status: 200 })
				.mockResolvedValueOnce({
					ok: false,
					status: 400,
					text: () => Promise.resolve('Bad request')
				});
			vi.stubGlobal('fetch', mockFetch);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1', quantity: 5 },
				timestamp: new Date().toISOString()
			});

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { bad: 'data' },
				timestamp: new Date().toISOString()
			});

			const result = await queue.flush();
			expect(result.succeeded).toBe(1);
			expect(result.failed).toBe(1);

			const remaining = await queue.getPendingCount();
			expect(remaining).toBe(0);
		});

		it('should pass correct fetch options when flushing', async () => {
			expect.assertions(3);
			const queue = await loadQueue();

			const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
			vi.stubGlobal('fetch', mockFetch);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1', quantity: 5 },
				timestamp: new Date().toISOString()
			});

			await queue.flush();

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('/api/v1/movements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ productId: 'p1', quantity: 5 })
			});

			const remaining = await queue.getPendingCount();
			expect(remaining).toBe(0);
		});

		it('should pass undefined body when operation body is null', async () => {
			expect.assertions(2);
			const queue = await loadQueue();

			const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
			vi.stubGlobal('fetch', mockFetch);

			await queue.enqueue({
				url: '/api/v1/cache',
				method: 'DELETE',
				body: null,
				timestamp: new Date().toISOString()
			});

			await queue.flush();

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(mockFetch).toHaveBeenCalledWith('/api/v1/cache', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: undefined
			});
		});
	});

	describe('clear', () => {
		it('should clear all pending operations', async () => {
			expect.assertions(2);
			const queue = await loadQueue();

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1' },
				timestamp: new Date().toISOString()
			});

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p2' },
				timestamp: new Date().toISOString()
			});

			const countBefore = await queue.getPendingCount();
			expect(countBefore).toBe(2);

			await queue.clear();

			const countAfter = await queue.getPendingCount();
			expect(countAfter).toBe(0);
		});
	});

	describe('getPendingCount', () => {
		it('should return 0 when queue is empty', async () => {
			expect.assertions(1);
			const queue = await loadQueue();

			const count = await queue.getPendingCount();
			expect(count).toBe(0);
		});
	});

	describe('flush with 2xx then 5xx', () => {
		it('should process first op (2xx) then stop at second op (5xx)', async () => {
			expect.assertions(4);
			const queue = await loadQueue();

			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({ ok: true, status: 200 })
				.mockResolvedValueOnce({ ok: false, status: 503 });
			vi.stubGlobal('fetch', mockFetch);

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p1' },
				timestamp: new Date().toISOString()
			});

			await queue.enqueue({
				url: '/api/v1/movements',
				method: 'POST',
				body: { productId: 'p2' },
				timestamp: new Date().toISOString()
			});

			const result = await queue.flush();
			expect(result.succeeded).toBe(1);
			expect(result.failed).toBe(0);

			// The second op stays in the queue
			const remaining = await queue.getPendingCount();
			expect(remaining).toBe(1);

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});
});
