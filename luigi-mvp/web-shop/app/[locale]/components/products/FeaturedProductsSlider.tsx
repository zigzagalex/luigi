"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";
import styles from "./FeaturedProductsSlider.module.css";

type Props = {
  products: Product[];
  title?: string;
};

const DESKTOP_VISIBLE_COUNT = 2;
const INTERVAL_MS = 5000;

export default function FeaturedProductsSlider({ products, title }: Props) {
  const t = useTranslations("featuredProducts");
  const items = useMemo(() => products.slice(0, 12), [products]);
  const total = items.length;

  const [visibleCount, setVisibleCount] = useState(DESKTOP_VISIBLE_COUNT);
  const [index, setIndex] = useState(0);

  // Responsive: 1 on mobile, 2 on desktop
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 640px)");

    const update = () => {
      setVisibleCount(mql.matches ? 1 : DESKTOP_VISIBLE_COUNT);
    };

    update();

    const handler = () => update();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Auto-slide by 1 product
  useEffect(() => {
    if (total === 0) return;

    const effectiveVisible = Math.max(1, Math.min(visibleCount, total));
    if (total <= effectiveVisible) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [total, visibleCount]);

  if (total === 0) return null;

  const effectiveVisible = Math.max(1, Math.min(visibleCount, total));

  // If visible=2, one "step" is 50% of viewport width
  const stepPercent = 100 / effectiveVisible;
  const translatePercent = index * stepPercent;

  return (
    <section className={styles.slider}>
      <div className={styles.header}>
        <h2>{title ?? t("title")}</h2>
      </div>

      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ transform: `translateX(-${translatePercent}%)` }}
        >
          {items.map((product) => (
            <div
              key={product.id}
              className={styles.item}
              style={{ flex: `0 0 ${stepPercent}%` }}
            >
              <div className={styles.cardWrap}>
                <ProductCard product={product} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
