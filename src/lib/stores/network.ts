import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createNetworkStore() {
	const { subscribe, set } = writable(browser ? navigator.onLine : true);

	if (browser) {
		window.addEventListener('online', () => set(true));
		window.addEventListener('offline', () => set(false));
	}

	return { subscribe };
}

export const isOnline = createNetworkStore();
