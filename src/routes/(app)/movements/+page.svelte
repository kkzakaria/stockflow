<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, Card, EmptyState, Input, Select } from '$lib/components/ui';
	import { formatDate } from '$lib/utils/format';

	let { data } = $props();

	const typeBadge: Record<
		string,
		{ label: string; variant: 'success' | 'danger' | 'info' | 'warning' }
	> = {
		in: { label: 'Entree', variant: 'success' },
		out: { label: 'Sortie', variant: 'danger' },
		adjustment_in: { label: 'Ajust. +', variant: 'info' },
		adjustment_out: { label: 'Ajust. -', variant: 'warning' }
	};

	function applyFilters() {
		const params = new URLSearchParams();
		if (data.filters.search) params.set('search', data.filters.search);
		if (data.filters.warehouseId) params.set('warehouseId', data.filters.warehouseId);
		if (data.filters.type) params.set('type', data.filters.type);
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/movements?${params.toString()}`);
	}

	function clearFilters() {
		data.filters.search = '';
		data.filters.warehouseId = '';
		data.filters.type = '';
		goto(resolve('/movements'));
	}

	function buildPaginationUrl(targetPage: number): string {
		const params = new URLSearchParams();
		if (data.filters.search) params.set('search', data.filters.search);
		if (data.filters.warehouseId) params.set('warehouseId', data.filters.warehouseId);
		if (data.filters.type) params.set('type', data.filters.type);
		params.set('page', String(targetPage));
		return `/movements?${params.toString()}`;
	}
</script>

<PageHeader title="Mouvements de stock" description="Historique des entrees, sorties et ajustements">
	{#snippet actions()}
		{#if data.canCreate}
			<Button
				onclick={() => {
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					goto('/movements/new');
				}}>+ Nouveau mouvement</Button
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
				label="Entrepot"
				value={data.filters.warehouseId}
				onchange={(e) => {
					data.filters.warehouseId = e.currentTarget.value;
					applyFilters();
				}}
			>
				<option value="">Tous les entrepots</option>
				{#each data.warehouses as wh (wh.id)}
					<option value={wh.id}>{wh.name}</option>
				{/each}
			</Select>
		</div>
		<div class="w-full sm:w-48">
			<Select
				label="Type"
				value={data.filters.type}
				onchange={(e) => {
					data.filters.type = e.currentTarget.value;
					applyFilters();
				}}
			>
				<option value="">Tous les types</option>
				<option value="in">Entree</option>
				<option value="out">Sortie</option>
				<option value="adjustment_in">Ajustement +</option>
				<option value="adjustment_out">Ajustement -</option>
			</Select>
		</div>
		<div class="flex gap-2">
			<Button onclick={applyFilters}>Rechercher</Button>
			{#if data.filters.search || data.filters.warehouseId || data.filters.type}
				<Button variant="ghost" onclick={clearFilters}>Effacer</Button>
			{/if}
		</div>
	</div>
</Card>

{#if data.movements.length === 0}
	<EmptyState
		icon="📦"
		title="Aucun mouvement"
		description="Aucun mouvement ne correspond a vos criteres de recherche."
	>
		{#snippet action()}
			{#if data.canCreate}
				<Button
					onclick={() => {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						goto('/movements/new');
					}}>Creer un mouvement</Button
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
						>Date</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Produit</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Entrepot</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Type</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Quantite</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Motif</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Reference</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.movements as m (m.id)}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{formatDate(m.createdAt)}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap">
							<span class="font-medium text-gray-900">{m.productName}</span>
							<span class="ml-2 font-mono text-xs text-gray-400">{m.productSku}</span>
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{m.warehouseName}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap">
							<Badge variant={typeBadge[m.type]?.variant ?? 'default'}>
								{typeBadge[m.type]?.label ?? m.type}
							</Badge>
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-right font-medium text-gray-900">
							{m.quantity.toLocaleString('fr-FR')}
						</td>
						<td class="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
							{m.reason}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-400 font-mono">
							{m.reference ?? '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data.movements as m (m.id)}
				<div class="p-4">
					<div class="mb-2 flex items-center justify-between">
						<div>
							<span class="font-medium text-gray-900">{m.productName}</span>
							<span class="ml-2 text-xs font-mono text-gray-400">{m.productSku}</span>
						</div>
						<Badge variant={typeBadge[m.type]?.variant ?? 'default'}>
							{typeBadge[m.type]?.label ?? m.type}
						</Badge>
					</div>
					<p class="text-sm text-gray-500">{m.warehouseName}</p>
					<div class="mt-2 flex items-center justify-between text-sm">
						<span class="text-gray-500">{formatDate(m.createdAt)}</span>
						<span class="font-medium text-gray-900">{m.quantity.toLocaleString('fr-FR')}</span>
					</div>
					<div class="mt-1 flex items-center justify-between text-xs text-gray-500">
						<span>{m.reason}</span>
						{#if m.reference}
							<span class="font-mono">{m.reference}</span>
						{/if}
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
				({data.pagination.total} mouvements)
			</p>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					<Button
						variant="secondary"
						onclick={() => {
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(buildPaginationUrl(data.pagination.page - 1));
						}}>Precedent</Button
					>
				{/if}
				{#if data.pagination.page < Math.ceil(data.pagination.total / data.pagination.limit)}
					<Button
						variant="secondary"
						onclick={() => {
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(buildPaginationUrl(data.pagination.page + 1));
						}}>Suivant</Button
					>
				{/if}
			</div>
		</div>
	{/if}
{/if}
