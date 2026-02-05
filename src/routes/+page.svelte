<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/dashboard');
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<p class="text-gray-500">Redirection...</p>
</div>
