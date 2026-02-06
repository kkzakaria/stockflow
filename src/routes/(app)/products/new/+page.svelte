<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Card, Input, Select } from '$lib/components/ui';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<PageHeader title="Nouveau produit" description="Ajoutez un nouveau produit au catalogue">
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/products'))}>Annuler</Button>
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
			<Input
				name="sku"
				label="SKU *"
				placeholder="PRD-001"
				value={form?.data?.sku ?? ''}
				error={form?.errors?.sku?.[0]}
				required
			/>

			<Input
				name="name"
				label="Nom du produit *"
				placeholder="Ciment Portland 50kg"
				value={form?.data?.name ?? ''}
				error={form?.errors?.name?.[0]}
				required
			/>

			<div class="space-y-1">
				<label for="description" class="block text-sm font-medium text-gray-700">
					Description
				</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					placeholder="Description du produit..."
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none"
				>{form?.data?.description ?? ''}</textarea>
				{#if form?.errors?.description?.[0]}
					<p class="text-sm text-red-600">{form.errors.description[0]}</p>
				{/if}
			</div>

			<Select
				name="categoryId"
				label="Categorie"
				value={form?.data?.categoryId ?? ''}
				error={form?.errors?.categoryId?.[0]}
			>
				<option value="">-- Aucune categorie --</option>
				{#each data.categories as category (category.id)}
					<option value={category.id}>{category.name}</option>
				{/each}
			</Select>

			<Input
				name="unit"
				label="Unite"
				placeholder="unite"
				value={form?.data?.unit ?? 'unite'}
				error={form?.errors?.unit?.[0]}
			/>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Input
					name="purchasePrice"
					type="number"
					label="Prix d'achat (XOF)"
					placeholder="0"
					min="0"
					step="1"
					value={form?.data?.purchasePrice ?? 0}
					error={form?.errors?.purchasePrice?.[0]}
				/>

				<Input
					name="salePrice"
					type="number"
					label="Prix de vente (XOF)"
					placeholder="0"
					min="0"
					step="1"
					value={form?.data?.salePrice ?? 0}
					error={form?.errors?.salePrice?.[0]}
				/>
			</div>

			<Input
				name="minStock"
				type="number"
				label="Stock minimum"
				placeholder="0"
				min="0"
				step="1"
				value={form?.data?.minStock ?? 0}
				error={form?.errors?.minStock?.[0]}
			/>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => goto(resolve('/products'))}>Annuler</Button>
			<Button type="submit" {loading}>Creer le produit</Button>
		</div>
	</form>
</Card>
