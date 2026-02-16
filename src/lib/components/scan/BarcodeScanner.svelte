<!-- src/lib/components/scan/BarcodeScanner.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		continuous?: boolean;
		onscan?: (code: string) => void;
		onerror?: (message: string) => void;
	}

	let { continuous = false, onscan, onerror }: Props = $props();

	let scanning = $state(false);
	let scanner: any = $state(null);
	let scannerRegionId = `scanner-${Math.random().toString(36).slice(2)}`;

	onMount(async () => {
		const { Html5Qrcode } = await import('html5-qrcode');
		scanner = new Html5Qrcode(scannerRegionId);
	});

	async function startScan() {
		if (!scanner) return;
		try {
			await scanner.start(
				{ facingMode: 'environment' },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				(code: string) => {
					onscan?.(code);
					if (!continuous) stopScan();
				},
				() => {} // ignore decode failures during scanning
			);
			scanning = true;
		} catch {
			onerror?.('Camera not available');
		}
	}

	async function stopScan() {
		if (scanner && scanning) {
			try {
				await scanner.stop();
			} catch {
				// ignore stop errors
			}
			scanning = false;
		}
	}

	onDestroy(() => {
		stopScan();
	});
</script>

<div class="space-y-3">
	<div id={scannerRegionId} class="overflow-hidden rounded-lg"></div>

	{#if !scanning}
		<button
			type="button"
			onclick={startScan}
			class="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
		>
			Scanner un code-barres
		</button>
	{:else}
		<button
			type="button"
			onclick={stopScan}
			class="w-full rounded-lg bg-gray-600 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700"
		>
			Arrêter le scan
		</button>
	{/if}
</div>
