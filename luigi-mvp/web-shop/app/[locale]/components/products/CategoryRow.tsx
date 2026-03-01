"use client";

import { useRef } from "react";
import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";
import styles from "./CategoryRow.module.css";

type Props = {
  title: string;
  products: Product[];
};

export default function CategoryRow({ title, products }: Props) {
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
      </div>

      <div className={styles.body}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={() => scroll("left")}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div ref={scrollRef} className={styles.scroll}>
          {products.map((p) => (
            <div key={p.id} className={styles.item}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={() => scroll("right")}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </section>
  );
}
