<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	onMount(() => {
		goto(resolve('/dashboard'));
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<p class="text-gray-500">Redirection...</p>
</div>
