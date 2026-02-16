<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Card, Input, Select } from '$lib/components/ui';

	let { data, form } = $props();
	let loading = $state(false);

	// Cast form to avoid discriminated union narrowing issues
	const formData = $derived(
		form as
			| {
					data?: Record<string, string>;
					items?: { productId: string; quantityRequested: number }[];
					errors?: Record<string, string[]>;
					error?: string;
			  }
			| null
			| undefined
	);

	// Dynamic items list — initialized empty, restored from form data via effect
	let items = $state<{ productId: string; quantityRequested: string }[]>([
		{ productId: '', quantityRequested: '' }
	]);

	// Restore items from form data on re-render after server action
	$effect(() => {
		if (formData?.items && formData.items.length > 0) {
			items = formData.items.map((item) => ({
				productId: item.productId,
				quantityRequested: String(item.quantityRequested)
			}));
		}
	});

	let selectedSource = $state('');

	// Restore selected source from form data
	$effect(() => {
		if (formData?.data?.sourceWarehouseId) {
			selectedSource = formData.data.sourceWarehouseId;
		}
	});

	const filteredDestinations = $derived(
		data.warehouses.filter((w) => w.id !== selectedSource)
	);

	function addItem() {
		items = [...items, { productId: '', quantityRequested: '' }];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
	}

	function getAvailableStock(productId: string): number | null {
		if (!selectedSource || !productId) return null;
		const stockMap = data.stockMap as Record<string, Record<string, number>>;
		return stockMap[productId]?.[selectedSource] ?? 0;
	}
</script>

<PageHeader
	title="Nouveau transfert"
	description="Creez un transfert inter-entrepots"
>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/transfers'))}>Annuler</Button>
	{/snippet}
</PageHeader>

<Card class="max-w-3xl">
	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		<div class="space-y-6">
			<!-- Warehouses -->
			<div class="grid gap-4 sm:grid-cols-2">
				<Select
					name="sourceWarehouseId"
					label="Entrepot source *"
					value={formData?.data?.sourceWarehouseId ?? selectedSource}
					error={formData?.errors?.sourceWarehouseId?.[0]}
					onchange={(e) => {
						selectedSource = e.currentTarget.value;
					}}
					required
				>
					<option value="">-- Selectionner la source --</option>
					{#each data.warehouses as warehouse (warehouse.id)}
						<option value={warehouse.id}>{warehouse.name}</option>
					{/each}
				</Select>

				<Select
					name="destinationWarehouseId"
					label="Entrepot destination *"
					value={formData?.data?.destinationWarehouseId ?? ''}
					error={formData?.errors?.destinationWarehouseId?.[0]}
					required
				>
					<option value="">-- Selectionner la destination --</option>
					{#each filteredDestinations as warehouse (warehouse.id)}
						<option value={warehouse.id}>{warehouse.name}</option>
					{/each}
				</Select>
			</div>

			<!-- Items -->
			<fieldset class="space-y-3">
				<legend class="block text-sm font-medium text-gray-700">Articles *</legend>
				{#if formData?.errors?.items?.[0]}
					<p class="text-sm text-red-600">{formData.errors.items[0]}</p>
				{/if}

				{#each items as item, index (index)}
					<div class="flex items-end gap-3">
						<div class="flex-1">
							<Select
								name={`items[${index}].productId`}
								label={index === 0 ? 'Produit' : undefined}
								value={item.productId}
								onchange={(e) => {
									items[index].productId = e.currentTarget.value;
								}}
								required
							>
								<option value="">-- Produit --</option>
								{#each data.products as product (product.id)}
									<option value={product.id}>{product.sku} - {product.name}</option>
								{/each}
							</Select>
						</div>
						<div class="w-28">
							<Input
								name={`items[${index}].quantityRequested`}
								type="number"
								label={index === 0 ? 'Quantite' : undefined}
								placeholder="0"
								min="1"
								step="1"
								value={item.quantityRequested}
								oninput={(e) => {
									items[index].quantityRequested = e.currentTarget.value;
								}}
								required
							/>
						</div>
						<div class="flex items-center gap-2">
							{#if getAvailableStock(item.productId) !== null}
								<span class="text-xs whitespace-nowrap text-gray-500">
									Stock: {getAvailableStock(item.productId)}
								</span>
							{/if}
							{#if items.length > 1}
								<button
									type="button"
									class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
									onclick={() => removeItem(index)}
									aria-label="Supprimer l'article"
								>
									<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							{/if}
						</div>
					</div>
				{/each}

				<Button variant="ghost" size="sm" onclick={addItem}>
					+ Ajouter un produit
				</Button>
			</fieldset>

			<!-- Notes -->
			<div class="space-y-1">
				<label for="notes" class="block text-sm font-medium text-gray-700">Notes</label>
				<textarea
					id="notes"
					name="notes"
					rows="3"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none"
					placeholder="Notes optionnelles pour ce transfert..."
					value={formData?.data?.notes ?? ''}
				></textarea>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => goto(resolve('/transfers'))}>Annuler</Button>
			<Button type="submit" {loading}>Creer le transfert</Button>
		</div>
	</form>
</Card>
