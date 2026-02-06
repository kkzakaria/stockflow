<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	interface Column<T> {
		key: keyof T | string;
		label: string;
		render?: Snippet<[T]>;
		class?: string;
	}

	interface Props<T> {
		data: T[];
		columns: Column<T>[];
		emptyMessage?: string;
		keyField?: keyof T;
		onrowclick?: (item: T) => void;
	}

	let {
		data,
		columns,
		emptyMessage = 'Aucune donnee',
		keyField = 'id' as keyof T,
		onrowclick
	}: Props<T> = $props();

	function getValue(item: T, key: keyof T | string): unknown {
		if (typeof key === 'string' && key.includes('.')) {
			return key
				.split('.')
				.reduce<unknown>((obj, k) => (obj as Record<string, unknown>)?.[k], item);
		}
		return item[key as keyof T];
	}

	function handleRowKeydown(e: KeyboardEvent, item: T) {
		if (onrowclick && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			onrowclick(item);
		}
	}
</script>

<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
	{#if data.length === 0}
		<div class="p-8 text-center text-gray-500">
			{emptyMessage}
		</div>
	{:else}
		<!-- Desktop table -->
		<table class="hidden w-full md:table">
			<thead class="bg-gray-50">
				<tr>
					{#each columns as col (col.key)}
						<th
							class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase {col.class ??
								''}"
						>
							{col.label}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data as item (item[keyField])}
					<tr
						class={onrowclick ? 'cursor-pointer hover:bg-gray-50' : ''}
						onclick={() => onrowclick?.(item)}
						onkeydown={(e) => handleRowKeydown(e, item)}
						role={onrowclick ? 'button' : undefined}
						tabindex={onrowclick ? 0 : undefined}
					>
						{#each columns as col (col.key)}
							<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900 {col.class ?? ''}">
								{#if col.render}
									{@render col.render(item)}
								{:else}
									{getValue(item, col.key) ?? '\u2014'}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data as item (item[keyField])}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="p-4 {onrowclick ? 'cursor-pointer hover:bg-gray-50' : ''}"
					onclick={() => onrowclick?.(item)}
					onkeydown={(e) => handleRowKeydown(e, item)}
					role={onrowclick ? 'button' : undefined}
					tabindex={onrowclick ? 0 : undefined}
				>
					{#each columns as col (col.key)}
						<div class="flex justify-between py-1">
							<span class="text-xs font-medium text-gray-500">{col.label}</span>
							<span class="text-sm text-gray-900">
								{#if col.render}
									{@render col.render(item)}
								{:else}
									{getValue(item, col.key) ?? '\u2014'}
								{/if}
							</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
