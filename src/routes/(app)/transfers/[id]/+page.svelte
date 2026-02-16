<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { PageHeader, Button, Badge, Card, ConfirmModal, Modal, Input } from '$lib/components/ui';
	import { formatDate } from '$lib/utils/format';

	let { data, form } = $props();
	let loading = $state(false);

	// Cast form to avoid discriminated union narrowing issues
	const formResult = $derived(
		form as
			| {
					error?: string;
					errors?: Record<string, string[]>;
			  }
			| null
			| undefined
	);

	// Modal states
	let showRejectModal = $state(false);
	let showCancelModal = $state(false);
	let showReceiveModal = $state(false);
	let showResolveModal = $state(false);
	let showShipConfirm = $state(false);
	let showApproveConfirm = $state(false);

	// Reject form
	let rejectReason = $state('');

	// Resolve form
	let resolution = $state('');

	// Receive form: quantities per item — use $derived for initialization from data
	const defaultReceiveQuantities = $derived(
		Object.fromEntries(
			data.items.map((item) => [item.id, String(item.quantitySent ?? item.quantityRequested)])
		) as Record<string, string>
	);
	const defaultAnomalyNotes = $derived(
		Object.fromEntries(data.items.map((item) => [item.id, ''])) as Record<string, string>
	);
	let receiveQuantities = $state<Record<string, string>>({});
	let anomalyNotes = $state<Record<string, string>>({});

	// Sync defaults when data changes
	$effect(() => {
		receiveQuantities = { ...defaultReceiveQuantities };
	});
	$effect(() => {
		anomalyNotes = { ...defaultAnomalyNotes };
	});

	type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

	const statusBadge: Record<string, { label: string; variant: BadgeVariant }> = {
		pending: { label: 'En attente', variant: 'warning' },
		approved: { label: 'Approuve', variant: 'info' },
		rejected: { label: 'Rejete', variant: 'danger' },
		shipped: { label: 'Expedie', variant: 'info' },
		received: { label: 'Recu', variant: 'success' },
		partially_received: { label: 'Partiel', variant: 'warning' },
		cancelled: { label: 'Annule', variant: 'default' },
		disputed: { label: 'Litige', variant: 'danger' },
		resolved: { label: 'Resolu', variant: 'success' }
	};

	function getStatusBadge(status: string) {
		return statusBadge[status] ?? { label: status, variant: 'default' as BadgeVariant };
	}

	// Build timeline from transfer dates
	const timeline = $derived.by(() => {
		const t = data.transfer;
		const events: { label: string; date: string | null; user: string | null; detail?: string }[] = [];

		events.push({
			label: 'Demande creee',
			date: t.requestedAt,
			user: t.requestedByName
		});

		if (t.approvedAt) {
			events.push({
				label: 'Approuve',
				date: t.approvedAt,
				user: t.approvedByName
			});
		}

		if (t.rejectedAt) {
			events.push({
				label: 'Rejete',
				date: t.rejectedAt,
				user: null,
				detail: t.rejectionReason ?? undefined
			});
		}

		if (t.shippedAt) {
			events.push({
				label: 'Expedie',
				date: t.shippedAt,
				user: t.shippedByName
			});
		}

		if (t.receivedAt) {
			events.push({
				label: t.status === 'disputed' || t.status === 'partially_received' ? 'Reception partielle' : 'Recu',
				date: t.receivedAt,
				user: t.receivedByName
			});
		}

		if (t.disputeReason) {
			events.push({
				label: 'Litige ouvert',
				date: t.receivedAt,
				user: null,
				detail: t.disputeReason
			});
		}

		if (t.disputeResolvedAt) {
			events.push({
				label: 'Litige resolu',
				date: t.disputeResolvedAt,
				user: t.disputeResolvedByName
			});
		}

		return events;
	});
</script>

<PageHeader title="Detail du transfert">
	{#snippet actions()}
		<Button variant="secondary" onclick={() => goto(resolve('/transfers'))}>
			Retour a la liste
		</Button>
	{/snippet}
</PageHeader>

{#if formResult?.error}
	<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
		{formResult.error}
	</div>
{/if}

<div class="grid gap-6 lg:grid-cols-3">
	<!-- Transfer info -->
	<div class="lg:col-span-2 space-y-6">
		<Card>
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">
						{data.transfer.sourceWarehouseName}
						<span class="mx-2 text-gray-400">&rarr;</span>
						{data.transfer.destinationWarehouseName}
					</h2>
					<p class="mt-1 text-sm text-gray-500">
						Demande par {data.transfer.requestedByName}
						le {formatDate(data.transfer.requestedAt)}
					</p>
				</div>
				<Badge variant={getStatusBadge(data.transfer.status).variant}>
					{getStatusBadge(data.transfer.status).label}
				</Badge>
			</div>

			{#if data.transfer.notes}
				<div class="mt-4 rounded-md bg-gray-50 p-3">
					<p class="text-xs font-medium text-gray-500 uppercase">Notes</p>
					<p class="mt-1 text-sm text-gray-700 whitespace-pre-line">{data.transfer.notes}</p>
				</div>
			{/if}

			{#if data.transfer.rejectionReason && data.transfer.status === 'rejected'}
				<div class="mt-4 rounded-md bg-red-50 p-3">
					<p class="text-xs font-medium text-red-600 uppercase">Motif de rejet</p>
					<p class="mt-1 text-sm text-red-700">{data.transfer.rejectionReason}</p>
				</div>
			{/if}

			{#if data.transfer.disputeReason && (data.transfer.status === 'disputed' || data.transfer.status === 'resolved')}
				<div class="mt-4 rounded-md bg-orange-50 p-3">
					<p class="text-xs font-medium text-orange-600 uppercase">Motif du litige</p>
					<p class="mt-1 text-sm text-orange-700">{data.transfer.disputeReason}</p>
				</div>
			{/if}
		</Card>

		<!-- Items table -->
		<Card class="overflow-hidden p-0">
			<div class="border-b border-gray-200 px-4 py-3">
				<h3 class="text-sm font-semibold text-gray-900">Articles ({data.items.length})</h3>
			</div>
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
							Produit
						</th>
						<th class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
							Demande
						</th>
						<th class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
							Envoye
						</th>
						<th class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
							Recu
						</th>
						<th class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
							Anomalie
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each data.items as item (item.id)}
						{@const sent = item.quantitySent ?? null}
						{@const received = item.quantityReceived ?? null}
						{@const hasAnomaly = received !== null && sent !== null && received < sent}
						<tr class={hasAnomaly ? 'bg-red-50' : ''}>
							<td class="px-4 py-3 text-sm">
								<span class="font-medium text-gray-900">{item.productName}</span>
								<span class="ml-1 text-xs font-mono text-gray-400">{item.productSku}</span>
							</td>
							<td class="px-4 py-3 text-sm text-right text-gray-900">
								{item.quantityRequested}
							</td>
							<td class="px-4 py-3 text-sm text-right text-gray-500">
								{sent !== null ? sent : '—'}
							</td>
							<td class="px-4 py-3 text-sm text-right {hasAnomaly ? 'font-medium text-red-600' : 'text-gray-500'}">
								{received !== null ? received : '—'}
							</td>
							<td class="px-4 py-3 text-sm text-gray-500">
								{item.anomalyNotes ?? '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</Card>
	</div>

	<!-- Sidebar: Timeline + Actions -->
	<div class="space-y-6">
		<!-- Timeline -->
		<Card>
			<h3 class="mb-4 text-sm font-semibold text-gray-900">Historique</h3>
			<div class="space-y-4">
				{#each timeline as event, i (i)}
					<div class="relative flex gap-3 {i < timeline.length - 1 ? 'pb-4' : ''}">
						{#if i < timeline.length - 1}
							<div class="absolute top-3 left-1.5 h-full w-px bg-gray-200"></div>
						{/if}
						<div class="relative mt-0.5 h-3 w-3 flex-shrink-0 rounded-full bg-blue-600"></div>
						<div class="min-w-0">
							<p class="text-sm font-medium text-gray-900">{event.label}</p>
							{#if event.user}
								<p class="text-xs text-gray-500">{event.user}</p>
							{/if}
							{#if event.date}
								<p class="text-xs text-gray-400">{formatDate(event.date)}</p>
							{/if}
							{#if event.detail}
								<p class="mt-1 text-xs text-gray-600 italic">{event.detail}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</Card>

		<!-- Actions -->
		{#if data.canApprove || data.canShip || data.canReceive || data.canCancel || data.canResolve}
			<Card>
				<h3 class="mb-4 text-sm font-semibold text-gray-900">Actions</h3>
				<div class="space-y-2">
					{#if data.canApprove}
						<Button
							class="w-full"
							onclick={() => {
								showApproveConfirm = true;
							}}
						>
							Approuver
						</Button>
						<Button
							variant="danger"
							class="w-full"
							onclick={() => {
								showRejectModal = true;
							}}
						>
							Rejeter
						</Button>
					{/if}

					{#if data.canShip}
						<Button
							class="w-full"
							onclick={() => {
								showShipConfirm = true;
							}}
						>
							Expedier
						</Button>
					{/if}

					{#if data.canReceive}
						<Button
							class="w-full"
							onclick={() => {
								showReceiveModal = true;
							}}
						>
							Accuser reception
						</Button>
					{/if}

					{#if data.canResolve}
						<Button
							class="w-full"
							onclick={() => {
								showResolveModal = true;
							}}
						>
							Resoudre le litige
						</Button>
					{/if}

					{#if data.canCancel}
						<Button
							variant="danger"
							class="w-full"
							onclick={() => {
								showCancelModal = true;
							}}
						>
							Annuler le transfert
						</Button>
					{/if}
				</div>
			</Card>
		{/if}
	</div>
</div>

<!-- Approve Confirmation Modal -->
<ConfirmModal
	bind:open={showApproveConfirm}
	title="Approuver le transfert"
	message="Etes-vous sur de vouloir approuver ce transfert ?"
	confirmLabel="Approuver"
	variant="primary"
	{loading}
	onconfirm={() => {
		const form = document.getElementById('approve-form') as HTMLFormElement;
		form?.requestSubmit();
	}}
	oncancel={() => {
		showApproveConfirm = false;
	}}
/>
<form
	id="approve-form"
	method="POST"
	action="?/approve"
	class="hidden"
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			showApproveConfirm = false;
			await update();
		};
	}}
></form>

<!-- Ship Confirmation Modal -->
<ConfirmModal
	bind:open={showShipConfirm}
	title="Expedier le transfert"
	message="Le stock sera decompte de l'entrepot source. Confirmer l'expedition ?"
	confirmLabel="Expedier"
	variant="primary"
	{loading}
	onconfirm={() => {
		const form = document.getElementById('ship-form') as HTMLFormElement;
		form?.requestSubmit();
	}}
	oncancel={() => {
		showShipConfirm = false;
	}}
/>
<form
	id="ship-form"
	method="POST"
	action="?/ship"
	class="hidden"
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			showShipConfirm = false;
			await update();
		};
	}}
></form>

<!-- Cancel Confirmation Modal -->
<ConfirmModal
	bind:open={showCancelModal}
	title="Annuler le transfert"
	message="Etes-vous sur de vouloir annuler ce transfert ? Cette action est irreversible."
	confirmLabel="Annuler le transfert"
	variant="danger"
	{loading}
	onconfirm={() => {
		const form = document.getElementById('cancel-form') as HTMLFormElement;
		form?.requestSubmit();
	}}
	oncancel={() => {
		showCancelModal = false;
	}}
/>
<form
	id="cancel-form"
	method="POST"
	action="?/cancel"
	class="hidden"
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			showCancelModal = false;
			await update();
		};
	}}
></form>

<!-- Reject Modal with reason -->
<Modal bind:open={showRejectModal} title="Rejeter le transfert">
	<form
		method="POST"
		action="?/reject"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				showRejectModal = false;
				await update();
			};
		}}
	>
		<div class="space-y-4">
			<p class="text-sm text-gray-600">Indiquez le motif du rejet :</p>
			<div class="space-y-1">
				<label for="reject-reason" class="block text-sm font-medium text-gray-700">Motif *</label>
				<textarea
					id="reject-reason"
					name="reason"
					rows="3"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none"
					placeholder="Motif du rejet..."
					required
					bind:value={rejectReason}
				></textarea>
				{#if formResult?.errors?.reason?.[0]}
					<p class="text-sm text-red-600">{formResult.errors.reason[0]}</p>
				{/if}
			</div>
		</div>
		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => { showRejectModal = false; }}>
				Annuler
			</Button>
			<Button type="submit" variant="danger" {loading}>
				Rejeter
			</Button>
		</div>
	</form>
</Modal>

<!-- Receive Modal with quantities -->
<Modal bind:open={showReceiveModal} title="Accuser reception">
	<form
		method="POST"
		action="?/receive"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				showReceiveModal = false;
				await update();
			};
		}}
	>
		<div class="space-y-4">
			<p class="text-sm text-gray-600">
				Indiquez les quantites recues pour chaque article :
			</p>
			{#each data.items as item, i (item.id)}
				<div class="rounded-md border border-gray-200 p-3">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-gray-900">{item.productName}</span>
						<span class="text-xs text-gray-500">
							Envoye: {item.quantitySent ?? item.quantityRequested}
						</span>
					</div>
					<input type="hidden" name={`items[${i}].transferItemId`} value={item.id} />
					<div class="grid grid-cols-2 gap-3">
						<Input
							name={`items[${i}].quantityReceived`}
							type="number"
							label="Quantite recue"
							min="0"
							step="1"
							value={receiveQuantities[item.id] ?? ''}
							oninput={(e) => {
								receiveQuantities[item.id] = e.currentTarget.value;
							}}
							required
						/>
						<div class="space-y-1">
							<label for={`anomaly-${item.id}`} class="block text-sm font-medium text-gray-700">
								Anomalie
							</label>
							<input
								id={`anomaly-${item.id}`}
								name={`items[${i}].anomalyNotes`}
								type="text"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none"
								placeholder="Notes..."
								value={anomalyNotes[item.id] ?? ''}
								oninput={(e) => {
									anomalyNotes[item.id] = (e.currentTarget as HTMLInputElement).value;
								}}
							/>
						</div>
					</div>
				</div>
			{/each}
			{#if formResult?.errors?.items?.[0]}
				<p class="text-sm text-red-600">{formResult.errors.items[0]}</p>
			{/if}
		</div>
		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => { showReceiveModal = false; }}>
				Annuler
			</Button>
			<Button type="submit" {loading}>
				Confirmer la reception
			</Button>
		</div>
	</form>
</Modal>

<!-- Resolve Dispute Modal -->
<Modal bind:open={showResolveModal} title="Resoudre le litige">
	<form
		method="POST"
		action="?/resolve"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				showResolveModal = false;
				await update();
			};
		}}
	>
		<div class="space-y-4">
			<p class="text-sm text-gray-600">Decrivez la resolution du litige :</p>
			<div class="space-y-1">
				<label for="resolve-resolution" class="block text-sm font-medium text-gray-700">
					Resolution *
				</label>
				<textarea
					id="resolve-resolution"
					name="resolution"
					rows="3"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:outline-none"
					placeholder="Resolution du litige..."
					required
					bind:value={resolution}
				></textarea>
				{#if formResult?.errors?.resolution?.[0]}
					<p class="text-sm text-red-600">{formResult.errors.resolution[0]}</p>
				{/if}
			</div>
			<input type="hidden" name="adjustStock" value="false" />
		</div>
		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" onclick={() => { showResolveModal = false; }}>
				Annuler
			</Button>
			<Button type="submit" {loading}>
				Resoudre
			</Button>
		</div>
	</form>
</Modal>
