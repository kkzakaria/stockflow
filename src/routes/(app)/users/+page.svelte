<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, Card, EmptyState } from '$lib/components/ui';

	let { data } = $props();

	const roleBadgeVariant: Record<string, 'default' | 'success' | 'info' | 'warning' | 'danger'> = {
		admin: 'danger',
		admin_manager: 'warning',
		manager: 'info',
		user: 'default',
		admin_viewer: 'success',
		viewer: 'default'
	};

	const roleLabels: Record<string, string> = {
		admin: 'Administrateur',
		admin_manager: 'Admin Gestionnaire',
		manager: 'Gestionnaire',
		user: 'Utilisateur',
		admin_viewer: 'Admin Visiteur',
		viewer: 'Visiteur'
	};
</script>

<PageHeader title="Utilisateurs" description="Gerez les comptes utilisateurs et leurs acces">
	{#snippet actions()}
		<Button onclick={() => goto(resolve('/users/new'))}>+ Nouvel utilisateur</Button>
	{/snippet}
</PageHeader>

{#if data.users.length === 0}
	<EmptyState
		icon="👥"
		title="Aucun utilisateur"
		description="Creez votre premier utilisateur pour commencer."
	>
		{#snippet action()}
			<Button onclick={() => goto(resolve('/users/new'))}>Creer un utilisateur</Button>
		{/snippet}
	</EmptyState>
{:else}
	<Card class="overflow-hidden p-0">
		<!-- Desktop table -->
		<table class="hidden w-full md:table">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Nom</th
					>
					<th class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Email</th
					>
					<th class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Role</th
					>
					<th class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>Statut</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.users as u (u.id)}
					<tr
						class="cursor-pointer hover:bg-gray-50"
						onclick={() => goto(resolve(`/users/${u.id}`))}
					>
						<td class="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">{u.name}</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">{u.email}</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap">
							<Badge variant={roleBadgeVariant[u.role ?? 'viewer'] ?? 'default'}>
								{roleLabels[u.role ?? 'viewer'] ?? u.role}
							</Badge>
						</td>
						<td class="px-4 py-3 text-sm whitespace-nowrap">
							<Badge variant={u.isActive ? 'success' : 'danger'}>
								{u.isActive ? 'Actif' : 'Inactif'}
							</Badge>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data.users as u (u.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div
					class="cursor-pointer p-4 hover:bg-gray-50"
					onclick={() => goto(resolve(`/users/${u.id}`))}
				>
					<div class="mb-2 flex items-center justify-between">
						<span class="font-medium text-gray-900">{u.name}</span>
						<Badge variant={u.isActive ? 'success' : 'danger'}>
							{u.isActive ? 'Actif' : 'Inactif'}
						</Badge>
					</div>
					<p class="text-sm text-gray-500">{u.email}</p>
					<div class="mt-2">
						<Badge variant={roleBadgeVariant[u.role ?? 'viewer'] ?? 'default'}>
							{roleLabels[u.role ?? 'viewer'] ?? u.role}
						</Badge>
					</div>
				</div>
			{/each}
		</div>
	</Card>
{/if}
