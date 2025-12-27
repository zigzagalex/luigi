import Link from "next/link";
import type { Product } from "@/../utils/products";
import styles from "./ProductCard.module.css";

type Props = {
  product: Product;
  /** Optional: minimum price from availability search (in cents) */
  minPriceCents?: number;
  /** Optional: total available quantity for this product */
  availableQuantity?: number;
};

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=800";

export default function ProductCard({
  product,
  minPriceCents,
  availableQuantity,
}: Props) {
  const imageUrl = product.primary_image_url ?? FALLBACK_IMAGE;

  return (
    <Link href={`/products/${product.id}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={product.name}
          className={styles.image}
          loading="lazy"
        />
      </div>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{product.name}</h3>

          {product.price_category && (
            <span className={styles.pill}>{product.price_category}</span>
          )}
        </div>

        {minPriceCents != null && (
          <p className={styles.price}>
            From CHF {(minPriceCents / 100).toFixed(2)}
            {typeof availableQuantity === "number" &&
              ` · ${availableQuantity} bike${availableQuantity === 1 ? "" : "s"} available`}
          </p>
        )}
      </div>
    </Link>
  );
}
