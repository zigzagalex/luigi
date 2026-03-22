export function formatMoneyCents(
  cents: number,
  locale: string,
  currency: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Unit price in list previews, e.g. `CHF 150.00`. */
export function formatMoneyCentsCodeFirst(
  cents: number,
  currency: string,
): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}
