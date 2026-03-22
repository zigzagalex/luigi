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
  /** Normalized price_category key → from-price per day (cents), same as homepage rows */
  fromDailyPriceByCategory?: Record<string, number>;
  className?: string;
  linkSearchParams?: Record<string, string | undefined>;
};

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
}

export default function ProductGrid({
  products,
  availabilityInfo,
  fromDailyPriceByCategory,
  className,
  linkSearchParams,
}: Props) {
  if (!products.length) return null;

  return (
    <div className={[styles.grid, className].filter(Boolean).join(" ")}>
      {products.map((product) => {
        const info = availabilityInfo?.[product.id];

        return (
          <ProductCard
            key={product.id}
            product={product}
            minPriceCents={info?.minPriceCents}
            fromPricePerDayCents={
              fromDailyPriceByCategory?.[
                normalizeCategoryKey(product.price_category)
              ]
            }
            availableQuantity={info?.availableQuantity}
            linkSearchParams={linkSearchParams}
          />
        );
      })}
    </div>
  );
}
