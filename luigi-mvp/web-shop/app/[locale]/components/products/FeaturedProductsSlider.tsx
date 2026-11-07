"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";
import ScrollCue from "./ScrollCue";
import styles from "./FeaturedProductsSlider.module.css";

type Props = {
  products: Product[];
  title?: string;
  fromDailyPriceByCategory?: Record<string, number>;
  linkSearchParams?: Record<string, string | undefined>;
};

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
}

export default function FeaturedProductsSlider({
  products,
  title,
  fromDailyPriceByCategory,
  linkSearchParams,
}: Props) {
  const featuredT = useTranslations("featuredProducts");
  const rowT = useTranslations("categoryRow");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const items = products.slice(0, 12);

  if (!items.length) return null;

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className={styles.row}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title ?? featuredT("title")}</h2>
      </div>

      <div className={styles.body}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scroll("left")}
          aria-label={rowT("scrollLeft")}
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className={
            items.length > 1 ? `${styles.scroll} ${styles.scrollPeek}` : styles.scroll
          }
        >
          {items.map((product) => (
            <div key={product.id} className={styles.item}>
              <ProductCard
                product={product}
                fromPricePerDayCents={
                  fromDailyPriceByCategory?.[
                    normalizeCategoryKey(product.price_category)
                  ]
                }
                linkSearchParams={linkSearchParams}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => scroll("right")}
          aria-label={rowT("scrollRight")}
        >
          ›
        </button>
      </div>
      <ScrollCue scrollRef={scrollRef} itemCount={items.length} />
    </section>
  );
}
