<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		error?: string;
		hint?: string;
	}

	let { label, error, hint, id, class: className = '', ...rest }: Props = $props();

	const fallbackId = `input-${Math.random().toString(36).slice(2, 9)}`;
	const inputId = $derived(id ?? fallbackId);
</script>

<div class="space-y-1">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700">
			{label}
		</label>
	{/if}

	<input
		id={inputId}
		class="w-full rounded-md border px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none
			{error
			? 'border-red-300 focus:border-red-500 focus:ring-red-500'
			: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
			{className}"
		{...rest}
	/>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if hint}
		<p class="text-sm text-gray-500">{hint}</p>
	{/if}
</div>
