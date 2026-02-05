import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function add(type: ToastType, message: string) {
		const id = Math.random().toString(36).slice(2, 9);
		update((toasts) => [...toasts, { id, type, message }]);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			remove(id);
		}, 5000);
	}

	function remove(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string) => add('success', message),
		error: (message: string) => add('error', message),
		warning: (message: string) => add('warning', message),
		info: (message: string) => add('info', message),
		remove
	};
}

export const toast = createToastStore();
