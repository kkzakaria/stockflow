<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';

	let { data, children } = $props();
</script>

<div class="flex h-screen bg-gray-50">
	<Sidebar role={data.user.role ?? 'viewer'} />

	<div class="flex flex-1 flex-col overflow-hidden">
		<Header userName={data.user.name} />

		<main class="flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
			{@render children()}
		</main>
	</div>

	<BottomNav />
</div>
