// app/components/products/ProductCard.tsx
import Link from "next/link";
import type { Product } from "@/utils/products";

type Props = {
  product: Product;
};

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=800";

export default function ProductCard({ product }: Props) {
  const primaryImageUrl = product.primary_image_url ?? FALLBACK_IMAGE;

  const initials = product.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-100">
        {primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-lg font-semibold text-neutral-500">
            {initials}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-neutral-900 line-clamp-1">
            {product.name}
          </span>
          <span className="text-xs text-neutral-500">
            Shop #{product.shop_id}
          </span>
        </div>

        {product.price_category && (
          <span className="shrink-0 rounded-full border border-neutral-200 px-2 py-[2px] text-[10px] font-medium uppercase tracking-wide text-neutral-600">
            {product.price_category}
          </span>
        )}
      </div>
    </Link>
  );
}
