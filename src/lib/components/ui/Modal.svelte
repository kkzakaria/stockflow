<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		closeLabel?: string;
		onclose?: () => void;
		children: Snippet;
	}

	let { open = $bindable(), title, closeLabel = 'Close', onclose, children }: Props = $props();

	let previousActiveElement: HTMLElement | null = null;
	let dialogEl: HTMLDivElement | undefined = $state();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			handleClose();
		}
		if (e.key === 'Tab' && dialogEl) {
			const focusable = dialogEl.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	}

	$effect(() => {
		if (open) {
			previousActiveElement = document.activeElement as HTMLElement | null;
			document.body.style.overflow = 'hidden';
			// Focus the dialog on next tick
			requestAnimationFrame(() => {
				dialogEl?.focus();
			});
		} else {
			document.body.style.overflow = '';
			previousActiveElement?.focus();
			previousActiveElement = null;
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
	>
		<div
			bind:this={dialogEl}
			class="w-full max-w-md rounded-lg bg-white shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
			tabindex="-1"
		>
			{#if title}
				<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
					<h2 id="modal-title" class="text-lg font-semibold text-gray-900">{title}</h2>
					<button
						type="button"
						onclick={handleClose}
						class="text-gray-400 hover:text-gray-500"
						aria-label={closeLabel}
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			{/if}

			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
