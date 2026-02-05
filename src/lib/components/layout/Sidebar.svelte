<script lang="ts">
	import { page } from '$app/state';

	type NavItem = { label: string; href: string; icon: string; minRole?: string };

	const { role }: { role: string } = $props();

	const ROLE_LEVEL: Record<string, number> = {
		admin: 100,
		admin_manager: 80,
		manager: 60,
		user: 40,
		admin_viewer: 20,
		viewer: 10
	};

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard', icon: '📊' },
		{ label: 'Produits', href: '/products', icon: '📦' },
		{ label: 'Entrepôts', href: '/warehouses', icon: '🏭' },
		{ label: 'Mouvements', href: '/movements', icon: '↕️' },
		{ label: 'Transferts', href: '/transfers', icon: '🔄' },
		{ label: 'Inventaires', href: '/inventory', icon: '📋' },
		{ label: 'Alertes', href: '/alerts', icon: '🔔' },
		{ label: 'Logs', href: '/logs', icon: '📄', minRole: 'admin_viewer' },
		{ label: 'Utilisateurs', href: '/users', icon: '👥', minRole: 'admin' },
		{ label: 'Paramètres', href: '/settings', icon: '⚙️' }
	];

	function isVisible(item: NavItem): boolean {
		if (!item.minRole) return true;
		return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 999);
	}

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}
</script>

<aside class="hidden w-60 flex-shrink-0 border-r border-gray-200 bg-white lg:block">
	<div class="flex h-16 items-center border-b border-gray-200 px-4">
		<span class="text-lg font-bold text-gray-900">StockFlow</span>
	</div>
	<nav class="mt-2 space-y-1 px-2">
		{#each navItems.filter(isVisible) as item (item.href)}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
					{isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}"
			>
				<span>{item.icon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
