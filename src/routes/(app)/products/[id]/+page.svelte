<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, Card } from '$lib/components/ui';
	import { formatXOF, formatDate } from '$lib/utils/format';

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

	function isLowStock(quantity: number | null, minStock: number | null): boolean {
		return minStock !== null && minStock > 0 && (quantity ?? 0) <= minStock;
	}
</script>

<PageHeader
	title={data.product.name}
	description="{data.product.sku} — {data.product.category?.name ?? 'Sans categorie'}"
>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/products'))}>Retour</Button>
		{#if data.canEdit}
			<Button
				variant="secondary"
				onclick={() => {
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					goto(`/products/${data.product.id}/edit`);
				}}>Modifier</Button
			>
		{/if}
		<Button
			onclick={() => {
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				goto(`/movements/new?productId=${data.product.id}`);
			}}>+ Nouveau mouvement</Button
		>
	{/snippet}
</PageHeader>

<!-- Summary cards -->
<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
	<Card>
		<p class="text-sm font-medium text-gray-500">Stock total</p>
		<p class="mt-1 text-2xl font-bold text-gray-900">
			{data.totalStock.toLocaleString('fr-FR')}
		</p>
	</Card>
	<Card>
		<p class="text-sm font-medium text-gray-500">Valeur totale</p>
		<p class="mt-1 text-2xl font-bold text-gray-900">
			{formatXOF(data.totalValue)}
		</p>
	</Card>
	<Card>
		<p class="text-sm font-medium text-gray-500">Prix de vente</p>
		<p class="mt-1 text-2xl font-bold text-gray-900">
			{formatXOF(data.product.salePrice ?? 0)}
		</p>
	</Card>
</div>

<!-- Product info -->
<Card class="mb-6">
	<h2 class="mb-4 text-lg font-semibold text-gray-900">Informations produit</h2>
	<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<div>
			<dt class="text-sm font-medium text-gray-500">Description</dt>
			<dd class="mt-1 text-sm text-gray-900">{data.product.description ?? '—'}</dd>
		</div>
		<div>
			<dt class="text-sm font-medium text-gray-500">Unite</dt>
			<dd class="mt-1 text-sm text-gray-900">{data.product.unit}</dd>
		</div>
		<div>
			<dt class="text-sm font-medium text-gray-500">Prix d'achat</dt>
			<dd class="mt-1 text-sm text-gray-900">{formatXOF(data.product.purchasePrice ?? 0)}</dd>
		</div>
		<div>
			<dt class="text-sm font-medium text-gray-500">Prix de vente</dt>
			<dd class="mt-1 text-sm text-gray-900">{formatXOF(data.product.salePrice ?? 0)}</dd>
		</div>
		<div>
			<dt class="text-sm font-medium text-gray-500">Stock minimum global</dt>
			<dd class="mt-1 text-sm text-gray-900">{data.product.minStock ?? 0}</dd>
		</div>
	</dl>
</Card>

<!-- Stock by warehouse -->
<Card class="mb-6 overflow-hidden p-0">
	<div class="px-4 pt-4 pb-2">
		<h2 class="text-lg font-semibold text-gray-900">Stock par entrepot</h2>
	</div>
	{#if data.warehouseStock.length === 0}
		<p class="px-4 pb-4 text-sm text-gray-500">Aucun stock enregistre dans les entrepots.</p>
	{:else}
		<table class="w-full">
			<thead class="bg-gray-50">
				<tr>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Entrepot</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Quantite</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Stock min.</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>PUMP</th
					>
					<th
						class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Valeur (XOF)</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.warehouseStock as stock (stock.warehouseId)}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-3 text-sm font-medium text-gray-900">
							{stock.warehouseName}
						</td>
						<td class="px-4 py-3 text-right text-sm text-gray-900">
							{(stock.quantity ?? 0).toLocaleString('fr-FR')}
							{#if isLowStock(stock.quantity, stock.minStock)}
								<Badge variant="danger">Stock bas</Badge>
							{/if}
						</td>
						<td class="px-4 py-3 text-right text-sm text-gray-500">
							{stock.minStock ?? '—'}
						</td>
						<td class="px-4 py-3 text-right text-sm text-gray-500">
							{formatXOF(stock.pump ?? 0)}
						</td>
						<td class="px-4 py-3 text-right text-sm font-medium text-gray-900">
							{formatXOF(stock.valuation ?? 0)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</Card>

<!-- Recent movements -->
<Card class="overflow-hidden p-0">
	<div class="px-4 pt-4 pb-2">
		<h2 class="text-lg font-semibold text-gray-900">Mouvements recents</h2>
	</div>
	{#if data.recentMovements.length === 0}
		<p class="px-4 pb-4 text-sm text-gray-500">Aucun mouvement enregistre pour ce produit.</p>
	{:else}
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
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Utilisateur</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.recentMovements as m (m.id)}
					<tr class="hover:bg-gray-50">
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{formatDate(m.createdAt)}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{m.warehouse?.name ?? '—'}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap">
							<Badge variant={typeBadge[m.type]?.variant ?? 'default'}>
								{typeBadge[m.type]?.label ?? m.type}
							</Badge>
						</td>
						<td
							class="px-4 py-3 text-sm whitespace-nowrap text-right font-medium text-gray-900"
						>
							{m.quantity.toLocaleString('fr-FR')}
						</td>
						<td class="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
							{m.reason}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-400 font-mono">
							{m.reference ?? '—'}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{m.user?.name ?? '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data.recentMovements as m (m.id)}
				<div class="p-4">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm text-gray-500">{formatDate(m.createdAt)}</span>
						<Badge variant={typeBadge[m.type]?.variant ?? 'default'}>
							{typeBadge[m.type]?.label ?? m.type}
						</Badge>
					</div>
					<p class="text-sm text-gray-500">{m.warehouse?.name ?? '—'}</p>
					<div class="mt-2 flex items-center justify-between text-sm">
						<span class="text-gray-500">{m.reason}</span>
						<span class="font-medium text-gray-900">{m.quantity.toLocaleString('fr-FR')}</span>
					</div>
					<div class="mt-1 flex items-center justify-between text-xs text-gray-500">
						<span>{m.user?.name ?? '—'}</span>
						{#if m.reference}
							<span class="font-mono">{m.reference}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
