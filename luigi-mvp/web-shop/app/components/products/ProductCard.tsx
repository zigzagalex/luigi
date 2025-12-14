import Link from "next/link";
import type { Product } from "@/../utils/products";

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
    <Link href={`/products/${product.id}`} className="product-card">
      <div className="product-card-image-wrapper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={product.name} className="product-card-image" />
      </div>

      <div className="product-card-content">
        <div className="product-card-title-row">
          <h3 className="product-card-title">{product.name}</h3>
          {product.price_category && (
            <span className="product-card-pill">
              {product.price_category}
            </span>
          )}
        </div>

        {/* 🔥 Price + availability from availability/search */}
        {minPriceCents != null && (
          <p className="product-card-price">
            From CHF {(minPriceCents / 100).toFixed(2)}
            {typeof availableQuantity === "number" &&
              ` · ${availableQuantity} bike${
                availableQuantity === 1 ? "" : "s"
              } available`}
          </p>
        )}
      </div>
    </Link>
  );
}
