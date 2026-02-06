<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Select, Card } from '$lib/components/ui';

	let { data, form } = $props();
	let loading = $state(false);
	let confirmPassword = $state('');
	let confirmPasswordError = $state('');

	const roleLabels: Record<string, string> = {
		admin: 'Administrateur',
		admin_manager: 'Admin Gestionnaire',
		manager: 'Gestionnaire',
		user: 'Utilisateur',
		admin_viewer: 'Admin Visiteur',
		viewer: 'Visiteur'
	};
</script>

<PageHeader title="Nouvel utilisateur" description="Creez un nouveau compte utilisateur">
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/users'))}>Annuler</Button>
	{/snippet}
</PageHeader>

<Card class="max-w-2xl">
	<form
		method="POST"
		use:enhance={({ formData, cancel }) => {
			confirmPasswordError = '';
			const password = formData.get('password') as string;
			if (password !== confirmPassword) {
				confirmPasswordError = 'Les mots de passe ne correspondent pas';
				cancel();
				return;
			}
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
				label="Nom complet *"
				placeholder="Moussa Diallo"
				value={form?.data?.name ?? ''}
				error={form?.errors?.name?.[0]}
				required
			/>

			<Input
				name="email"
				type="email"
				label="Adresse email *"
				placeholder="moussa@entreprise.com"
				value={form?.data?.email ?? ''}
				error={form?.errors?.email?.[0]}
				required
			/>

			<Input
				name="password"
				type="password"
				label="Mot de passe *"
				placeholder="••••••••"
				error={form?.errors?.password?.[0]}
				hint="Minimum 8 caracteres, 1 majuscule, 1 chiffre"
				required
			/>

			<Input
				type="password"
				label="Confirmer le mot de passe *"
				placeholder="••••••••"
				value={confirmPassword}
				oninput={(e) => {
					confirmPassword = (e.target as HTMLInputElement).value;
				}}
				error={confirmPasswordError || undefined}
				required
			/>

			<Select
				name="role"
				label="Role *"
				value={form?.data?.role ?? 'viewer'}
				error={form?.errors?.role?.[0]}
				required
			>
				{#each data.roles as role (role)}
					<option value={role}>{roleLabels[role] ?? role}</option>
				{/each}
			</Select>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => goto(resolve('/users'))}>Annuler</Button>
			<Button type="submit" {loading}>Creer l'utilisateur</Button>
		</div>
	</form>
</Card>
