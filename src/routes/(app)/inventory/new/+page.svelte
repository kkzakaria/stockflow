<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Card, Select } from '$lib/components/ui';

	let { data, form } = $props();
	let loading = $state(false);

	// Cast form to avoid discriminated union narrowing issues
	const formData = $derived(
		form as
			| {
					data?: Record<string, string>;
					errors?: Record<string, string[]>;
			  }
			| null
			| undefined
	);
</script>

<PageHeader
	title="Nouvelle session d'inventaire"
	description="Demarrez un comptage physique pour un entrepot"
>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/inventory'))}>Annuler</Button>
	{/snippet}
</PageHeader>

<Card class="max-w-xl">
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
			<!-- Warehouse selection -->
			<Select
				name="warehouseId"
				label="Entrepot *"
				value={formData?.data?.warehouseId ?? ''}
				error={formData?.errors?.warehouseId?.[0]}
				required
			>
				<option value="">-- Selectionner un entrepot --</option>
				{#each data.warehouses as warehouse (warehouse.id)}
					<option value={warehouse.id}>{warehouse.name}</option>
				{/each}
			</Select>

			<div class="rounded-md border border-blue-200 bg-blue-50 p-3">
				<p class="text-sm text-blue-700">
					Tous les produits en stock dans l'entrepot selectionne seront inclus dans la
					session d'inventaire. Les quantites systeme seront enregistrees au moment de
					la creation.
				</p>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => goto(resolve('/inventory'))}>Annuler</Button>
			<Button type="submit" {loading}>Demarrer la session</Button>
		</div>
	</form>
</Card>
