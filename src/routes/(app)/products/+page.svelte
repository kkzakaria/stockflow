<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, Card, EmptyState, Input, Select } from '$lib/components/ui';
	import { formatXOF } from '$lib/utils/format';

	let { data } = $props();

	function applyFilters() {
		const params = new URLSearchParams();
		if (data.filters.search) params.set('search', data.filters.search);
		if (data.filters.categoryId) params.set('category', data.filters.categoryId);
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/products?${params.toString()}`);
	}

	function clearFilters() {
		data.filters.search = '';
		data.filters.categoryId = '';
		goto(resolve('/products'));
	}

	function getCategoryName(categoryId: string | null): string {
		if (!categoryId) return '—';
		const cat = data.categories.find((c) => c.id === categoryId);
		return cat?.name ?? '—';
	}

	function isLowStock(totalStock: number, minStock: number | null): boolean {
		return minStock !== null && minStock > 0 && totalStock <= minStock;
	}
</script>

<PageHeader title="Produits" description="Catalogue produits et niveaux de stock">
	{#snippet actions()}
		{#if data.canCreate}
			<Button
				onclick={() => {
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					goto('/products/new');
				}}>+ Nouveau produit</Button
			>
		{/if}
	{/snippet}
</PageHeader>

<!-- Filters -->
<Card class="mb-6 p-4">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
		<div class="flex-1">
			<Input
				label="Rechercher"
				type="search"
				placeholder="SKU ou nom du produit..."
				value={data.filters.search}
				oninput={(e) => {
					data.filters.search = e.currentTarget.value;
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter') applyFilters();
				}}
			/>
		</div>
		<div class="w-full sm:w-48">
			<Select
				label="Categorie"
				value={data.filters.categoryId}
				onchange={(e) => {
					data.filters.categoryId = e.currentTarget.value;
					applyFilters();
				}}
			>
				<option value="">Toutes les categories</option>
				{#each data.categories as cat (cat.id)}
					<option value={cat.id}>{cat.name}</option>
				{/each}
			</Select>
		</div>
		<div class="flex gap-2">
			<Button onclick={applyFilters}>Rechercher</Button>
			{#if data.filters.search || data.filters.categoryId}
				<Button variant="ghost" onclick={clearFilters}>Effacer</Button>
			{/if}
		</div>
	</div>
</Card>

{#if data.products.length === 0}
	<EmptyState
		icon="📦"
		title="Aucun produit"
		description="Aucun produit ne correspond a vos criteres de recherche."
	>
		{#snippet action()}
			{#if data.canCreate}
				<Button
					onclick={() => {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						goto('/products/new');
					}}>Creer un produit</Button
				>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<Card class="overflow-hidden p-0">
		<!-- Desktop table -->
		<table class="hidden w-full md:table">
			<thead class="bg-gray-50">
				<tr>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>SKU</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Nom</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Categorie</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Stock</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Valeur (XOF)</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Prix achat</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Prix vente</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.products as p (p.id)}
					<tr
						class="cursor-pointer hover:bg-gray-50"
						onclick={() => {
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/products/${p.id}`);
						}}
					>
						<td class="px-4 py-3 text-sm font-mono whitespace-nowrap text-gray-900"
							>{p.sku}</td
						>
						<td class="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">
							{p.name}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{getCategoryName(p.categoryId)}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-right">
							<span class="text-gray-900">{p.totalStock.toLocaleString('fr-FR')}</span>
							{#if isLowStock(p.totalStock, p.minStock)}
								<Badge variant="danger">Stock bas</Badge>
							{/if}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-right text-gray-900">
							{formatXOF(p.stockValue)}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-right text-gray-500">
							{formatXOF(p.purchasePrice ?? 0)}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-right text-gray-500">
							{formatXOF(p.salePrice ?? 0)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data.products as p (p.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div
					class="cursor-pointer p-4 hover:bg-gray-50"
					onclick={() => {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						goto(`/products/${p.id}`);
					}}
				>
					<div class="mb-2 flex items-center justify-between">
						<div>
							<span class="font-medium text-gray-900">{p.name}</span>
							<span class="ml-2 text-xs font-mono text-gray-400">{p.sku}</span>
						</div>
						{#if isLowStock(p.totalStock, p.minStock)}
							<Badge variant="danger">Stock bas</Badge>
						{/if}
					</div>
					<p class="text-sm text-gray-500">{getCategoryName(p.categoryId)}</p>
					<div class="mt-2 flex items-center justify-between text-sm">
						<span class="text-gray-700"
							>Stock: {p.totalStock.toLocaleString('fr-FR')}</span
						>
						<span class="font-medium text-gray-900">{formatXOF(p.stockValue)}</span>
					</div>
					<div class="mt-1 flex items-center justify-between text-xs text-gray-500">
						<span>Achat: {formatXOF(p.purchasePrice ?? 0)}</span>
						<span>Vente: {formatXOF(p.salePrice ?? 0)}</span>
					</div>
				</div>
			{/each}
		</div>
	</Card>

	<!-- Pagination -->
	{#if data.pagination.total > data.pagination.limit}
		<div class="mt-4 flex items-center justify-between">
			<p class="text-sm text-gray-500">
				Page {data.pagination.page} sur {Math.ceil(data.pagination.total / data.pagination.limit)}
				({data.pagination.total} produits)
			</p>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					<Button
						variant="secondary"
						onclick={() => {
							const params = new URLSearchParams();
							if (data.filters.search) params.set('search', data.filters.search);
							if (data.filters.categoryId) params.set('category', data.filters.categoryId);
							params.set('page', String(data.pagination.page - 1));
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/products?${params.toString()}`);
						}}>Precedent</Button
					>
				{/if}
				{#if data.pagination.page < Math.ceil(data.pagination.total / data.pagination.limit)}
					<Button
						variant="secondary"
						onclick={() => {
							const params = new URLSearchParams();
							if (data.filters.search) params.set('search', data.filters.search);
							if (data.filters.categoryId) params.set('category', data.filters.categoryId);
							params.set('page', String(data.pagination.page + 1));
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/products?${params.toString()}`);
						}}>Suivant</Button
					>
				{/if}
			</div>
		</div>
	{/if}
{/if}
