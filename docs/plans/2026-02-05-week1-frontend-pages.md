# Week 1 — Missing Frontend Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the missing frontend UI pages for Week 1: Users management (list, create, detail), Warehouses management (list, create, detail), and base UI components library.

**Architecture:** SvelteKit pages with server load functions fetching data from existing REST APIs. Svelte 5 runes for state management. Form actions for mutations. Tailwind CSS 4 for styling (mobile-first). All navigation uses `resolve()` from `$app/paths` per ESLint rule.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Tailwind CSS 4, Zod validation client-side mirroring server schemas.

**Current State:** APIs complete (users CRUD, warehouses CRUD), stub pages exist showing "Module en cours de développement". No functional UI pages, no base UI components.

---

## Task 1: Create Base UI Component — Button

**Files:**

- Create: `src/lib/components/ui/Button.svelte`

**Step 1: Write the Button component**

Create `src/lib/components/ui/Button.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		loading?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const baseClasses =
		'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses = {
		primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
		secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
	};

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};
</script>

<button
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {className}"
	disabled={disabled || loading}
	{...rest}
>
	{#if loading}
		<svg
			class="mr-2 h-4 w-4 animate-spin"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{/if}
	{@render children()}
</button>
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/components/ui/Button.svelte
git commit -m "feat(ui): add Button component with variants and loading state"
```

---

## Task 2: Create Base UI Component — Input

**Files:**

- Create: `src/lib/components/ui/Input.svelte`

**Step 1: Write the Input component**

Create `src/lib/components/ui/Input.svelte`:

```svelte
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		error?: string;
		hint?: string;
	}

	let { label, error, hint, id, class: className = '', ...rest }: Props = $props();

	const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="space-y-1">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700">
			{label}
		</label>
	{/if}

	<input
		id={inputId}
		class="w-full rounded-md border px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none
			{error
			? 'border-red-300 focus:border-red-500 focus:ring-red-500'
			: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
			{className}"
		{...rest}
	/>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if hint}
		<p class="text-sm text-gray-500">{hint}</p>
	{/if}
</div>
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 3: Commit**

```bash
git add src/lib/components/ui/Input.svelte
git commit -m "feat(ui): add Input component with label, error, and hint"
```

---

## Task 3: Create Base UI Component — Select

**Files:**

- Create: `src/lib/components/ui/Select.svelte`

**Step 1: Write the Select component**

Create `src/lib/components/ui/Select.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		error?: string;
		children: Snippet;
	}

	let { label, error, id, class: className = '', children, ...rest }: Props = $props();

	const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="space-y-1">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-gray-700">
			{label}
		</label>
	{/if}

	<select
		id={selectId}
		class="w-full rounded-md border px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-offset-0 focus:outline-none
			{error
			? 'border-red-300 focus:border-red-500 focus:ring-red-500'
			: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
			{className}"
		{...rest}
	>
		{@render children()}
	</select>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 3: Commit**

```bash
git add src/lib/components/ui/Select.svelte
git commit -m "feat(ui): add Select component with label and error"
```

---

## Task 4: Create Base UI Component — Card

**Files:**

- Create: `src/lib/components/ui/Card.svelte`

**Step 1: Write the Card component**

Create `src/lib/components/ui/Card.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className = '', children }: Props = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm {className}">
	{@render children()}
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/ui/Card.svelte
git commit -m "feat(ui): add Card component"
```

---

## Task 5: Create Base UI Component — Badge

**Files:**

- Create: `src/lib/components/ui/Badge.svelte`

**Step 1: Write the Badge component**

Create `src/lib/components/ui/Badge.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
		children: Snippet;
	}

	let { variant = 'default', children }: Props = $props();

	const variantClasses = {
		default: 'bg-gray-100 text-gray-700',
		success: 'bg-green-100 text-green-700',
		warning: 'bg-yellow-100 text-yellow-700',
		danger: 'bg-red-100 text-red-700',
		info: 'bg-blue-100 text-blue-700'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {variantClasses[
		variant
	]}"
>
	{@render children()}
</span>
```

**Step 2: Commit**

```bash
git add src/lib/components/ui/Badge.svelte
git commit -m "feat(ui): add Badge component with variants"
```

---

## Task 6: Create Base UI Component — Modal

**Files:**

- Create: `src/lib/components/ui/Modal.svelte`

**Step 1: Write the Modal component**

Create `src/lib/components/ui/Modal.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		onclose?: () => void;
		children: Snippet;
	}

	let { open = $bindable(), title, onclose, children }: Props = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-md rounded-lg bg-white shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
		>
			{#if title}
				<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
					<h2 id="modal-title" class="text-lg font-semibold text-gray-900">{title}</h2>
					<button
						type="button"
						onclick={handleClose}
						class="text-gray-400 hover:text-gray-500"
						aria-label="Fermer"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			{/if}

			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 3: Commit**

```bash
git add src/lib/components/ui/Modal.svelte
git commit -m "feat(ui): add Modal component with backdrop and keyboard support"
```

---

## Task 7: Create Base UI Component — Toast

**Files:**

- Create: `src/lib/components/ui/Toast.svelte`
- Create: `src/lib/stores/toast.ts`

**Step 1: Write the toast store**

Create `src/lib/stores/toast.ts`:

```typescript
import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function add(type: ToastType, message: string) {
		const id = Math.random().toString(36).slice(2, 9);
		update((toasts) => [...toasts, { id, type, message }]);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			remove(id);
		}, 5000);
	}

	function remove(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string) => add('success', message),
		error: (message: string) => add('error', message),
		warning: (message: string) => add('warning', message),
		info: (message: string) => add('info', message),
		remove
	};
}

export const toast = createToastStore();
```

**Step 2: Write the Toast component**

Create `src/lib/components/ui/Toast.svelte`:

```svelte
<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';

	const iconByType = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
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
			role="alert"
		>
			<span class="text-lg">{iconByType[t.type]}</span>
			<p class="text-sm font-medium">{t.message}</p>
			<button
				type="button"
				onclick={() => toast.remove(t.id)}
				class="ml-2 opacity-50 hover:opacity-100"
				aria-label="Fermer"
			>
				✕
			</button>
		</div>
	{/each}
</div>
```

**Step 3: Commit**

```bash
git add src/lib/stores/toast.ts src/lib/components/ui/Toast.svelte
git commit -m "feat(ui): add Toast component and store for notifications"
```

---

## Task 8: Create Base UI Component — DataTable

**Files:**

- Create: `src/lib/components/ui/DataTable.svelte`

**Step 1: Write the DataTable component**

Create `src/lib/components/ui/DataTable.svelte`:

```svelte
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
		onrowclick?: (item: T) => void;
	}

	let { data, columns, emptyMessage = 'Aucune donnée', onrowclick }: Props<T> = $props();

	function getValue(item: T, key: keyof T | string): unknown {
		if (typeof key === 'string' && key.includes('.')) {
			return key.split('.').reduce((obj, k) => (obj as Record<string, unknown>)?.[k], item);
		}
		return item[key as keyof T];
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
				{#each data as item, i (i)}
					<tr
						class={onrowclick ? 'cursor-pointer hover:bg-gray-50' : ''}
						onclick={() => onrowclick?.(item)}
					>
						{#each columns as col (col.key)}
							<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900 {col.class ?? ''}">
								{#if col.render}
									{@render col.render(item)}
								{:else}
									{getValue(item, col.key) ?? '—'}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile cards -->
		<div class="divide-y divide-gray-200 md:hidden">
			{#each data as item, i (i)}
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div
					class="p-4 {onrowclick ? 'cursor-pointer hover:bg-gray-50' : ''}"
					onclick={() => onrowclick?.(item)}
				>
					{#each columns as col (col.key)}
						<div class="flex justify-between py-1">
							<span class="text-xs font-medium text-gray-500">{col.label}</span>
							<span class="text-sm text-gray-900">
								{#if col.render}
									{@render col.render(item)}
								{:else}
									{getValue(item, col.key) ?? '—'}
								{/if}
							</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 3: Commit**

```bash
git add src/lib/components/ui/DataTable.svelte
git commit -m "feat(ui): add DataTable component with responsive mobile cards"
```

---

## Task 9: Create Base UI Component — ConfirmModal

**Files:**

- Create: `src/lib/components/ui/ConfirmModal.svelte`

**Step 1: Write the ConfirmModal component**

Create `src/lib/components/ui/ConfirmModal.svelte`:

```svelte
<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title?: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'primary';
		loading?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open = $bindable(),
		title = 'Confirmation',
		message,
		confirmLabel = 'Confirmer',
		cancelLabel = 'Annuler',
		variant = 'danger',
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();
</script>

<Modal bind:open {title} onclose={oncancel}>
	<p class="text-sm text-gray-600">{message}</p>

	<div class="mt-6 flex justify-end gap-3">
		<Button variant="secondary" onclick={oncancel} disabled={loading}>
			{cancelLabel}
		</Button>
		<Button {variant} onclick={onconfirm} {loading}>
			{confirmLabel}
		</Button>
	</div>
</Modal>
```

**Step 2: Commit**

```bash
git add src/lib/components/ui/ConfirmModal.svelte
git commit -m "feat(ui): add ConfirmModal component for destructive actions"
```

---

## Task 10: Create Base UI Component — EmptyState

**Files:**

- Create: `src/lib/components/ui/EmptyState.svelte`

**Step 1: Write the EmptyState component**

Create `src/lib/components/ui/EmptyState.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		action?: Snippet;
	}

	let { icon = '📭', title, description, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
	<span class="text-5xl">{icon}</span>
	<h3 class="mt-4 text-lg font-medium text-gray-900">{title}</h3>
	{#if description}
		<p class="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
	{/if}
	{#if action}
		<div class="mt-6">
			{@render action()}
		</div>
	{/if}
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/ui/EmptyState.svelte
git commit -m "feat(ui): add EmptyState component"
```

---

## Task 11: Create Base UI Component — PageHeader

**Files:**

- Create: `src/lib/components/ui/PageHeader.svelte`

**Step 1: Write the PageHeader component**

Create `src/lib/components/ui/PageHeader.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
	}

	let { title, description, actions }: Props = $props();
</script>

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">{title}</h1>
		{#if description}
			<p class="mt-1 text-sm text-gray-500">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 gap-3">
			{@render actions()}
		</div>
	{/if}
</div>
```

**Step 2: Commit**

```bash
git add src/lib/components/ui/PageHeader.svelte
git commit -m "feat(ui): add PageHeader component"
```

---

## Task 12: Create UI Components Index

**Files:**

- Create: `src/lib/components/ui/index.ts`

**Step 1: Create barrel export**

Create `src/lib/components/ui/index.ts`:

```typescript
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Select } from './Select.svelte';
export { default as Card } from './Card.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Modal } from './Modal.svelte';
export { default as Toast } from './Toast.svelte';
export { default as DataTable } from './DataTable.svelte';
export { default as ConfirmModal } from './ConfirmModal.svelte';
export { default as EmptyState } from './EmptyState.svelte';
export { default as PageHeader } from './PageHeader.svelte';
```

**Step 2: Commit**

```bash
git add src/lib/components/ui/index.ts
git commit -m "feat(ui): add barrel export for UI components"
```

---

## Task 13: Implement Warehouses List Page

**Files:**

- Modify: `src/routes/(app)/warehouses/+page.svelte`
- Create: `src/routes/(app)/warehouses/+page.server.ts`

**Step 1: Create the server load function**

Create `src/routes/(app)/warehouses/+page.server.ts`:

```typescript
import { db } from '$lib/server/db';
import { warehouses, productWarehouse } from '$lib/server/db/schema';
import { eq, sql, and, inArray } from 'drizzle-orm';
import { getUserWarehouseIds } from '$lib/server/auth/guards';
import type { Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const role = user.role as Role;

	const warehouseIds = await getUserWarehouseIds(user.id, role);

	let warehouseList;
	if (warehouseIds === null) {
		warehouseList = await db.select().from(warehouses).where(eq(warehouses.isActive, true));
	} else {
		if (warehouseIds.length === 0) {
			return { warehouses: [] };
		}
		warehouseList = await db
			.select()
			.from(warehouses)
			.where(and(eq(warehouses.isActive, true), inArray(warehouses.id, warehouseIds)));
	}

	// Get stock counts per warehouse
	const stockCounts = await db
		.select({
			warehouseId: productWarehouse.warehouseId,
			productCount: sql<number>`COUNT(DISTINCT ${productWarehouse.productId})`,
			totalQuantity: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
			totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
		})
		.from(productWarehouse)
		.groupBy(productWarehouse.warehouseId);

	const stockMap = new Map(stockCounts.map((s) => [s.warehouseId, s]));

	const warehousesWithStats = warehouseList.map((w) => ({
		...w,
		productCount: stockMap.get(w.id)?.productCount ?? 0,
		totalQuantity: stockMap.get(w.id)?.totalQuantity ?? 0,
		totalValue: stockMap.get(w.id)?.totalValue ?? 0
	}));

	return { warehouses: warehousesWithStats };
};
```

**Step 2: Implement the warehouses list page**

Replace `src/routes/(app)/warehouses/+page.svelte`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Card, Button, EmptyState } from '$lib/components/ui';

	let { data } = $props();

	function formatXOF(amount: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'XOF',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<PageHeader title="Entrepôts" description="Gérez vos entrepôts et visualisez leurs stocks">
	{#snippet actions()}
		{#if data.user.role === 'admin'}
			<Button onclick={() => goto(resolve('/warehouses/new'))}>+ Nouvel entrepôt</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if data.warehouses.length === 0}
	<EmptyState
		icon="🏭"
		title="Aucun entrepôt"
		description="Vous n'avez accès à aucun entrepôt pour le moment."
	>
		{#snippet action()}
			{#if data.user.role === 'admin'}
				<Button onclick={() => goto(resolve('/warehouses/new'))}>Créer un entrepôt</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.warehouses as warehouse (warehouse.id)}
			<Card class="cursor-pointer transition-shadow hover:shadow-md">
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<div onclick={() => goto(resolve(`/warehouses/${warehouse.id}`))}>
					<div class="mb-3 flex items-start justify-between">
						<div>
							<h3 class="font-semibold text-gray-900">{warehouse.name}</h3>
							{#if warehouse.address}
								<p class="mt-1 text-sm text-gray-500">{warehouse.address}</p>
							{/if}
						</div>
						<span class="text-2xl">🏭</span>
					</div>

					<div class="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
						<div class="text-center">
							<p class="text-lg font-semibold text-gray-900">{warehouse.productCount}</p>
							<p class="text-xs text-gray-500">Produits</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-semibold text-gray-900">{warehouse.totalQuantity}</p>
							<p class="text-xs text-gray-500">Unités</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-semibold text-blue-600">{formatXOF(warehouse.totalValue)}</p>
							<p class="text-xs text-gray-500">Valeur</p>
						</div>
					</div>
				</div>
			</Card>
		{/each}
	</div>
{/if}
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/\(app\)/warehouses/
git commit -m "feat(ui): implement warehouses list page with stats cards"
```

---

## Task 14: Implement Warehouses Create Page

**Files:**

- Create: `src/routes/(app)/warehouses/new/+page.svelte`
- Create: `src/routes/(app)/warehouses/new/+page.server.ts`

**Step 1: Create the server action**

Create `src/routes/(app)/warehouses/new/+page.server.ts`:

```typescript
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { warehouses } from '$lib/server/db/schema';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createWarehouseSchema } from '$lib/validators/warehouse';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user!.role as Role, 'admin');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: formData.get('name') as string,
			address: (formData.get('address') as string) || undefined,
			contactName: (formData.get('contactName') as string) || undefined,
			contactPhone: (formData.get('contactPhone') as string) || undefined,
			contactEmail: (formData.get('contactEmail') as string) || undefined
		};

		const parsed = createWarehouseSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				data,
				errors: parsed.error.flatten().fieldErrors
			});
		}

		const [warehouse] = await db
			.insert(warehouses)
			.values({
				name: parsed.data.name,
				address: parsed.data.address,
				contactName: parsed.data.contactName,
				contactPhone: parsed.data.contactPhone,
				contactEmail: parsed.data.contactEmail || null
			})
			.returning();

		redirect(303, `/warehouses/${warehouse.id}`);
	}
};
```

**Step 2: Create the form page**

Create `src/routes/(app)/warehouses/new/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Card } from '$lib/components/ui';

	let { form } = $props();
	let loading = $state(false);
</script>

<PageHeader title="Nouvel entrepôt" description="Créez un nouvel entrepôt">
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/warehouses'))}>Annuler</Button>
	{/snippet}
</PageHeader>

<Card class="max-w-2xl">
	<form
		method="POST"
		use:enhance={() => {
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
				label="Nom de l'entrepôt *"
				placeholder="Entrepôt Principal"
				value={form?.data?.name ?? ''}
				error={form?.errors?.name?.[0]}
				required
			/>

			<Input
				name="address"
				label="Adresse"
				placeholder="123 Rue Exemple, Dakar"
				value={form?.data?.address ?? ''}
				error={form?.errors?.address?.[0]}
			/>

			<div class="grid gap-4 sm:grid-cols-2">
				<Input
					name="contactName"
					label="Nom du contact"
					placeholder="Moussa Diallo"
					value={form?.data?.contactName ?? ''}
					error={form?.errors?.contactName?.[0]}
				/>

				<Input
					name="contactPhone"
					label="Téléphone"
					placeholder="+221 77 123 4567"
					value={form?.data?.contactPhone ?? ''}
					error={form?.errors?.contactPhone?.[0]}
				/>
			</div>

			<Input
				name="contactEmail"
				type="email"
				label="Email du contact"
				placeholder="contact@entreprise.com"
				value={form?.data?.contactEmail ?? ''}
				error={form?.errors?.contactEmail?.[0]}
			/>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => goto(resolve('/warehouses'))}>Annuler</Button>
			<Button type="submit" {loading}>Créer l'entrepôt</Button>
		</div>
	</form>
</Card>
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/\(app\)/warehouses/new/
git commit -m "feat(ui): implement warehouse creation page with form validation"
```

---

## Task 15: Implement Warehouse Detail Page

**Files:**

- Create: `src/routes/(app)/warehouses/[id]/+page.svelte`
- Create: `src/routes/(app)/warehouses/[id]/+page.server.ts`

**Step 1: Create the server load and actions**

Create `src/routes/(app)/warehouses/[id]/+page.server.ts`:

```typescript
import { error, redirect, fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { warehouses, productWarehouse, userWarehouses, user } from '$lib/server/db/schema';
import { requireWarehouseAccess } from '$lib/server/auth/guards';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateWarehouseSchema } from '$lib/validators/warehouse';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user!;
	const role = currentUser.role as Role;

	await requireWarehouseAccess(currentUser.id, params.id, role);

	const warehouse = await db.query.warehouses.findFirst({
		where: eq(warehouses.id, params.id)
	});

	if (!warehouse) {
		error(404, 'Entrepôt non trouvé');
	}

	// Get stock stats
	const [stats] = await db
		.select({
			productCount: sql<number>`COUNT(DISTINCT ${productWarehouse.productId})`,
			totalQuantity: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)`,
			totalValue: sql<number>`COALESCE(SUM(${productWarehouse.quantity} * ${productWarehouse.pump}), 0)`
		})
		.from(productWarehouse)
		.where(eq(productWarehouse.warehouseId, params.id));

	// Get assigned users
	const assignedUsers = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role
		})
		.from(userWarehouses)
		.innerJoin(user, eq(userWarehouses.userId, user.id))
		.where(eq(userWarehouses.warehouseId, params.id));

	return {
		warehouse,
		stats: stats ?? { productCount: 0, totalQuantity: 0, totalValue: 0 },
		assignedUsers,
		canEdit: role === 'admin'
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: formData.get('name') as string,
			address: (formData.get('address') as string) || undefined,
			contactName: (formData.get('contactName') as string) || undefined,
			contactPhone: (formData.get('contactPhone') as string) || undefined,
			contactEmail: (formData.get('contactEmail') as string) || undefined
		};

		const parsed = updateWarehouseSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				data,
				errors: parsed.error.flatten().fieldErrors
			});
		}

		await db
			.update(warehouses)
			.set({
				...parsed.data,
				contactEmail: parsed.data.contactEmail || null,
				updatedAt: sql`(datetime('now'))`
			})
			.where(eq(warehouses.id, params.id));

		return { success: true };
	},

	delete: async ({ params, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		// Check if warehouse has stock
		const [stock] = await db
			.select({ total: sql<number>`COALESCE(SUM(${productWarehouse.quantity}), 0)` })
			.from(productWarehouse)
			.where(eq(productWarehouse.warehouseId, params.id));

		if (stock?.total && stock.total > 0) {
			return fail(409, {
				deleteError:
					"Impossible de supprimer un entrepôt avec du stock. Transférez d'abord le stock."
			});
		}

		await db
			.update(warehouses)
			.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
			.where(eq(warehouses.id, params.id));

		redirect(303, '/warehouses');
	}
};
```

**Step 2: Create the detail page**

Create `src/routes/(app)/warehouses/[id]/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Card, Badge, ConfirmModal } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	let editing = $state(false);
	let loading = $state(false);
	let showDeleteModal = $state(false);

	function formatXOF(amount: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'XOF',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	const roleBadgeVariant: Record<string, 'default' | 'success' | 'info' | 'warning' | 'danger'> = {
		admin: 'danger',
		admin_manager: 'warning',
		manager: 'info',
		user: 'default',
		admin_viewer: 'success',
		viewer: 'default'
	};

	$effect(() => {
		if (form?.success) {
			editing = false;
			toast.success('Entrepôt mis à jour');
		}
		if (form?.deleteError) {
			toast.error(form.deleteError);
		}
	});
</script>

<PageHeader title={data.warehouse.name} description={data.warehouse.address ?? 'Aucune adresse'}>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/warehouses'))}>← Retour</Button>
		{#if data.canEdit}
			{#if editing}
				<Button variant="secondary" onclick={() => (editing = false)}>Annuler</Button>
			{:else}
				<Button variant="secondary" onclick={() => (editing = true)}>Modifier</Button>
				<Button variant="danger" onclick={() => (showDeleteModal = true)}>Supprimer</Button>
			{/if}
		{/if}
	{/snippet}
</PageHeader>

<div class="grid gap-6 lg:grid-cols-3">
	<!-- Stats -->
	<Card>
		<h3 class="mb-4 font-semibold text-gray-900">Statistiques du stock</h3>
		<div class="space-y-4">
			<div class="flex justify-between">
				<span class="text-gray-500">Produits</span>
				<span class="font-semibold">{data.stats.productCount}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-500">Quantité totale</span>
				<span class="font-semibold">{data.stats.totalQuantity} unités</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-500">Valeur du stock</span>
				<span class="font-semibold text-blue-600">{formatXOF(data.stats.totalValue)}</span>
			</div>
		</div>
	</Card>

	<!-- Details / Edit Form -->
	<Card class="lg:col-span-2">
		{#if editing}
			<h3 class="mb-4 font-semibold text-gray-900">Modifier l'entrepôt</h3>
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
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
						label="Nom *"
						value={form?.data?.name ?? data.warehouse.name}
						error={form?.errors?.name?.[0]}
						required
					/>
					<Input
						name="address"
						label="Adresse"
						value={form?.data?.address ?? data.warehouse.address ?? ''}
						error={form?.errors?.address?.[0]}
					/>
					<div class="grid gap-4 sm:grid-cols-2">
						<Input
							name="contactName"
							label="Nom du contact"
							value={form?.data?.contactName ?? data.warehouse.contactName ?? ''}
							error={form?.errors?.contactName?.[0]}
						/>
						<Input
							name="contactPhone"
							label="Téléphone"
							value={form?.data?.contactPhone ?? data.warehouse.contactPhone ?? ''}
							error={form?.errors?.contactPhone?.[0]}
						/>
					</div>
					<Input
						name="contactEmail"
						type="email"
						label="Email"
						value={form?.data?.contactEmail ?? data.warehouse.contactEmail ?? ''}
						error={form?.errors?.contactEmail?.[0]}
					/>
				</div>
				<div class="mt-6 flex justify-end">
					<Button type="submit" {loading}>Enregistrer</Button>
				</div>
			</form>
		{:else}
			<h3 class="mb-4 font-semibold text-gray-900">Informations</h3>
			<dl class="space-y-3">
				<div class="flex justify-between">
					<dt class="text-gray-500">Nom</dt>
					<dd class="font-medium">{data.warehouse.name}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Adresse</dt>
					<dd>{data.warehouse.address || '—'}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Contact</dt>
					<dd>{data.warehouse.contactName || '—'}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Téléphone</dt>
					<dd>{data.warehouse.contactPhone || '—'}</dd>
				</div>
				<div class="flex justify-between">
					<dt class="text-gray-500">Email</dt>
					<dd>{data.warehouse.contactEmail || '—'}</dd>
				</div>
			</dl>
		{/if}
	</Card>
</div>

<!-- Assigned Users -->
<Card class="mt-6">
	<h3 class="mb-4 font-semibold text-gray-900">Utilisateurs assignés</h3>
	{#if data.assignedUsers.length === 0}
		<p class="text-sm text-gray-500">Aucun utilisateur assigné à cet entrepôt.</p>
	{:else}
		<div class="divide-y divide-gray-100">
			{#each data.assignedUsers as u (u.id)}
				<div class="flex items-center justify-between py-3">
					<div>
						<p class="font-medium text-gray-900">{u.name}</p>
						<p class="text-sm text-gray-500">{u.email}</p>
					</div>
					<Badge variant={roleBadgeVariant[u.role ?? 'viewer'] ?? 'default'}>
						{u.role ?? 'viewer'}
					</Badge>
				</div>
			{/each}
		</div>
	{/if}
</Card>

<!-- Delete Confirmation Modal -->
<ConfirmModal
	bind:open={showDeleteModal}
	title="Supprimer l'entrepôt"
	message="Êtes-vous sûr de vouloir supprimer cet entrepôt ? Cette action est irréversible."
	confirmLabel="Supprimer"
	variant="danger"
	oncancel={() => (showDeleteModal = false)}
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';
		document.body.appendChild(form);
		form.submit();
	}}
/>
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/\(app\)/warehouses/\[id\]/
git commit -m "feat(ui): implement warehouse detail page with edit and delete"
```

---

## Task 16: Implement Users List Page

**Files:**

- Modify: `src/routes/(app)/users/+page.svelte`
- Create: `src/routes/(app)/users/+page.server.ts`

**Step 1: Create the server load function**

Create `src/routes/(app)/users/+page.server.ts`:

```typescript
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user!.role as Role, 'admin');

	const users = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			isActive: user.isActive,
			createdAt: user.createdAt
		})
		.from(user);

	return { users };
};
```

**Step 2: Implement the users list page**

Replace `src/routes/(app)/users/+page.svelte`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, DataTable, EmptyState } from '$lib/components/ui';

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

	type User = (typeof data.users)[number];

	const columns = [
		{ key: 'name' as const, label: 'Nom' },
		{ key: 'email' as const, label: 'Email' },
		{
			key: 'role' as const,
			label: 'Rôle',
			render: (item: User) => Badge
		},
		{
			key: 'isActive' as const,
			label: 'Statut'
		}
	];
</script>

<PageHeader title="Utilisateurs" description="Gérez les comptes utilisateurs et leurs accès">
	{#snippet actions()}
		<Button onclick={() => goto(resolve('/users/new'))}>+ Nouvel utilisateur</Button>
	{/snippet}
</PageHeader>

{#if data.users.length === 0}
	<EmptyState
		icon="👥"
		title="Aucun utilisateur"
		description="Créez votre premier utilisateur pour commencer."
	>
		{#snippet action()}
			<Button onclick={() => goto(resolve('/users/new'))}>Créer un utilisateur</Button>
		{/snippet}
	</EmptyState>
{:else}
	<DataTable
		data={data.users}
		columns={[
			{ key: 'name', label: 'Nom' },
			{ key: 'email', label: 'Email' },
			{ key: 'role', label: 'Rôle' },
			{ key: 'isActive', label: 'Statut' }
		]}
		onrowclick={(user) => goto(resolve(`/users/${user.id}`))}
	>
		{#snippet role(item)}
			<Badge variant={roleBadgeVariant[item.role ?? 'viewer'] ?? 'default'}>
				{roleLabels[item.role ?? 'viewer'] ?? item.role}
			</Badge>
		{/snippet}
		{#snippet isActive(item)}
			<Badge variant={item.isActive ? 'success' : 'danger'}>
				{item.isActive ? 'Actif' : 'Inactif'}
			</Badge>
		{/snippet}
	</DataTable>
{/if}
```

Wait, the DataTable doesn't support named snippets for rendering columns yet. Let me adjust the approach.

**Step 2 (revised): Implement the users list page with inline rendering**

Replace `src/routes/(app)/users/+page.svelte`:

```svelte
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

<PageHeader title="Utilisateurs" description="Gérez les comptes utilisateurs et leurs accès">
	{#snippet actions()}
		<Button onclick={() => goto(resolve('/users/new'))}>+ Nouvel utilisateur</Button>
	{/snippet}
</PageHeader>

{#if data.users.length === 0}
	<EmptyState
		icon="👥"
		title="Aucun utilisateur"
		description="Créez votre premier utilisateur pour commencer."
	>
		{#snippet action()}
			<Button onclick={() => goto(resolve('/users/new'))}>Créer un utilisateur</Button>
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
						>Rôle</th
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
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
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
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/\(app\)/users/
git commit -m "feat(ui): implement users list page with role badges"
```

---

## Task 17: Implement Users Create Page

**Files:**

- Create: `src/routes/(app)/users/new/+page.svelte`
- Create: `src/routes/(app)/users/new/+page.server.ts`

**Step 1: Create the server load and action**

Create `src/routes/(app)/users/new/+page.server.ts`:

```typescript
import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, warehouses } from '$lib/server/db/schema';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { createUserSchema, ROLES } from '$lib/validators/user';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user!.role as Role, 'admin');

	const warehouseList = await db
		.select({ id: warehouses.id, name: warehouses.name })
		.from(warehouses)
		.where(eq(warehouses.isActive, true));

	return {
		roles: ROLES,
		warehouses: warehouseList
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: formData.get('name') as string,
			email: formData.get('email') as string,
			password: formData.get('password') as string,
			role: formData.get('role') as string
		};

		const parsed = createUserSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				data: { name: data.name, email: data.email, role: data.role },
				errors: parsed.error.flatten().fieldErrors
			});
		}

		// Check if email already exists
		const existing = await db.query.user.findFirst({
			where: eq(user.email, parsed.data.email)
		});

		if (existing) {
			return fail(400, {
				data: { name: data.name, email: data.email, role: data.role },
				errors: { email: ['Cet email est déjà utilisé'] }
			});
		}

		try {
			const result = await auth.api.signUpEmail({
				body: {
					name: parsed.data.name,
					email: parsed.data.email,
					password: parsed.data.password
				}
			});

			if (!result?.user) {
				return fail(500, {
					data: { name: data.name, email: data.email, role: data.role },
					errors: { email: ['Erreur lors de la création du compte'] }
				});
			}

			// Set the role
			if (parsed.data.role !== 'viewer') {
				await db.update(user).set({ role: parsed.data.role }).where(eq(user.id, result.user.id));
			}

			redirect(303, `/users/${result.user.id}`);
		} catch (e) {
			return fail(500, {
				data: { name: data.name, email: data.email, role: data.role },
				errors: { email: ['Erreur lors de la création du compte'] }
			});
		}
	}
};
```

**Step 2: Create the form page**

Create `src/routes/(app)/users/new/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Select, Card } from '$lib/components/ui';

	let { data, form } = $props();
	let loading = $state(false);

	const roleLabels: Record<string, string> = {
		admin: 'Administrateur',
		admin_manager: 'Admin Gestionnaire',
		manager: 'Gestionnaire',
		user: 'Utilisateur',
		admin_viewer: 'Admin Visiteur',
		viewer: 'Visiteur'
	};
</script>

<PageHeader title="Nouvel utilisateur" description="Créez un nouveau compte utilisateur">
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/users'))}>Annuler</Button>
	{/snippet}
</PageHeader>

<Card class="max-w-2xl">
	<form
		method="POST"
		use:enhance={() => {
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
				hint="Minimum 8 caractères"
				required
			/>

			<Select
				name="role"
				label="Rôle *"
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
			<Button type="submit" {loading}>Créer l'utilisateur</Button>
		</div>
	</form>
</Card>
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/\(app\)/users/new/
git commit -m "feat(ui): implement user creation page with role selection"
```

---

## Task 18: Implement User Detail Page

**Files:**

- Create: `src/routes/(app)/users/[id]/+page.svelte`
- Create: `src/routes/(app)/users/[id]/+page.server.ts`

**Step 1: Create the server load and actions**

Create `src/routes/(app)/users/[id]/+page.server.ts`:

```typescript
import { error, redirect, fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, userWarehouses, warehouses } from '$lib/server/db/schema';
import { requireRole, type Role } from '$lib/server/auth/rbac';
import { updateUserSchema, ROLES, assignWarehousesSchema } from '$lib/validators/user';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireRole(locals.user!.role as Role, 'admin');

	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, params.id),
		with: {
			warehouses: {
				with: {
					warehouse: true
				}
			}
		}
	});

	if (!targetUser) {
		error(404, 'Utilisateur non trouvé');
	}

	const allWarehouses = await db
		.select({ id: warehouses.id, name: warehouses.name })
		.from(warehouses)
		.where(eq(warehouses.isActive, true));

	return {
		targetUser: {
			id: targetUser.id,
			name: targetUser.name,
			email: targetUser.email,
			role: targetUser.role,
			isActive: targetUser.isActive,
			createdAt: targetUser.createdAt,
			warehouses: targetUser.warehouses.map((uw) => uw.warehouse)
		},
		allWarehouses,
		roles: ROLES,
		isCurrentUser: locals.user!.id === params.id
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const data = {
			name: (formData.get('name') as string) || undefined,
			role: (formData.get('role') as string) || undefined,
			isActive: formData.get('isActive') === 'true'
		};

		const parsed = updateUserSchema.safeParse(data);

		if (!parsed.success) {
			return fail(400, {
				action: 'update',
				errors: parsed.error.flatten().fieldErrors
			});
		}

		await db
			.update(user)
			.set({
				...parsed.data,
				updatedAt: sql`(datetime('now'))`
			})
			.where(eq(user.id, params.id));

		return { success: true, action: 'update' };
	},

	assignWarehouses: async ({ params, request, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		const formData = await request.formData();
		const warehouseIds = formData.getAll('warehouseIds') as string[];

		const parsed = assignWarehousesSchema.safeParse({ warehouseIds });

		if (!parsed.success) {
			return fail(400, {
				action: 'assignWarehouses',
				errors: parsed.error.flatten().fieldErrors
			});
		}

		// Replace all assignments
		await db.delete(userWarehouses).where(eq(userWarehouses.userId, params.id));

		if (parsed.data.warehouseIds.length > 0) {
			await db.insert(userWarehouses).values(
				parsed.data.warehouseIds.map((warehouseId) => ({
					userId: params.id,
					warehouseId
				}))
			);
		}

		return { success: true, action: 'assignWarehouses' };
	},

	deactivate: async ({ params, locals }) => {
		requireRole(locals.user!.role as Role, 'admin');

		if (locals.user!.id === params.id) {
			return fail(400, {
				action: 'deactivate',
				error: 'Vous ne pouvez pas désactiver votre propre compte'
			});
		}

		await db
			.update(user)
			.set({ isActive: false, updatedAt: sql`(datetime('now'))` })
			.where(eq(user.id, params.id));

		redirect(303, '/users');
	}
};
```

**Step 2: Create the detail page**

Create `src/routes/(app)/users/[id]/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Input, Select, Card, Badge, ConfirmModal } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast';

	let { data, form } = $props();

	let editing = $state(false);
	let editingWarehouses = $state(false);
	let loading = $state(false);
	let showDeactivateModal = $state(false);

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
			toast.success('Utilisateur mis à jour');
		}
		if (form?.success && form.action === 'assignWarehouses') {
			editingWarehouses = false;
			toast.success('Entrepôts assignés');
		}
		if (form?.error) {
			toast.error(form.error);
		}
	});

	let selectedWarehouses = $state<Set<string>>(
		new Set(data.targetUser.warehouses.map((w) => w.id))
	);

	function toggleWarehouse(id: string) {
		if (selectedWarehouses.has(id)) {
			selectedWarehouses.delete(id);
		} else {
			selectedWarehouses.add(id);
		}
		selectedWarehouses = new Set(selectedWarehouses);
	}
</script>

<PageHeader title={data.targetUser.name} description={data.targetUser.email}>
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/users'))}>← Retour</Button>
		{#if !data.isCurrentUser}
			{#if editing}
				<Button variant="secondary" onclick={() => (editing = false)}>Annuler</Button>
			{:else}
				<Button variant="secondary" onclick={() => (editing = true)}>Modifier</Button>
				{#if data.targetUser.isActive}
					<Button variant="danger" onclick={() => (showDeactivateModal = true)}>Désactiver</Button>
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
						label="Nom"
						value={data.targetUser.name}
						error={form?.action === 'update' ? form?.errors?.name?.[0] : undefined}
						required
					/>

					<Select
						name="role"
						label="Rôle"
						value={data.targetUser.role ?? 'viewer'}
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
					<Button type="submit" {loading}>Enregistrer</Button>
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
					<dt class="text-gray-500">Rôle</dt>
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
			<h3 class="font-semibold text-gray-900">Entrepôts assignés</h3>
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
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
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
					<Button type="submit" size="sm" {loading}>Enregistrer</Button>
				</div>
			</form>
		{:else if data.targetUser.warehouses.length === 0}
			<p class="text-sm text-gray-500">Aucun entrepôt assigné.</p>
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

<!-- Deactivate Confirmation Modal -->
<ConfirmModal
	bind:open={showDeactivateModal}
	title="Désactiver l'utilisateur"
	message="Êtes-vous sûr de vouloir désactiver ce compte ? L'utilisateur ne pourra plus se connecter."
	confirmLabel="Désactiver"
	variant="danger"
	oncancel={() => (showDeactivateModal = false)}
	onconfirm={() => {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/deactivate';
		document.body.appendChild(form);
		form.submit();
	}}
/>
```

**Step 3: Verify TypeScript compiles**

Run:

```bash
pnpm check
```

**Step 4: Commit**

```bash
git add src/routes/\(app\)/users/\[id\]/
git commit -m "feat(ui): implement user detail page with edit and warehouse assignment"
```

---

## Task 19: Add Toast to App Layout

**Files:**

- Modify: `src/routes/(app)/+layout.svelte`

**Step 1: Add Toast component to layout**

Update `src/routes/(app)/+layout.svelte` to include the Toast component:

```svelte
<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import { Toast } from '$lib/components/ui';

	let { data, children } = $props();
</script>

<Toast />

<div class="flex h-screen bg-gray-50">
	<Sidebar role={data.user.role ?? 'viewer'} />

	<div class="flex flex-1 flex-col overflow-hidden">
		<Header userName={data.user.name} />

		<main class="flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
			{@render children()}
		</main>
	</div>

	<BottomNav />
</div>
```

**Step 2: Commit**

```bash
git add src/routes/\(app\)/+layout.svelte
git commit -m "feat(ui): add Toast notifications to app layout"
```

---

## Task 20: Run svelte-autofixer and Final Verification

**Step 1: Run svelte-autofixer on all new components**

For each component created, run the MCP svelte-autofixer tool to verify correctness.

**Step 2: Run full checks**

Run:

```bash
pnpm check
```

Expected: No errors.

Run:

```bash
pnpm lint
```

Expected: Pass (or only pre-existing issues).

**Step 3: Format code**

Run:

```bash
pnpm format
```

**Step 4: Run dev server and test manually**

Run:

```bash
pnpm dev
```

Test the following flows:

1. Navigate to `/warehouses` - should show list or empty state
2. Click "Nouvel entrepôt" - should show creation form
3. Create a warehouse - should redirect to detail page
4. Navigate to `/users` - should show list
5. Click "Nouvel utilisateur" - should show creation form
6. Create a user - should redirect to detail page
7. Toast notifications appear on successful actions

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: format and finalize Week 1 frontend pages"
```

---

## Summary: What This Plan Builds

| Area              | What's Created                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| **UI Components** | Button, Input, Select, Card, Badge, Modal, Toast, DataTable, ConfirmModal, EmptyState, PageHeader (11 components) |
| **Stores**        | Toast notification store                                                                                          |
| **Warehouses**    | List page with stats, create page, detail page with edit/delete                                                   |
| **Users**         | List page with roles/status badges, create page, detail page with role edit and warehouse assignment              |
| **Layout**        | Toast notifications integrated                                                                                    |

This completes the missing Week 1 frontend work per the tracking plan.
