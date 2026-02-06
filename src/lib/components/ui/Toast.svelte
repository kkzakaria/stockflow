<script lang="ts">
	import { toast } from '$lib/stores/toast';

	interface Props {
		closeLabel?: string;
	}

	let { closeLabel = 'Close' }: Props = $props();

	const iconByType = {
		success: '\u2713',
		error: '\u2715',
		warning: '\u26A0',
		info: '\u2139'
	};

	const colorByType = {
		success: 'bg-green-50 text-green-800 border-green-200',
		error: 'bg-red-50 text-red-800 border-red-200',
		warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
		info: 'bg-blue-50 text-blue-800 border-blue-200'
	};
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
	{#each $toast as t (t.id)}
		<div
			class="flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg {colorByType[t.type]}"
			role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
		>
			<span class="text-lg">{iconByType[t.type]}</span>
			<p class="text-sm font-medium">{t.message}</p>
			<button
				type="button"
				onclick={() => toast.remove(t.id)}
				class="ml-2 opacity-50 hover:opacity-100"
				aria-label={closeLabel}
			>
				&times;
			</button>
		</div>
	{/each}
</div>
