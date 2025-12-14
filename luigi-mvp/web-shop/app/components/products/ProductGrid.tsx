import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";

type AvailabilityInfo = {
  minPriceCents: number;
  availableQuantity?: number;
};

type Props = {
  products: Product[];
  availabilityInfo?: Record<number, AvailabilityInfo>;
  className?: string; // 👈 NEW
};

export default function ProductGrid({ products, availabilityInfo, className }: Props) {
  if (!products.length) return null;

  const gridClassName = ["product-grid", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={gridClassName}>
      {products.map((product) => {
        const info = availabilityInfo?.[product.id];

        return (
          <ProductCard
            key={product.id}
            product={product}
            minPriceCents={info?.minPriceCents}
            availableQuantity={info?.availableQuantity}
          />
        );
      })}
    </div>
  );
}
