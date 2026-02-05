<script lang="ts">
	import { page } from '$app/state';

	const tabs = [
		{ label: 'Accueil', href: '/dashboard', icon: '🏠' },
		{ label: 'Stock', href: '/products', icon: '📦' },
		{ label: 'Transferts', href: '/transfers', icon: '🔄' },
		{ label: 'Inventaire', href: '/inventory', icon: '📋' },
		{ label: 'Plus', href: '/settings', icon: '⚙️' }
	];

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white lg:hidden">
	<div class="flex justify-around">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center py-2 text-xs
					{isActive(tab.href) ? 'text-blue-600' : 'text-gray-500'}"
			>
				<span class="text-lg">{tab.icon}</span>
				<span>{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>
