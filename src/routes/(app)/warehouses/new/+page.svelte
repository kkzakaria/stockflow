<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Card } from '$lib/components/ui';

	let { form } = $props();
	let loading = $state(false);
</script>

<PageHeader title="Nouvel entrepot" description="Creez un nouvel entrepot">
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/warehouses'))}>Annuler</Button>
	{/snippet}
</PageHeader>

<Card class="max-w-2xl">
	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<div class="space-y-4">
			<Input
				name="name"
				label="Nom de l'entrepot *"
				placeholder="Entrepot Principal"
				value={form?.data?.name ?? ''}
				error={form?.errors?.name?.[0]}
				required
			/>

			<Input
				name="address"
				label="Adresse"
				placeholder="123 Rue Exemple, Dakar"
				value={form?.data?.address ?? ''}
				error={form?.errors?.address?.[0]}
			/>

			<div class="grid gap-4 sm:grid-cols-2">
				<Input
					name="contactName"
					label="Nom du contact"
					placeholder="Moussa Diallo"
					value={form?.data?.contactName ?? ''}
					error={form?.errors?.contactName?.[0]}
				/>

				<Input
					name="contactPhone"
					label="Telephone"
					placeholder="+221 77 123 4567"
					value={form?.data?.contactPhone ?? ''}
					error={form?.errors?.contactPhone?.[0]}
				/>
			</div>

			<Input
				name="contactEmail"
				type="email"
				label="Email du contact"
				placeholder="contact@entreprise.com"
				value={form?.data?.contactEmail ?? ''}
				error={form?.errors?.contactEmail?.[0]}
			/>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => goto(resolve('/warehouses'))}>Annuler</Button>
			<Button type="submit" {loading}>Creer l'entrepot</Button>
		</div>
	</form>
</Card>
