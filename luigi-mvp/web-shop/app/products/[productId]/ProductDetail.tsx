"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/../utils/products";

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

// global ordering for sizes
const allSizeOptions = ["S", "M", "L"] as const;

/**
 * Extract size from attributes.
 * Handles sqlc shape: { RawMessage: { size: "S", ... }, Valid: true }
 */
function getVariantSize(v?: VariantWithImages | null): string | undefined {
  if (!v || !v.attributes) return undefined;
  const attrs = v.attributes as any;
  const raw = attrs.size ?? attrs.RawMessage?.size;
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

  // currently selected variant (fallback to first variant if id missing)
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId]
  );

  const images = selectedVariant?.images ?? [];

  // size -> variant lookup
  const sizeMap = useMemo(() => {
    const map = new Map<string, VariantWithImages>();
    variants.forEach((v) => {
      const size = getVariantSize(v);
      if (size) map.set(size, v);
    });
    return map;
  }, [variants]);

  // only sizes that actually exist, in S/M/L order
  const sizeOptions = useMemo(
    () => allSizeOptions.filter((s) => sizeMap.has(s)),
    [sizeMap]
  );

  const selectedSize = getVariantSize(selectedVariant);

  // Map (variantId, storeId) -> count of active items
  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();

    inventory.forEach((item) => {
      // ignore inactive / non-active status
      if (item.is_active === false) return;
      if (item.status && item.status !== "active") return;

      const key = `${item.product_variant_id}:${item.store_id}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });

    return map;
  }, [inventory]);

  const getAvailableQuantity = useCallback(
    (variantId: number | null | undefined, storeId: number | null | undefined): number => {
      if (!variantId || !storeId) return 0;
      return inventoryMap.get(`${variantId}:${storeId}`) ?? 0;
    },
    [inventoryMap]
  );

  // How many items for currently chosen variant + store
  const availableQuantity = useMemo(
    () => getAvailableQuantity(selectedVariant?.id ?? null, selectedStoreId),
    [selectedVariant?.id, selectedStoreId, getAvailableQuantity]
  );

  // for current variant: does this store have inventory?
  const storeHasInventoryForSelectedVariant = (storeId: number): boolean => {
    return getAvailableQuantity(selectedVariant?.id ?? null, storeId) > 0;
  };

  // On mount / when data changes:
  //  - pick smallest size that exists AND has inventory in any store
  //  - pick a store that has that size
  //  - reset main image index
  useEffect(() => {
    if (!variants.length || !stores.length || !inventory.length) {
      setSelectedVariantId(variants[0]?.id ?? null);
      setSelectedStoreId(null);
      return;
    }

    let newVariantId: number | null = null;
    let newStoreId: number | null = null;

    // Pick smallest size that actually has inventory somewhere
    for (const size of sizeOptions) {
      const v = sizeMap.get(size);
      if (!v) continue;

      const storeWithStock = stores.find(
        (s) => getAvailableQuantity(v.id, s.id) > 0
      );
      if (storeWithStock) {
        newVariantId = v.id;
        newStoreId = storeWithStock.id;
        break;
      }
    }

    // Fallback: no size has inventory → just pick first variant, no store
    if (newVariantId === null) {
      setSelectedVariantId(variants[0]?.id ?? null);
      setSelectedStoreId(null);
      return;
    }

    setSelectedVariantId(newVariantId);
    setSelectedStoreId(newStoreId);
    setCurrentImageIndex(0);
  }, [variants, stores, inventory, sizeOptions, sizeMap, getAvailableQuantity]);

  // Clamp quantity whenever availability changes
  useEffect(() => {
    if (availableQuantity <= 0) {
      setQuantity(1);
    } else {
      setQuantity((q) => Math.min(Math.max(1, q), availableQuantity));
    }
  }, [availableQuantity]);

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
              const hasInv = storeHasInventoryForSelectedVariant(store.id);
              const isSelected =
                selectedStoreId === store.id && hasInv;

              return (
                <button
                  key={store.id}
                  type="button"
                  disabled={!hasInv}
                  onClick={() => hasInv && setSelectedStoreId(store.id)}
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

              const enabled =
                exists &&
                selectedStoreId !== null &&
                getAvailableQuantity(variantForSize!.id, selectedStoreId) > 0;

              const isSelected =
                enabled && selectedVariantId === variantForSize!.id;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={!enabled}
                  onClick={() =>
                    enabled && setSelectedVariantId(variantForSize!.id)
                  }
                  className={[
                    "product-detail-chip",
                    "product-detail-chip-size",
                    !enabled ? "chip-disabled" : "",
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
          <h2 className="product-detail-block-title">
            Quantity
            {availableQuantity > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                ({availableQuantity} available)
              </span>
            )}
          </h2>
          <div className="product-detail-quantity">
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.max(1, q - 1))
              }
              disabled={quantity <= 1}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) =>
                  Math.min(availableQuantity || 1, q + 1)
                )
              }
              disabled={availableQuantity === 0 || quantity >= availableQuantity}
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
            disabled={
              !selectedVariant ||
              !selectedStoreId ||
              availableQuantity === 0
            }
          >
            Add to cart
          </button>
        </div>
      </section>
    </div>
  );
}
