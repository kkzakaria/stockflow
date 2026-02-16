<script lang="ts">
	import { goto } from '$app/navigation';
	import { PageHeader, Button, Badge, Card, EmptyState } from '$lib/components/ui';
	import { formatDate } from '$lib/utils/format';

	let { data } = $props();

	const statusTabs = [
		{ value: '', label: 'Tous' },
		{ value: 'in_progress', label: 'En cours' },
		{ value: 'validated', label: 'Valide' }
	] as const;

	type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

	const statusBadge: Record<string, { label: string; variant: BadgeVariant }> = {
		in_progress: { label: 'En cours', variant: 'info' },
		validated: { label: 'Valide', variant: 'success' }
	};

	function getStatusBadge(status: string) {
		return statusBadge[status] ?? { label: status, variant: 'default' as BadgeVariant };
	}

	function filterByStatus(status: string) {
		const params = new URLSearchParams();
		if (status) params.set('status', status);
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/inventory${params.toString() ? '?' + params.toString() : ''}`);
	}
</script>

<PageHeader title="Inventaires" description="Sessions d'inventaire par entrepot">
	{#snippet actions()}
		{#if data.canCreate}
			<Button
				onclick={() => {
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					goto('/inventory/new');
				}}>+ Nouvelle session</Button
			>
		{/if}
	{/snippet}
</PageHeader>

<!-- Status filter tabs -->
<div class="mb-6 flex flex-wrap gap-2">
	{#each statusTabs as tab (tab.value)}
		<button
			type="button"
			class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors
				{data.status === tab.value
				? 'bg-blue-600 text-white'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			onclick={() => filterByStatus(tab.value)}
		>
			{tab.label}
		</button>
	{/each}
</div>

{#if data.inventories.length === 0}
	<EmptyState
		icon="📋"
		title="Aucun inventaire"
		description="Aucune session d'inventaire ne correspond a vos criteres."
	>
		{#snippet action()}
			{#if data.canCreate}
				<Button
					onclick={() => {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						goto('/inventory/new');
					}}>Demarrer un inventaire</Button
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
						>Entrepot</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Cree par</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Date</th
					>
					<th
						class="px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Progression</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Statut</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.inventories as inv (inv.id)}
					<tr
						class="cursor-pointer hover:bg-gray-50"
						onclick={() => {
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/inventory/${inv.id}`);
						}}
					>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
							{inv.warehouseName}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{inv.createdByName}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{formatDate(inv.createdAt)}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-center">
							<span
								class="inline-flex items-center gap-1.5 text-sm {inv.progress.counted ===
									inv.progress.total && inv.progress.total > 0
									? 'font-medium text-green-600'
									: 'text-gray-500'}"
							>
								{inv.progress.counted}/{inv.progress.total}
								<span class="text-xs text-gray-400">articles</span>
							</span>
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap">
							<Badge variant={getStatusBadge(inv.status).variant}>
								{getStatusBadge(inv.status).label}
							</Badge>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data.inventories as inv (inv.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div
					class="cursor-pointer p-4 hover:bg-gray-50"
					onclick={() => {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						goto(`/inventory/${inv.id}`);
					}}
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="text-sm font-medium text-gray-900">
							{inv.warehouseName}
						</div>
						<Badge variant={getStatusBadge(inv.status).variant}>
							{getStatusBadge(inv.status).label}
						</Badge>
					</div>
					<div class="flex items-center justify-between text-xs text-gray-500">
						<span>{formatDate(inv.createdAt)}</span>
						<span>{inv.progress.counted}/{inv.progress.total} articles</span>
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
				({data.pagination.total} inventaire{data.pagination.total > 1 ? 's' : ''})
			</p>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					<Button
						variant="secondary"
						onclick={() => {
							const params = new URLSearchParams();
							if (data.status) params.set('status', data.status);
							params.set('page', String(data.pagination.page - 1));
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/inventory?${params.toString()}`);
						}}>Precedent</Button
					>
				{/if}
				{#if data.pagination.page < Math.ceil(data.pagination.total / data.pagination.limit)}
					<Button
						variant="secondary"
						onclick={() => {
							const params = new URLSearchParams();
							if (data.status) params.set('status', data.status);
							params.set('page', String(data.pagination.page + 1));
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/inventory?${params.toString()}`);
						}}>Suivant</Button
					>
				{/if}
			</div>
		</div>
	{/if}
{/if}
