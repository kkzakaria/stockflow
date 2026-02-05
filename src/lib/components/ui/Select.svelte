<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		error?: string;
		children: Snippet;
	}

	let { label, error, id, class: className = '', children, ...rest }: Props = $props();

	const fallbackId = `select-${Math.random().toString(36).slice(2, 9)}`;
	const selectId = $derived(id ?? fallbackId);
</script>

<div class="space-y-1">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-gray-700">
			{label}
		</label>
	{/if}

	<select
		id={selectId}
		class="w-full rounded-md border px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none
			{error
			? 'border-red-300 focus:border-red-500 focus:ring-red-500'
			: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
			{className}"
		{...rest}
	>
		{@render children()}
	</select>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>
