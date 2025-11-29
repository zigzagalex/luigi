"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/utils/products";

type VariantImage = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
};

type VariantWithImages = {
  id: number;
  product_id: number;
  label: string;
  attributes: Record<string, any> | null;
  is_active: boolean | null;
  images: VariantImage[];
};

type Store = {
  id: number;
  shop_id: number;
  name: string;
  is_active: boolean | null;
};

type InventoryItem = {
  id: number;
  shop_id: number;
  product_variant_id: number;
  store_id: number;
  status: string | null;
  is_active: boolean | null;
};

type Props = {
  product: Product;
  variants: VariantWithImages[];
  stores: Store[];
  inventory: InventoryItem[];
};

function getVariantSize(v: VariantWithImages): string | undefined {
  if (!v.attributes) return undefined;
  const raw = (v.attributes as any).size;
  return typeof raw === "string" ? raw : undefined;
}

export default function ProductDetail({
  product,
  variants,
  stores,
  inventory,
}: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    variants[0]?.id ?? null
  );
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId]
  );

  const images = selectedVariant?.images ?? [];

  const sizeMap = useMemo(() => {
    const map = new Map<string, VariantWithImages>();
    variants.forEach((v) => {
      const size = getVariantSize(v);
      if (size) map.set(size, v);
    });
    return map;
  }, [variants]);

  const sizeOptions = ["S", "M", "L"]; // extend later if you want

  const selectedSize = getVariantSize(selectedVariant);

  // check if a store has inventory for this variant
  const storeHasInventory = (storeId: number): boolean => {
    if (!selectedVariant) return false;
    return inventory.some(
      (item) =>
        item.product_variant_id === selectedVariant.id &&
        item.store_id === storeId &&
        item.is_active !== false &&
        (!item.status || item.status === "active")
    );
  };

  // whenever variant changes, reset image + auto-pick a store with inventory
  useEffect(() => {
    setCurrentImageIndex(0);
    if (!selectedVariant) {
      setSelectedStoreId(null);
      return;
    }
    const firstAvailable = stores.find((s) => storeHasInventory(s.id));
    setSelectedStoreId(firstAvailable ? firstAvailable.id : null);
  }, [selectedVariant?.id, stores.length]); // eslint can complain; it's fine here

  const handlePrevImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((idx) =>
      idx === 0 ? images.length - 1 : idx - 1
    );
  };

  const handleNextImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((idx) =>
      idx === images.length - 1 ? 0 : idx + 1
    );
  };

  const handleAddToCart = () => {
    // placeholder – later wire to your cart
    console.log("Add to cart clicked", {
      productId: product.id,
      variantId: selectedVariant?.id,
      storeId: selectedStoreId,
      pickupDate,
      dropoffDate,
      quantity,
    });
  };

  const title = product.name || `Bike #${product.id}`;
  const priceLabel = product.price_category || "standard";

  return (
    <div className="product-detail-layout">
      {/* LEFT: media (slideshow) */}
      <section className="product-detail-media">
        {images.length === 0 ? (
          <div className="product-detail-media-empty">
            <span>No images yet</span>
          </div>
        ) : (
          <>
            <div className="product-detail-image-main-wrapper">
              <button
                type="button"
                className="product-detail-image-arrow left"
                onClick={handlePrevImage}
              >
                ‹
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[currentImageIndex]?.url}
                alt={
                  images[currentImageIndex]?.alt_text ||
                  product.name ||
                  "Bike image"
                }
                className="product-detail-image-main"
              />

              <button
                type="button"
                className="product-detail-image-arrow right"
                onClick={handleNextImage}
              >
                ›
              </button>
            </div>

            <div className="product-detail-image-thumbs">
              {images.map((img, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt_text || ""}
                  className={
                    "product-detail-image-thumb" +
                    (idx === currentImageIndex
                      ? " product-detail-image-thumb-active"
                      : "")
                  }
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* RIGHT: info + controls */}
      <section className="product-detail-sidebar">
        {/* Title + price category pill */}
        <header className="product-detail-header">
          <h1 className="product-detail-title">{title}</h1>
          <div className="product-detail-subtitle">
            <span>Shop #{product.shop_id}</span>
          </div>
          <div className="product-detail-price-row">
            <span className="product-detail-price-pill">
              {priceLabel}
            </span>
          </div>
        </header>

        {/* Store selector */}
        <div className="product-detail-block">
          <h2 className="product-detail-block-title">Pick-up location</h2>
          <div className="product-detail-chip-row">
            {stores.map((store) => {
              const hasInv = storeHasInventory(store.id);
              const isSelected =
                selectedStoreId === store.id && hasInv;

              return (
                <button
                  key={store.id}
                  type="button"
                  disabled={!hasInv}
                  onClick={() =>
                    hasInv && setSelectedStoreId(store.id)
                  }
                  className={[
                    "product-detail-chip",
                    "product-detail-chip-store",
                    !hasInv ? "chip-disabled" : "",
                    isSelected ? "chip-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {store.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Size selector */}
        <div className="product-detail-block">
          <h2 className="product-detail-block-title">Size</h2>
          <div className="product-detail-chip-row">
            {sizeOptions.map((size) => {
              const variantForSize = sizeMap.get(size);
              const exists = !!variantForSize;
              const isSelected =
                selectedSize === size && exists;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={!exists}
                  onClick={() =>
                    exists &&
                    setSelectedVariantId(variantForSize!.id)
                  }
                  className={[
                    "product-detail-chip",
                    "product-detail-chip-size",
                    !exists ? "chip-disabled" : "",
                    isSelected ? "chip-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div className="product-detail-block">
          <h2 className="product-detail-block-title">
            Pick-up &amp; return
          </h2>
          <div className="product-detail-date-row">
            <div className="product-detail-date-field">
              <label>Pick-up</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div className="product-detail-date-field">
              <label>Return</label>
              <input
                type="date"
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="product-detail-block">
          <h2 className="product-detail-block-title">Quantity</h2>
          <div className="product-detail-quantity">
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.max(1, q - 1))
              }
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => q + 1)
              }
            >
              +
            </button>
          </div>
        </div>

        {/* Add to cart */}
        <div className="product-detail-block">
          <button
            type="button"
            className="product-detail-add-to-cart"
            onClick={handleAddToCart}
          >
            Add to cart
          </button>
        </div>
      </section>
    </div>
  );
}
