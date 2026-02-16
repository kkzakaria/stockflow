<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, Card, ConfirmModal } from '$lib/components/ui';
	import { formatDate } from '$lib/utils/format';

	let { data, form } = $props();
	let loading = $state(false);

	// Cast form to avoid discriminated union narrowing issues
	const formResult = $derived(
		form as
			| {
					error?: string;
			  }
			| null
			| undefined
	);

	// Modal state for validation confirmation
	let showValidateConfirm = $state(false);

	type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

	const statusBadge: Record<string, { label: string; variant: BadgeVariant }> = {
		in_progress: { label: 'En cours', variant: 'info' },
		validated: { label: 'Valide', variant: 'success' }
	};

	function getStatusBadge(status: string) {
		return statusBadge[status] ?? { label: status, variant: 'default' as BadgeVariant };
	}

	// Compute variance summary for validation modal
	const varianceSummary = $derived.by(() => {
		let matches = 0;
		let positives = 0;
		let negatives = 0;
		let totalDiff = 0;

		for (const item of data.items) {
			if (item.difference === null || item.difference === undefined) continue;
			if (item.difference === 0) matches++;
			else if (item.difference > 0) positives++;
			else negatives++;
			totalDiff += item.difference;
		}

		return { matches, positives, negatives, totalDiff };
	});

	// Track counted items progress
	const progress = $derived.by(() => {
		const total = data.items.length;
		const counted = data.items.filter((item) => item.countedQuantity !== null).length;
		return { total, counted };
	});

	function getDifferenceColor(diff: number | null | undefined): string {
		if (diff === null || diff === undefined) return '';
		if (diff === 0) return 'text-green-600';
		if (diff > 0) return 'text-blue-600';
		return 'text-red-600';
	}

	function getDifferenceLabel(diff: number | null | undefined): string {
		if (diff === null || diff === undefined) return '—';
		if (diff === 0) return '0';
		return diff > 0 ? `+${diff}` : String(diff);
	}
</script>

<PageHeader title="Session d'inventaire">
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/inventory'))}>
			Retour a la liste
		</Button>
	{/snippet}
</PageHeader>

{#if formResult?.error}
	<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
		{formResult.error}
	</div>
{/if}

<div class="grid gap-6 lg:grid-cols-3">
	<!-- Main content -->
	<div class="space-y-6 lg:col-span-2">
		<!-- Inventory info card -->
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">
						{data.inventory.warehouseName}
					</h2>
					<p class="mt-1 text-sm text-gray-500">
						Cree par {data.inventory.createdByName}
						le {formatDate(data.inventory.createdAt)}
					</p>
					{#if data.inventory.validatedByName}
						<p class="mt-1 text-sm text-gray-500">
							Valide par {data.inventory.validatedByName}
							le {formatDate(data.inventory.validatedAt)}
						</p>
					{/if}
				</div>
				<Badge variant={getStatusBadge(data.inventory.status).variant}>
					{getStatusBadge(data.inventory.status).label}
				</Badge>
			</div>
			<div class="mt-4">
				<div
					class="flex items-center gap-2 text-sm {progress.counted === progress.total &&
					progress.total > 0
						? 'font-medium text-green-600'
						: 'text-gray-500'}"
				>
					Progression : {progress.counted}/{progress.total} articles comptes
				</div>
				{#if progress.total > 0}
					<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
						<div
							class="h-full rounded-full transition-all duration-300
								{progress.counted === progress.total ? 'bg-green-500' : 'bg-blue-500'}"
							style="width: {(progress.counted / progress.total) * 100}%"
						></div>
					</div>
				{/if}
			</div>
		</Card>

		<!-- Items table with counting form -->
		{#if data.canCount}
			<form
				method="POST"
				action="?/count"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<Card class="overflow-hidden p-0">
					<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
						<h3 class="text-sm font-semibold text-gray-900">
							Articles ({data.items.length})
						</h3>
						<Button type="submit" size="sm" {loading}>
							Enregistrer les comptages
						</Button>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Produit
									</th>
									<th
										class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										SKU
									</th>
									<th
										class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Qte comptee
									</th>
									{#if data.items.some((item) => item.countedQuantity !== null)}
										<th
											class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
										>
											Qte systeme
										</th>
										<th
											class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
										>
											Ecart
										</th>
									{/if}
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200">
								{#each data.items as item, i (item.id)}
									<tr
										class={item.countedQuantity !== null && item.difference !== 0
											? 'bg-yellow-50'
											: ''}
									>
										<td class="px-4 py-3 text-sm">
											<input type="hidden" name={`items[${i}].id`} value={item.id} />
											<span class="font-medium text-gray-900">{item.productName}</span>
										</td>
										<td class="px-4 py-3 text-xs font-mono text-gray-400">
											{item.productSku}
										</td>
										<td class="px-4 py-3 text-right">
											<input
												name={`items[${i}].countedQuantity`}
												type="number"
												min="0"
												step="1"
												class="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none"
												placeholder="—"
												value={item.countedQuantity ?? ''}
											/>
										</td>
										{#if data.items.some((it) => it.countedQuantity !== null)}
											<td class="px-4 py-3 text-right text-sm text-gray-500">
												{item.countedQuantity !== null ? item.systemQuantity : '—'}
											</td>
											<td
												class="px-4 py-3 text-right text-sm font-medium {getDifferenceColor(
													item.difference
												)}"
											>
												{getDifferenceLabel(item.difference)}
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="border-t border-gray-200 px-4 py-3">
						<Button type="submit" {loading}>
							Enregistrer les comptages
						</Button>
					</div>
				</Card>
			</form>
		{:else}
			<!-- Read-only view (validated or no write permission) -->
			<Card class="overflow-hidden p-0">
				<div class="border-b border-gray-200 px-4 py-3">
					<h3 class="text-sm font-semibold text-gray-900">
						Articles ({data.items.length})
					</h3>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Produit
								</th>
								<th
									class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									SKU
								</th>
								<th
									class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Qte systeme
								</th>
								<th
									class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Qte comptee
								</th>
								<th
									class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Ecart
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each data.items as item (item.id)}
								{@const hasDiff = item.difference !== null && item.difference !== 0}
								<tr class={hasDiff ? 'bg-yellow-50' : ''}>
									<td class="px-4 py-3 text-sm">
										<span class="font-medium text-gray-900">{item.productName}</span>
									</td>
									<td class="px-4 py-3 text-xs font-mono text-gray-400">
										{item.productSku}
									</td>
									<td class="px-4 py-3 text-right text-sm text-gray-500">
										{item.systemQuantity}
									</td>
									<td class="px-4 py-3 text-right text-sm text-gray-900">
										{item.countedQuantity ?? '—'}
									</td>
									<td
										class="px-4 py-3 text-right text-sm font-medium {getDifferenceColor(
											item.difference
										)}"
									>
										{getDifferenceLabel(item.difference)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</Card>
		{/if}
	</div>

	<!-- Sidebar -->
	<div class="space-y-6">
		<!-- Actions -->
		{#if data.canValidate}
			<Card>
				<h3 class="mb-4 text-sm font-semibold text-gray-900">Actions</h3>
				<Button
					class="w-full"
					onclick={() => {
						showValidateConfirm = true;
					}}
				>
					Valider l'inventaire
				</Button>
				<p class="mt-2 text-xs text-gray-500">
					La validation generera des mouvements d'ajustement pour corriger les ecarts.
				</p>
			</Card>
		{/if}

		<!-- Variance summary (if there are counted items) -->
		{#if progress.counted > 0}
			<Card>
				<h3 class="mb-3 text-sm font-semibold text-gray-900">Resume des ecarts</h3>
				<div class="space-y-2 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-gray-500">Correspondances</span>
						<span class="font-medium text-green-600">{varianceSummary.matches}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-500">Excedents (+)</span>
						<span class="font-medium text-blue-600">{varianceSummary.positives}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-500">Manquants (-)</span>
						<span class="font-medium text-red-600">{varianceSummary.negatives}</span>
					</div>
					<div class="border-t border-gray-200 pt-2">
						<div class="flex items-center justify-between">
							<span class="font-medium text-gray-700">Ecart total</span>
							<span
								class="font-semibold {varianceSummary.totalDiff === 0
									? 'text-green-600'
									: varianceSummary.totalDiff > 0
										? 'text-blue-600'
										: 'text-red-600'}"
							>
								{varianceSummary.totalDiff > 0 ? '+' : ''}{varianceSummary.totalDiff}
							</span>
						</div>
					</div>
				</div>
			</Card>
		{/if}
	</div>
</div>

<!-- Validate Confirmation Modal -->
<ConfirmModal
	bind:open={showValidateConfirm}
	title="Valider l'inventaire"
	message="La validation generera des mouvements d'ajustement pour les {varianceSummary.positives + varianceSummary.negatives} article(s) avec ecart. {varianceSummary.matches} article(s) correspondent. Ecart total : {varianceSummary.totalDiff > 0 ? '+' : ''}{varianceSummary.totalDiff}. Confirmer la validation ?"
	confirmLabel="Valider"
	variant="primary"
	{loading}
	onconfirm={() => {
		const form = document.getElementById('validate-form') as HTMLFormElement;
		form?.requestSubmit();
	}}
	oncancel={() => {
		showValidateConfirm = false;
	}}
/>
<form
	id="validate-form"
	method="POST"
	action="?/validate"
	class="hidden"
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			showValidateConfirm = false;
			await update();
		};
	}}
></form>
