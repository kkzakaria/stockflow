<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Select, Card, Badge, ConfirmModal } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast';
	import { SvelteSet } from 'svelte/reactivity';

	let { data, form } = $props();

	let editing = $state(false);
	let editingWarehouses = $state(false);
	let updateLoading = $state(false);
	let warehouseLoading = $state(false);
	let showDeactivateModal = $state(false);
	let deactivateFormEl: HTMLFormElement | undefined = $state();

	const roleLabels: Record<string, string> = {
		admin: 'Administrateur',
		admin_manager: 'Admin Gestionnaire',
		manager: 'Gestionnaire',
		user: 'Utilisateur',
		admin_viewer: 'Admin Visiteur',
		viewer: 'Visiteur'
	};

	const roleBadgeVariant: Record<string, 'default' | 'success' | 'info' | 'warning' | 'danger'> = {
		admin: 'danger',
		admin_manager: 'warning',
		manager: 'info',
		user: 'default',
		admin_viewer: 'success',
		viewer: 'default'
	};

	$effect(() => {
		if (form?.success && form.action === 'update') {
			editing = false;
			toast.success('Utilisateur mis a jour');
		}
		if (form?.success && form.action === 'assignWarehouses') {
			editingWarehouses = false;
			toast.success('Entrepots assignes');
		}
		if (form && 'error' in form && form.error) {
			toast.error(form.error as string);
		}
	});

	let selectedWarehouses = $derived(
		new SvelteSet(data.targetUser.warehouses.map((w: { id: string }) => w.id))
	);

	function toggleWarehouse(id: string) {
		if (selectedWarehouses.has(id)) {
			selectedWarehouses.delete(id);
		} else {
			selectedWarehouses.add(id);
		}
	}
</script>

<PageHeader title={data.targetUser.name} description={data.targetUser.email}>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/users'))}>&larr; Retour</Button>
		{#if !data.isCurrentUser}
			{#if editing}
				<Button variant="secondary" onclick={() => (editing = false)}>Annuler</Button>
			{:else}
				<Button variant="secondary" onclick={() => (editing = true)}>Modifier</Button>
				{#if data.targetUser.isActive}
					<Button variant="danger" onclick={() => (showDeactivateModal = true)}>Desactiver</Button>
				{/if}
			{/if}
		{/if}
	{/snippet}
</PageHeader>

<div class="grid gap-6 lg:grid-cols-2">
	<!-- User Info -->
	<Card>
		{#if editing}
			<h3 class="mb-4 font-semibold text-gray-900">Modifier l'utilisateur</h3>
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					updateLoading = true;
					return async ({ update }) => {
						await update();
						updateLoading = false;
					};
				}}
			>
				<div class="space-y-4">
					<Input
						name="name"
						label="Nom"
						value={form?.action === 'update'
							? (form?.data?.name ?? data.targetUser.name)
							: data.targetUser.name}
						error={form?.action === 'update' ? form?.errors?.name?.[0] : undefined}
						required
					/>

					<Select
						name="role"
						label="Role"
						value={form?.action === 'update'
							? (form?.data?.role ?? data.targetUser.role ?? 'viewer')
							: (data.targetUser.role ?? 'viewer')}
						error={form?.action === 'update' ? form?.errors?.role?.[0] : undefined}
					>
						{#each data.roles as role (role)}
							<option value={role}>{roleLabels[role] ?? role}</option>
						{/each}
					</Select>

					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="isActive"
							name="isActive"
							value="true"
							checked={data.targetUser.isActive ?? false}
							class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label for="isActive" class="text-sm text-gray-700">Compte actif</label>
					</div>
				</div>

				<div class="mt-6 flex justify-end">
					<Button type="submit" loading={updateLoading}>Enregistrer</Button>
				</div>
			</form>
		{:else}
			<h3 class="mb-4 font-semibold text-gray-900">Informations</h3>
			<dl class="space-y-3">
				<div class="flex justify-between">
					<dt class="text-gray-500">Nom</dt>
					<dd class="font-medium">{data.targetUser.name}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Email</dt>
					<dd>{data.targetUser.email}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Role</dt>
					<dd>
						<Badge variant={roleBadgeVariant[data.targetUser.role ?? 'viewer'] ?? 'default'}>
							{roleLabels[data.targetUser.role ?? 'viewer'] ?? data.targetUser.role}
						</Badge>
					</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Statut</dt>
					<dd>
						<Badge variant={data.targetUser.isActive ? 'success' : 'danger'}>
							{data.targetUser.isActive ? 'Actif' : 'Inactif'}
						</Badge>
					</dd>
				</div>
			</dl>
		{/if}
	</Card>

	<!-- Warehouse Assignment -->
	<Card>
		<div class="mb-4 flex items-center justify-between">
			<h3 class="font-semibold text-gray-900">Entrepots assignes</h3>
			{#if editingWarehouses}
				<Button variant="secondary" size="sm" onclick={() => (editingWarehouses = false)}>
					Annuler
				</Button>
			{:else}
				<Button variant="secondary" size="sm" onclick={() => (editingWarehouses = true)}>
					Modifier
				</Button>
			{/if}
		</div>

		{#if editingWarehouses}
			<form
				method="POST"
				action="?/assignWarehouses"
				use:enhance={() => {
					warehouseLoading = true;
					return async ({ update }) => {
						await update();
						warehouseLoading = false;
					};
				}}
			>
				<div class="max-h-64 space-y-2 overflow-y-auto">
					{#each data.allWarehouses as warehouse (warehouse.id)}
						<label class="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-gray-50">
							<input
								type="checkbox"
								name="warehouseIds"
								value={warehouse.id}
								checked={selectedWarehouses.has(warehouse.id)}
								onchange={() => toggleWarehouse(warehouse.id)}
								class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<span class="text-sm">{warehouse.name}</span>
						</label>
					{/each}
				</div>
				<div class="mt-4 flex justify-end">
					<Button type="submit" size="sm" loading={warehouseLoading}>Enregistrer</Button>
				</div>
			</form>
		{:else if data.targetUser.warehouses.length === 0}
			<p class="text-sm text-gray-500">Aucun entrepot assigne.</p>
		{:else}
			<div class="space-y-2">
				{#each data.targetUser.warehouses as warehouse (warehouse.id)}
					<div class="flex items-center gap-2 text-sm">
						<span>🏭</span>
						<span>{warehouse.name}</span>
					</div>
				{/each}
			</div>
		{/if}
	</Card>
</div>

<!-- Hidden deactivate form with use:enhance -->
<form
	method="POST"
	action="?/deactivate"
	use:enhance
	bind:this={deactivateFormEl}
	class="hidden"
></form>

<!-- Deactivate Confirmation Modal -->
<ConfirmModal
	bind:open={showDeactivateModal}
	title="Desactiver l'utilisateur"
	message="Etes-vous sur de vouloir desactiver ce compte ? L'utilisateur ne pourra plus se connecter."
	confirmLabel="Desactiver"
	variant="danger"
	oncancel={() => (showDeactivateModal = false)}
	onconfirm={() => {
		deactivateFormEl?.requestSubmit();
	}}
/>
