<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, Card, EmptyState } from '$lib/components/ui';
	import { formatDate } from '$lib/utils/format';

	let { data } = $props();

	const statusTabs = [
		{ value: '', label: 'Tous' },
		{ value: 'pending', label: 'En attente' },
		{ value: 'approved', label: 'Approuve' },
		{ value: 'shipped', label: 'Expedie' },
		{ value: 'received', label: 'Recu' },
		{ value: 'disputed', label: 'Litige' }
	] as const;

	type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

	const statusBadge: Record<string, { label: string; variant: BadgeVariant }> = {
		pending: { label: 'En attente', variant: 'warning' },
		approved: { label: 'Approuve', variant: 'info' },
		rejected: { label: 'Rejete', variant: 'danger' },
		shipped: { label: 'Expedie', variant: 'info' },
		received: { label: 'Recu', variant: 'success' },
		partially_received: { label: 'Partiel', variant: 'warning' },
		cancelled: { label: 'Annule', variant: 'default' },
		disputed: { label: 'Litige', variant: 'danger' },
		resolved: { label: 'Resolu', variant: 'success' }
	};

	function getStatusBadge(status: string) {
		return statusBadge[status] ?? { label: status, variant: 'default' as BadgeVariant };
	}

	const activeStatus = $derived(data.status ?? '');
	const dateFrom = $derived(data.dateFrom ?? '');
	const dateTo = $derived(data.dateTo ?? '');

	function buildParams(overrides: { status?: string; dateFrom?: string; dateTo?: string } = {}) {
		const params = new URLSearchParams();
		const s = overrides.status ?? activeStatus;
		const from = overrides.dateFrom ?? dateFrom;
		const to = overrides.dateTo ?? dateTo;
		if (s) params.set('status', s);
		if (from) params.set('dateFrom', from);
		if (to) params.set('dateTo', to);
		return params;
	}

	function filterByStatus(status: string) {
		const params = buildParams({ status });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/transfers${params.toString() ? '?' + params.toString() : ''}`);
	}

	function filterByDate(from: string, to: string) {
		const params = buildParams({ dateFrom: from, dateTo: to });
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`/transfers${params.toString() ? '?' + params.toString() : ''}`);
	}
</script>

<PageHeader title="Transferts" description="Transferts inter-entrepots">
	{#snippet actions()}
		{#if data.canCreate}
			<Button
				onclick={() => {
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					goto('/transfers/new');
				}}>+ Nouveau transfert</Button
			>
		{/if}
	{/snippet}
</PageHeader>

<!-- Status filter tabs -->
<div class="mb-4 flex flex-wrap gap-2">
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

<!-- Date filter -->
<div class="mb-6 flex flex-wrap items-center gap-3">
	<label class="flex items-center gap-1.5 text-sm text-gray-600">
		Du
		<input
			type="date"
			class="rounded-md border border-gray-300 px-2 py-1 text-sm"
			value={dateFrom}
			onchange={(e) => {
				filterByDate(e.currentTarget.value, dateTo);
			}}
		/>
	</label>
	<label class="flex items-center gap-1.5 text-sm text-gray-600">
		Au
		<input
			type="date"
			class="rounded-md border border-gray-300 px-2 py-1 text-sm"
			value={dateTo}
			onchange={(e) => {
				filterByDate(dateFrom, e.currentTarget.value);
			}}
		/>
	</label>
	{#if dateFrom || dateTo}
		<button
			type="button"
			class="text-sm text-blue-600 hover:text-blue-800"
			onclick={() => {
				filterByDate('', '');
			}}
		>
			Effacer dates
		</button>
	{/if}
</div>

{#if data.transfers.length === 0}
	<EmptyState
		icon="🔄"
		title="Aucun transfert"
		description="Aucun transfert ne correspond a vos criteres."
	>
		{#snippet action()}
			{#if data.canCreate}
				<Button
					onclick={() => {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						goto('/transfers/new');
					}}>Creer un transfert</Button
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
						>Source</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Destination</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Date</th
					>
					<th
						class="px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Articles</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Statut</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.transfers as t (t.id)}
					<tr
						class="cursor-pointer hover:bg-gray-50"
						onclick={() => {
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/transfers/${t.id}`);
						}}
					>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
							{t.sourceWarehouseName}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
							{t.destinationWarehouseName}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
							{formatDate(t.requestedAt)}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-center text-gray-500">
							{t.itemCount}
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap">
							<Badge variant={getStatusBadge(t.status).variant}>
								{getStatusBadge(t.status).label}
							</Badge>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data.transfers as t (t.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div
					class="cursor-pointer p-4 hover:bg-gray-50"
					onclick={() => {
						// eslint-disable-next-line svelte/no-navigation-without-resolve
						goto(`/transfers/${t.id}`);
					}}
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="text-sm font-medium text-gray-900">
							{t.sourceWarehouseName}
							<span class="mx-1 text-gray-400">&rarr;</span>
							{t.destinationWarehouseName}
						</div>
						<Badge variant={getStatusBadge(t.status).variant}>
							{getStatusBadge(t.status).label}
						</Badge>
					</div>
					<div class="flex items-center justify-between text-xs text-gray-500">
						<span>{formatDate(t.requestedAt)}</span>
						<span>{t.itemCount} article{t.itemCount > 1 ? 's' : ''}</span>
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
				({data.pagination.total} transferts)
			</p>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					<Button
						variant="secondary"
						onclick={() => {
							const params = buildParams();
							params.set('page', String(data.pagination.page - 1));
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/transfers?${params.toString()}`);
						}}>Precedent</Button
					>
				{/if}
				{#if data.pagination.page < Math.ceil(data.pagination.total / data.pagination.limit)}
					<Button
						variant="secondary"
						onclick={() => {
							const params = buildParams();
							params.set('page', String(data.pagination.page + 1));
							// eslint-disable-next-line svelte/no-navigation-without-resolve
							goto(`/transfers?${params.toString()}`);
						}}>Suivant</Button
					>
				{/if}
			</div>
		</div>
	{/if}
{/if}
