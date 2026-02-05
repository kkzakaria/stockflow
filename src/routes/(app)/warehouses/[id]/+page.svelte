<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Card, Badge, ConfirmModal } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	let editing = $state(false);
	let loading = $state(false);
	let showDeleteModal = $state(false);

	function formatXOF(amount: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'XOF',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	const roleBadgeVariant: Record<string, 'default' | 'success' | 'info' | 'warning' | 'danger'> = {
		admin: 'danger',
		admin_manager: 'warning',
		manager: 'info',
		user: 'default',
		admin_viewer: 'success',
		viewer: 'default'
	};

	$effect(() => {
		if (form?.success) {
			editing = false;
			toast.success('Entrepot mis a jour');
		}
		if (form?.deleteError) {
			toast.error(form.deleteError);
		}
	});
</script>

<PageHeader title={data.warehouse.name} description={data.warehouse.address ?? 'Aucune adresse'}>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/warehouses'))}>&larr; Retour</Button>
		{#if data.canEdit}
			{#if editing}
				<Button variant="secondary" onclick={() => (editing = false)}>Annuler</Button>
			{:else}
				<Button variant="secondary" onclick={() => (editing = true)}>Modifier</Button>
				<Button variant="danger" onclick={() => (showDeleteModal = true)}>Supprimer</Button>
			{/if}
		{/if}
	{/snippet}
</PageHeader>

<div class="grid gap-6 lg:grid-cols-3">
	<!-- Stats -->
	<Card>
		<h3 class="mb-4 font-semibold text-gray-900">Statistiques du stock</h3>
		<div class="space-y-4">
			<div class="flex justify-between">
				<span class="text-gray-500">Produits</span>
				<span class="font-semibold">{data.stats.productCount}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-500">Quantite totale</span>
				<span class="font-semibold">{data.stats.totalQuantity} unites</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-500">Valeur du stock</span>
				<span class="font-semibold text-blue-600">{formatXOF(data.stats.totalValue)}</span>
			</div>
		</div>
	</Card>

	<!-- Details / Edit Form -->
	<Card class="lg:col-span-2">
		{#if editing}
			<h3 class="mb-4 font-semibold text-gray-900">Modifier l'entrepot</h3>
			<form
				method="POST"
				action="?/update"
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
						label="Nom *"
						value={form?.data?.name ?? data.warehouse.name}
						error={form?.errors?.name?.[0]}
						required
					/>
					<Input
						name="address"
						label="Adresse"
						value={form?.data?.address ?? data.warehouse.address ?? ''}
						error={form?.errors?.address?.[0]}
					/>
					<div class="grid gap-4 sm:grid-cols-2">
						<Input
							name="contactName"
							label="Nom du contact"
							value={form?.data?.contactName ?? data.warehouse.contactName ?? ''}
							error={form?.errors?.contactName?.[0]}
						/>
						<Input
							name="contactPhone"
							label="Telephone"
							value={form?.data?.contactPhone ?? data.warehouse.contactPhone ?? ''}
							error={form?.errors?.contactPhone?.[0]}
						/>
					</div>
					<Input
						name="contactEmail"
						type="email"
						label="Email"
						value={form?.data?.contactEmail ?? data.warehouse.contactEmail ?? ''}
						error={form?.errors?.contactEmail?.[0]}
					/>
				</div>
				<div class="mt-6 flex justify-end">
					<Button type="submit" {loading}>Enregistrer</Button>
				</div>
			</form>
		{:else}
			<h3 class="mb-4 font-semibold text-gray-900">Informations</h3>
			<dl class="space-y-3">
				<div class="flex justify-between">
					<dt class="text-gray-500">Nom</dt>
					<dd class="font-medium">{data.warehouse.name}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Adresse</dt>
					<dd>{data.warehouse.address || '\u2014'}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Contact</dt>
					<dd>{data.warehouse.contactName || '\u2014'}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Telephone</dt>
					<dd>{data.warehouse.contactPhone || '\u2014'}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Email</dt>
					<dd>{data.warehouse.contactEmail || '\u2014'}</dd>
				</div>
			</dl>
		{/if}
	</Card>
</div>

<!-- Assigned Users -->
<Card class="mt-6">
	<h3 class="mb-4 font-semibold text-gray-900">Utilisateurs assignes</h3>
	{#if data.assignedUsers.length === 0}
		<p class="text-sm text-gray-500">Aucun utilisateur assigne a cet entrepot.</p>
	{:else}
		<div class="divide-y divide-gray-100">
			{#each data.assignedUsers as u (u.id)}
				<div class="flex items-center justify-between py-3">
					<div>
						<p class="font-medium text-gray-900">{u.name}</p>
						<p class="text-sm text-gray-500">{u.email}</p>
					</div>
					<Badge variant={roleBadgeVariant[u.role ?? 'viewer'] ?? 'default'}>
						{u.role ?? 'viewer'}
					</Badge>
				</div>
			{/each}
		</div>
	{/if}
</Card>

<!-- Delete Confirmation Modal -->
<ConfirmModal
	bind:open={showDeleteModal}
	title="Supprimer l'entrepot"
	message="Etes-vous sur de vouloir supprimer cet entrepot ? Cette action est irreversible."
	confirmLabel="Supprimer"
	variant="danger"
	oncancel={() => (showDeleteModal = false)}
	onconfirm={() => {
		const deleteForm = document.createElement('form');
		deleteForm.method = 'POST';
		deleteForm.action = '?/delete';
		document.body.appendChild(deleteForm);
		deleteForm.submit();
	}}
/>
