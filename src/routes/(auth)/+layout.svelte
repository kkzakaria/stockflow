<script lang="ts">
	let { children } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-gray-900">StockFlow</h1>
			<p class="mt-1 text-sm text-gray-500">Gestion de stock multi-entrepôts</p>
		</div>
		{@render children()}
	</div>
</div>
