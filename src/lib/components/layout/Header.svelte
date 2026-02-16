<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const { userName, unreadCount = 0 }: { userName: string; unreadCount?: number } = $props();

	let showMenu = $state(false);

	async function handleLogout() {
		await authClient.signOut();
		goto(resolve('/login'));
	}
</script>

<header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
	<div class="flex items-center gap-3">
		<span class="text-lg font-bold text-gray-900 lg:hidden">StockFlow</span>
	</div>

	<div class="flex items-center gap-4">
		<a href={resolve('/alerts')} class="relative text-gray-500 hover:text-gray-700">
			<span class="text-xl">🔔</span>
			{#if unreadCount > 0}
				<span
					class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
				>
					{unreadCount > 9 ? '9+' : unreadCount}
				</span>
			{/if}
		</a>

		<div class="relative">
			<button
				onclick={() => (showMenu = !showMenu)}
				class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
			>
				<span class="hidden sm:inline">{userName}</span>
				<span class="h-8 w-8 rounded-full bg-blue-100 text-center leading-8 text-blue-700">
					{userName.charAt(0).toUpperCase()}
				</span>
			</button>

			{#if showMenu}
				<div
					class="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-gray-200"
				>
					<a
						href={resolve('/settings')}
						class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
					>
						Paramètres
					</a>
					<button
						onclick={handleLogout}
						class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
					>
						Déconnexion
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>
