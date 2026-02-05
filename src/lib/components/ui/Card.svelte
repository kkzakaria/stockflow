<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm {className}">
	{@render children()}
</div>
