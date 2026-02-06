<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title?: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'primary';
		loading?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open = $bindable(),
		title = 'Confirmation',
		message,
		confirmLabel = 'Confirmer',
		cancelLabel = 'Annuler',
		variant = 'danger',
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();
</script>

<Modal bind:open {title} onclose={oncancel}>
	<p class="text-sm text-gray-600">{message}</p>

	<div class="mt-6 flex justify-end gap-3">
		<Button variant="secondary" onclick={oncancel} disabled={loading}>
			{cancelLabel}
		</Button>
		<Button {variant} onclick={onconfirm} {loading}>
			{confirmLabel}
		</Button>
	</div>
</Modal>
