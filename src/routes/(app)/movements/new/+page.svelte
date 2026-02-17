<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Card, Input, Select } from '$lib/components/ui';
	import BarcodeScanner from '$lib/components/scan/BarcodeScanner.svelte';
	import { MOVEMENT_REASONS } from '$lib/validators/movement';

	let { data, form } = $props();
	let loading = $state(false);
	let showScanner = $state(false);
	let scanError = $state('');
	let scannedProductId = $state('');

	function handleScan(code: string) {
		scanError = '';
		const match = data.products.find(
			(p) => p.sku?.toLowerCase() === code.trim().toLowerCase()
		);
		if (match) {
			scannedProductId = match.id;
			showScanner = false;
			scanError = '';
		} else {
			scanError = `Aucun produit trouve pour le code "${code}"`;
		}
	}

	// Cast form to avoid discriminated union narrowing issues across fail() return shapes
	const formData = $derived(
		form as
			| {
					data?: Record<string, string | number | undefined>;
					errors?: Record<string, string[]>;
					error?: string;
			  }
			| null
			| undefined
	);

	const productId = $derived(
		scannedProductId || (formData?.data?.productId as string) || data.preselected.productId || ''
	);

	let selectedType = $state('in');
	$effect(() => {
		if (formData?.data?.type) {
			selectedType = formData.data.type as string;
		}
	});

	const isEntryType = $derived(selectedType === 'in' || selectedType === 'adjustment_in');

	const typeOptions = [
		{ value: 'in', label: 'Entree', group: 'principal' },
		{ value: 'out', label: 'Sortie', group: 'principal' },
		{ value: 'adjustment_in', label: 'Ajustement +', group: 'ajustement' },
		{ value: 'adjustment_out', label: 'Ajustement -', group: 'ajustement' }
	] as const;

	const reasonLabels: Record<string, string> = {
		achat: 'Achat',
		vente: 'Vente',
		retour: 'Retour',
		perte: 'Perte',
		ajustement: 'Ajustement',
		transfert: 'Transfert',
		autre: 'Autre'
	};
</script>

<PageHeader
	title="Nouveau mouvement"
	description="Enregistrez une entree ou une sortie de stock"
>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/movements'))}>Annuler</Button>
	{/snippet}
</PageHeader>

<Card class="max-w-2xl">
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
		<div class="space-y-4">
			<Select
				name="warehouseId"
				label="Entrepot *"
				value={formData?.data?.warehouseId ?? data.preselected.warehouseId}
				error={formData?.errors?.warehouseId?.[0]}
				required
			>
				<option value="">-- Selectionner un entrepot --</option>
				{#each data.warehouses as warehouse (warehouse.id)}
					<option value={warehouse.id}>{warehouse.name}</option>
				{/each}
			</Select>

			<div>
				<div class="flex items-end gap-2">
					<div class="flex-1">
						<Select
							name="productId"
							label="Produit *"
							value={productId}
							onchange={(e) => {
								scannedProductId = e.currentTarget.value;
							}}
							error={formData?.errors?.productId?.[0]}
							required
						>
							<option value="">-- Selectionner un produit --</option>
							{#each data.products as product (product.id)}
								<option value={product.id}>{product.sku} - {product.name}</option>
							{/each}
						</Select>
					</div>
					<button
						type="button"
						onclick={() => {
							showScanner = !showScanner;
							scanError = '';
						}}
						class="mb-0.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
						title="Scanner un code-barres"
					>
						{showScanner ? 'Fermer' : 'Scanner'}
					</button>
				</div>
				{#if showScanner}
					<div class="mt-2">
						<BarcodeScanner
							onscan={handleScan}
							onerror={(msg) => {
								scanError = msg;
							}}
						/>
					</div>
				{/if}
				{#if scanError}
					<p class="mt-1 text-sm text-red-600" role="alert">{scanError}</p>
				{/if}
			</div>

			<fieldset class="space-y-1">
				<legend class="block text-sm font-medium text-gray-700">Type de mouvement *</legend>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{#each typeOptions as option (option.value)}
						<label
							class="flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors
								{selectedType === option.value
								? option.value === 'in' || option.value === 'adjustment_in'
									? 'border-green-500 bg-green-50 text-green-700'
									: 'border-red-500 bg-red-50 text-red-700'
								: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
						>
							<input
								type="radio"
								name="type"
								value={option.value}
								bind:group={selectedType}
								class="sr-only"
								required
							/>
							{option.label}
						</label>
					{/each}
				</div>
				{#if formData?.errors?.type?.[0]}
					<p class="text-sm text-red-600">{formData?.errors?.type?.[0]}</p>
				{/if}
			</fieldset>

			<Input
				name="quantity"
				type="number"
				label="Quantite *"
				placeholder="0"
				min="1"
				step="1"
				value={formData?.data?.quantity ?? ''}
				error={formData?.errors?.quantity?.[0]}
				class="text-lg"
				required
			/>

			<Select
				name="reason"
				label="Motif *"
				value={formData?.data?.reason ?? ''}
				error={formData?.errors?.reason?.[0]}
				required
			>
				<option value="">-- Selectionner un motif --</option>
				{#each MOVEMENT_REASONS as reason (reason)}
					<option value={reason}>{reasonLabels[reason] ?? reason}</option>
				{/each}
			</Select>

			{#if isEntryType}
				<Input
					name="purchasePrice"
					type="number"
					label="Prix d'achat unitaire (XOF) *"
					placeholder="0"
					min="0"
					step="1"
					value={formData?.data?.purchasePrice ?? ''}
					error={formData?.errors?.purchasePrice?.[0]}
					hint="Ce prix sera utilise pour le calcul du PUMP"
					required
				/>
			{/if}

			<Input
				name="reference"
				label="Reference"
				placeholder="N de facture, bon de livraison..."
				value={formData?.data?.reference ?? ''}
				error={formData?.errors?.reference?.[0]}
			/>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => goto(resolve('/movements'))}>Annuler</Button>
			<Button type="submit" {loading}>Enregistrer le mouvement</Button>
		</div>
	</form>
</Card>
