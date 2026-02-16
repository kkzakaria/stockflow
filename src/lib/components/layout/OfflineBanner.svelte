<script lang="ts">
	import { isOnline } from '$lib/stores/network';
	import { pendingCount } from '$lib/stores/offline-queue';
</script>

{#if !$isOnline}
	<div
		class="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
		role="alert"
	>
		<svg
			class="h-4 w-4 shrink-0"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M15.536 8.464a5 5 0 010 7.072M8.464 15.536a5 5 0 010-7.072"
			/>
		</svg>
		<span>
			Vous etes hors ligne. Les operations seront synchronisees a la reconnexion.
		</span>
		{#if $pendingCount > 0}
			<span
				class="ml-1 inline-flex items-center rounded-full bg-amber-700 px-2 py-0.5 text-xs font-semibold text-white"
			>
				{$pendingCount} en attente
			</span>
		{/if}
	</div>
{/if}
