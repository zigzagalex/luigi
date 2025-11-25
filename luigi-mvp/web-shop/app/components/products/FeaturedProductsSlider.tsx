"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/utils/products";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
  title?: string;
};

const VISIBLE_COUNT = 2;
const INTERVAL_MS = 4000; // slide every 5s, tweak if you want faster/slower

export default function FeaturedProductsSlider({ products, title }: Props) {
  const items = useMemo(() => products.slice(0, 12), [products]);
  const total = items.length;

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (total <= VISIBLE_COUNT) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [total]);

  if (total === 0) return null;

  const translatePercent = (index * 100) / VISIBLE_COUNT;

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
                flex: `0 0 ${100 / VISIBLE_COUNT}%`, // 2 tiles visible
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
