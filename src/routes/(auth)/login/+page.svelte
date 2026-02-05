<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let errorMsg = $state('');
	let loading = $state(false);

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';
		loading = true;

		try {
			const result = await authClient.signIn.email({ email, password });

			if (result.error) {
				errorMsg = result.error.message ?? 'Identifiants incorrects';
			} else {
				goto(resolve('/dashboard'));
			}
		} catch {
			errorMsg = 'Erreur de connexion. Réessayez.';
		} finally {
			loading = false;
		}
	}
</script>

<form onsubmit={handleLogin} class="rounded-lg bg-white p-6 shadow-md">
	<h2 class="mb-6 text-xl font-semibold text-gray-900">Connexion</h2>

	{#if errorMsg}
		<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
	{/if}

	<div class="mb-4">
		<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
		<input
			id="email"
			type="email"
			bind:value={email}
			required
			autocomplete="email"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
			placeholder="vous@entreprise.com"
		/>
	</div>

	<div class="mb-6">
		<label for="password" class="mb-1 block text-sm font-medium text-gray-700">
			Mot de passe
		</label>
		<input
			id="password"
			type="password"
			bind:value={password}
			required
			autocomplete="current-password"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
			placeholder="••••••••"
		/>
	</div>

	<button
		type="submit"
		disabled={loading}
		class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
	>
		{loading ? 'Connexion...' : 'Se connecter'}
	</button>

	<div class="mt-4 text-center">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- route not yet created -->
		<a href="/forgot-password" class="text-sm text-blue-600 hover:underline">
			Mot de passe oublié ?
		</a>
	</div>
</form>
