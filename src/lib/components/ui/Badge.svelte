<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
		children: Snippet;
	}

	let { variant = 'default', children }: Props = $props();

	const variantClasses = {
		default: 'bg-gray-100 text-gray-700',
		success: 'bg-green-100 text-green-700',
		warning: 'bg-yellow-100 text-yellow-700',
		danger: 'bg-red-100 text-red-700',
		info: 'bg-blue-100 text-blue-700'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {variantClasses[
		variant
	]}"
>
	{@render children()}
</span>
