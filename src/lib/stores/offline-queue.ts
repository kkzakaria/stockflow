import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { offlineQueue } from '$lib/services/offline-queue';

function createPendingCountStore() {
	const { subscribe, set } = writable(0);

	async function refresh() {
		if (!browser) return;
		const count = await offlineQueue.getPendingCount();
		set(count);
	}

	// Initial load
	if (browser) {
		refresh();
	}

	return { subscribe, refresh };
}

export const pendingCount = createPendingCountStore();
