<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		action?: Snippet;
	}

	let { icon = '\uD83D\uDCED', title, description, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
	<span class="text-5xl">{icon}</span>
	<h3 class="mt-4 text-lg font-medium text-gray-900">{title}</h3>
	{#if description}
		<p class="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
	{/if}
	{#if action}
		<div class="mt-6">
			{@render action()}
		</div>
	{/if}
</div>
