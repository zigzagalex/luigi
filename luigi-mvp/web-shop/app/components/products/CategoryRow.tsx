"use client";

import { useRef } from "react";
import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";

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
    <section className="category-row">
      <div className="category-row-header">
        <h2 className="category-row-title">{title}</h2>
      </div>

      <div className="category-row-body">
        <button
          type="button"
          className="category-row-arrow category-row-arrow-left"
          onClick={() => scroll("left")}
        >
          ‹
        </button>

        <div ref={scrollRef} className="category-row-scroll">
          {products.map((p) => (
            <div key={p.id} className="category-row-item">
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="category-row-arrow category-row-arrow-right"
          onClick={() => scroll("right")}
        >
          ›
        </button>
      </div>
    </section>
  );
}
