/**
 * Shared utilities and helpers.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Format an integer amount of cents as a display price, e.g. 12900 -> "$129.00".
 */
export function formatPrice(cents: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Title-case a status string like "pending" -> "Pending".
 */
export function titleCase(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export {mergeGuestAfterAuth} from './mergeGuest';
