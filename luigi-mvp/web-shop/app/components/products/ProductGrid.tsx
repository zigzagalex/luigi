import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";
import styles from "./ProductGrid.module.css";

type AvailabilityInfo = {
  minPriceCents: number;
  availableQuantity?: number;
};

type Props = {
  products: Product[];
  availabilityInfo?: Record<number, AvailabilityInfo>;
  className?: string; // optional extra class from caller
  variant?: "default" | "search"; // 👈 add this
};

export default function ProductGrid({
  products,
  availabilityInfo,
  className,
  variant = "default",
}: Props) {
  if (!products.length) return null;

  const baseClass = variant === "search" ? styles.searchGrid : styles.grid;

  return (
    <div className={[baseClass, className].filter(Boolean).join(" ")}>
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
