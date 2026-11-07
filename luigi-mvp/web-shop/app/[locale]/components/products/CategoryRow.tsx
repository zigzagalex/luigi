"use client";

import Link from "next/link";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";
import ScrollCue from "./ScrollCue";
import styles from "./CategoryRow.module.css";

type Props = {
  title: string;
  products: Product[];
  fromDailyPriceByCategory?: Record<string, number>;
  /** e.g. `/en/categories/mountain-bikes` — shows “View all” in the row header */
  viewAllHref?: string;
  linkSearchParams?: Record<string, string | undefined>;
};

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
}

export default function CategoryRow({
  title,
  products,
  fromDailyPriceByCategory,
  viewAllHref,
  linkSearchParams,
}: Props) {
  const t = useTranslations("categoryRow");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (!products.length) return null;

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
        <h2 className={styles.title}>{title}</h2>
        {viewAllHref ? (
          <Link href={viewAllHref} className={styles.viewAll}>
            {t("viewAll")}
          </Link>
        ) : null}
      </div>

      <div className={styles.body}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scroll("left")}
          aria-label={t("scrollLeft")}
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className={
            products.length > 1 ? `${styles.scroll} ${styles.scrollPeek}` : styles.scroll
          }
        >
          {products.map((p) => (
            <div key={p.id} className={styles.item}>
              <ProductCard
                product={p}
                fromPricePerDayCents={
                  fromDailyPriceByCategory?.[normalizeCategoryKey(p.price_category)]
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
          aria-label={t("scrollRight")}
        >
          ›
        </button>
      </div>
      <ScrollCue scrollRef={scrollRef} itemCount={products.length} />
    </section>
  );
}
