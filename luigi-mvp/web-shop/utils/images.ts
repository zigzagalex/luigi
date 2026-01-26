// utils/images.ts
import type { ProductVariantImage } from "@/../utils/products";

export function getPrimaryVariantImage(
  images?: ProductVariantImage[] | null
): ProductVariantImage | null {
  if (!images || images.length === 0) return null;

  const primary = images.find((i) => i.is_primary);
  if (primary) return primary;

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0] ?? null;
}
