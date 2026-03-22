export function formatStoreAddress(s: {
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
}): string {
  const line12 = [s.line1, s.line2].filter(Boolean).join(", ");
  const cityLine = [s.postalCode, s.city].filter(Boolean).join(" ");
  return [line12, cityLine, s.country].filter(Boolean).join(", ");
}

export function googleMapsSearchUrl(address: string): string {
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
