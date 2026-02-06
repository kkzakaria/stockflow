import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
}

const MAX_TOASTS = 5;

function createToastStore() {
	const { subscribe, update, set } = writable<Toast[]>([]);

	function add(type: ToastType, message: string, duration = 5000) {
		const id = Math.random().toString(36).slice(2, 9);
		update((toasts) => {
			const next = [...toasts, { id, type, message }];
			// Keep only the most recent toasts
			if (next.length > MAX_TOASTS) {
				return next.slice(next.length - MAX_TOASTS);
			}
			return next;
		});

		// Auto-remove after duration
		setTimeout(() => {
			remove(id);
		}, duration);
	}

	function remove(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	function clearAll() {
		set([]);
	}

	return {
		subscribe,
		success: (message: string, duration?: number) => add('success', message, duration),
		error: (message: string, duration?: number) => add('error', message, duration),
		warning: (message: string, duration?: number) => add('warning', message, duration),
		info: (message: string, duration?: number) => add('info', message, duration),
		remove,
		clearAll
	};
}

export const toast = createToastStore();
