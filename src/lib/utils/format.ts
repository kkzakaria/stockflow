// src/lib/utils/format.ts

export function formatXOF(amount: number): string {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'XOF',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatDate(date: string | null | undefined): string {
	if (!date) return '—';
	return new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(date));
}

export function formatQuantity(qty: number, unit: string = 'unité'): string {
	return `${qty.toLocaleString('fr-FR')} ${unit}${qty > 1 && unit === 'unité' ? 's' : ''}`;
}
