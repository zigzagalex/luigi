/** Shop for this deploy. Local default is the seeded shop. */
export function readShopId(): number {
  const raw = (process.env.NEXT_PUBLIC_SHOP_ID ?? "1").trim();
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`NEXT_PUBLIC_SHOP_ID must be a positive integer (got ${JSON.stringify(raw)})`);
  }
  return n;
}

export const SHOP_ID = readShopId();
