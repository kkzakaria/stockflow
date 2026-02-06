<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Card, Button, EmptyState } from '$lib/components/ui';

	let { data } = $props();

	function formatXOF(amount: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'XOF',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<PageHeader title="Entrepots" description="Gerez vos entrepots et visualisez leurs stocks">
	{#snippet actions()}
		{#if data.user.role === 'admin'}
			<Button onclick={() => goto(resolve('/warehouses/new'))}>+ Nouvel entrepot</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if data.warehouses.length === 0}
	<EmptyState
		icon="🏭"
		title="Aucun entrepot"
		description="Vous n'avez acces a aucun entrepot pour le moment."
	>
		{#snippet action()}
			{#if data.user.role === 'admin'}
				<Button onclick={() => goto(resolve('/warehouses/new'))}>Creer un entrepot</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.warehouses as warehouse (warehouse.id)}
			<Card class="cursor-pointer transition-shadow hover:shadow-md">
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div onclick={() => goto(resolve(`/warehouses/${warehouse.id}`))}>
					<div class="mb-3 flex items-start justify-between">
						<div>
							<h3 class="font-semibold text-gray-900">{warehouse.name}</h3>
							{#if warehouse.address}
								<p class="mt-1 text-sm text-gray-500">{warehouse.address}</p>
							{/if}
						</div>
						<span class="text-2xl">🏭</span>
					</div>

					<div class="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
						<div class="text-center">
							<p class="text-lg font-semibold text-gray-900">{warehouse.productCount}</p>
							<p class="text-xs text-gray-500">Produits</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-semibold text-gray-900">{warehouse.totalQuantity}</p>
							<p class="text-xs text-gray-500">Unites</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-semibold text-blue-600">{formatXOF(warehouse.totalValue)}</p>
							<p class="text-xs text-gray-500">Valeur</p>
						</div>
					</div>
				</div>
			</Card>
		{/each}
	</div>
{/if}
