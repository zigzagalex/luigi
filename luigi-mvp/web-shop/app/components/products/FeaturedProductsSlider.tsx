"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/utils/products";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
  title?: string;
};

const DESKTOP_VISIBLE_COUNT = 2;
const INTERVAL_MS = 5000; // 5s per slide

export default function FeaturedProductsSlider({ products, title }: Props) {
  const items = useMemo(() => products.slice(0, 12), [products]);
  const total = items.length;

  const [visibleCount, setVisibleCount] = useState(DESKTOP_VISIBLE_COUNT);
  const [index, setIndex] = useState(0);

  // Responsive: 1 tile on mobile, 2 on desktop
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 640px)");

    const update = (matches: boolean) => {
      setVisibleCount(matches ? 1 : DESKTOP_VISIBLE_COUNT);
    };

    // initial
    update(mql.matches);

    const handler = (event: MediaQueryListEvent) => {
      update(event.matches);
    };

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
  const translatePercent = (index * 100) / effectiveVisible;

  return (
    <section className="featured-slider">
      <div className="featured-slider-header">
        <h2 className="section-title">
          {title ?? "Featured bikes"}
        </h2>
      </div>

      <div className="featured-slider-viewport">
        <div
          className="featured-slider-track"
          style={{
            display: "flex",
            transition: "transform 600ms ease-in-out",
            transform: `translateX(-${translatePercent}%)`,
          }}
        >
          {items.map((product) => (
            <div
              key={product.id}
              className="featured-slider-item"
              style={{
                flex: `0 0 ${100 / effectiveVisible}%`, // 100% on mobile, 50% on desktop
                padding: "0 0.5rem",
                boxSizing: "border-box",
              }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
