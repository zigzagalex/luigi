"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Product } from "@/../utils/products";
import styles from "./ProductCard.module.css";

type Props = {
  product: Product;
  /** Optional: minimum price from availability search (in cents) */
  minPriceCents?: number;
  /** Optional: minimum "from" price per day from price points (in cents) */
  fromPricePerDayCents?: number;
  /** Optional: total available quantity for this product */
  availableQuantity?: number;
  /** Optional: search parameters from search pill */
  linkSearchParams?: Record<string, string | undefined>;

};

const FALLBACK_IMAGE =
  "https://images.pexels.com/photos/276517/pexels-photo-276517.jpeg?auto=compress&cs=tinysrgb&w=800";

function buildProductHref(
    productId: number,
    linkSearchParams?: Record<string, string | undefined>
  ) {
    const base = `/products/${productId}`;
    if (!linkSearchParams) return base;
  
    const params = new URLSearchParams();
  
    for (const [key, value] of Object.entries(linkSearchParams)) {
      if (value == null) continue;
      const v = value.trim();
      if (v === "") continue;
      params.set(key, v);
    }
  
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }
  

export default function ProductCard({
  product,
  minPriceCents,
  fromPricePerDayCents,
  availableQuantity,
  linkSearchParams,
}: Props) {
  const t = useTranslations("productCard");
  const imageUrl = product.primary_image_url ?? FALLBACK_IMAGE;
  const href = buildProductHref(product.id, linkSearchParams);
  const displayFromPriceCents = minPriceCents ?? fromPricePerDayCents;
  const fromPriceLabel =
    displayFromPriceCents == null
      ? null
      : minPriceCents != null
        ? t("fromPrice", { price: (displayFromPriceCents / 100).toFixed(2) })
        : t("fromPricePerDay", { price: (displayFromPriceCents / 100).toFixed(2) });

  return (
    <Link href={href} className={styles.card}>
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

        {fromPriceLabel && (
          <p className={styles.price}>
            {fromPriceLabel}
            {typeof availableQuantity === "number" &&
              ` · ${t("availableBikes", { count: String(availableQuantity), suffix: availableQuantity === 1 ? "" : "s" })}`}
          </p>
        )}

        <span className={styles.cta}>
          <span>{t("viewDetails")}</span>
          <svg
            className={styles.ctaIcon}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M4.16666 10H15.8333M15.8333 10L10.8333 5M15.8333 10L10.8333 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
