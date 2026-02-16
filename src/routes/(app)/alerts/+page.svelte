<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { PageHeader, Card, Badge, Button, EmptyState } from '$lib/components/ui';
	import { formatDate } from '$lib/utils/format';

	let { data } = $props();

	const typeFilters = [
		{ label: 'Tous', value: '' },
		{ label: 'Stock bas', value: 'low_stock' },
		{ label: 'Transferts', value: 'transfer_' },
		{ label: 'Inventaire', value: 'inventory_' }
	] as const;

	const alertMeta: Record<
		string,
		{
			icon: string;
			label: string;
			variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
		}
	> = {
		low_stock: { icon: '📦', label: 'Stock bas', variant: 'danger' },
		transfer_pending: { icon: '🔄', label: 'Transfert en attente', variant: 'warning' },
		transfer_approved: { icon: '✅', label: 'Transfert approuvé', variant: 'success' },
		transfer_shipped: { icon: '🚚', label: 'Transfert expédié', variant: 'info' },
		transfer_received: { icon: '📥', label: 'Transfert reçu', variant: 'success' },
		transfer_dispute: { icon: '⚠️', label: 'Litige transfert', variant: 'danger' },
		inventory_started: { icon: '📋', label: 'Inventaire démarré', variant: 'info' }
	};

	function getAlertMeta(type: string) {
		return alertMeta[type] ?? { icon: '🔔', label: type, variant: 'default' as const };
	}

	function navigateToFilter(value: string) {
		const params = new URLSearchParams();
		if (value) params.set('type', value);
		goto(`/alerts${params.toString() ? '?' + params.toString() : ''}`);
	}

	function navigateToPage(page: number) {
		const params = new URLSearchParams();
		params.set('page', String(page));
		if (data.typeFilter) params.set('type', data.typeFilter);
		goto(`/alerts?${params.toString()}`);
	}
</script>

<PageHeader title="Alertes" description="Notifications et alertes du système">
	{#snippet actions()}
		{#if data.unreadCount > 0}
			<form method="POST" action="?/markAllRead" use:enhance>
				<Button type="submit" variant="secondary" size="sm">
					Tout marquer comme lu ({data.unreadCount})
				</Button>
			</form>
		{/if}
	{/snippet}
</PageHeader>

<div class="mb-4 flex gap-2">
	{#each typeFilters as filter (filter.value)}
		<button
			onclick={() => navigateToFilter(filter.value)}
			class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors {data.typeFilter ===
			filter.value
				? 'bg-blue-600 text-white'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			{filter.label}
		</button>
	{/each}
</div>

{#if data.alerts.length === 0}
	<Card>
		<EmptyState
			icon="🔔"
			title="Aucune alerte"
			description="Vous n'avez aucune alerte pour le moment."
		/>
	</Card>
{:else}
	<div class="space-y-2">
		{#each data.alerts as alert (alert.id)}
			{@const meta = getAlertMeta(alert.type)}
			<Card
				class={!alert.isRead
					? 'border-l-4 border-l-blue-500 bg-blue-50/50'
					: ''}
			>
				<div class="flex items-start gap-3">
					<span class="text-2xl">{meta.icon}</span>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant={meta.variant}>
								{meta.label}
							</Badge>
							{#if !alert.isRead}
								<Badge variant="info">Non lu</Badge>
							{/if}
						</div>
						<p class="mt-1 text-sm text-gray-900">{alert.message}</p>
						<p class="mt-1 text-xs text-gray-500">{formatDate(alert.createdAt)}</p>
					</div>
					{#if !alert.isRead}
						<form method="POST" action="?/markRead" use:enhance>
							<input type="hidden" name="alertId" value={alert.id} />
							<Button type="submit" variant="ghost" size="sm">
								Marquer lu
							</Button>
						</form>
					{/if}
				</div>
			</Card>
		{/each}
	</div>

	{#if data.alerts.length >= data.pagination.limit}
		<div class="mt-4 flex justify-center gap-2">
			{#if data.pagination.page > 1}
				<Button
					variant="secondary"
					size="sm"
					onclick={() => navigateToPage(data.pagination.page - 1)}
				>
					Page précédente
				</Button>
			{/if}
			<Button
				variant="secondary"
				size="sm"
				onclick={() => navigateToPage(data.pagination.page + 1)}
			>
				Page suivante
			</Button>
		</div>
	{/if}
{/if}
