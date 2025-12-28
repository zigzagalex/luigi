"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/../utils/products";
import styles from "./ProductDetail.module.css";
import { AvailabilityRangeCalendar, type RangeValue } from "@/components/daterangepicker/AvailabilityRangeCalendar";

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

const allSizeOptions = ["S", "M", "L"] as const;

function getVariantSize(v?: VariantWithImages | null): string | undefined {
  if (!v || !v.attributes) return undefined;
  const attrs = v.attributes as any;
  const raw = attrs.size ?? attrs.RawMessage?.size;
  return typeof raw === "string" ? raw : undefined;
}

function formatDateForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatRangeLabel(range: RangeValue): string {
  if (!range.from) return "Add dates";
  const from = range.from;
  const to = range.to ?? range.from;

  const fmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short" });
  const fromStr = fmt.format(from);
  const toStr = fmt.format(to);

  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}.–${toStr}`;
  }
  return `${fromStr}–${toStr}`;
}

export default function ProductDetail({ product, variants, stores, inventory }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(variants[0]?.id ?? null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  const [range, setRange] = useState<RangeValue>({ from: undefined, to: undefined });

  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // calendar popover
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarWrapRef = useRef<HTMLDivElement | null>(null);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId]
  );

  const handleRangeChange = useCallback((next: RangeValue) => {
    setRange(next);
  
    // after picking the start date, keep popover open and guide to end date
    if (next.from && !next.to) {
      setActiveDateField("to");
      return;
    }

    // close only when end date is picked
    if (next.from && next.to) {
      setCalendarOpen(false);
    }
  }, []);
  

  const canPickDates = selectedVariant?.id != null && selectedStoreId != null;

  const images = selectedVariant?.images ?? [];

  const sizeMap = useMemo(() => {
    const map = new Map<string, VariantWithImages>();
    variants.forEach((v) => {
      const size = getVariantSize(v);
      if (size) map.set(size, v);
    });
    return map;
  }, [variants]);

  const sizeOptions = useMemo(() => allSizeOptions.filter((s) => sizeMap.has(s)), [sizeMap]);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventory.forEach((item) => {
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

  const availableQuantity = useMemo(
    () => getAvailableQuantity(selectedVariant?.id ?? null, selectedStoreId),
    [selectedVariant?.id, selectedStoreId, getAvailableQuantity]
  );

  const storeHasInventoryForSelectedVariant = (storeId: number): boolean => {
    return getAvailableQuantity(selectedVariant?.id ?? null, storeId) > 0;
  };

  // pick a sensible default store+variant combo
  useEffect(() => {
    if (!variants.length || !stores.length || !inventory.length) {
      setSelectedVariantId(variants[0]?.id ?? null);
      setSelectedStoreId(null);
      return;
    }

    let newVariantId: number | null = null;
    let newStoreId: number | null = null;

    for (const size of sizeOptions) {
      const v = sizeMap.get(size);
      if (!v) continue;

      const storeWithStock = stores.find((s) => getAvailableQuantity(v.id, s.id) > 0);
      if (storeWithStock) {
        newVariantId = v.id;
        newStoreId = storeWithStock.id;
        break;
      }
    }

    if (newVariantId === null) {
      setSelectedVariantId(variants[0]?.id ?? null);
      setSelectedStoreId(null);
      return;
    }

    setSelectedVariantId(newVariantId);
    setSelectedStoreId(newStoreId);
    setCurrentImageIndex(0);
  }, [variants, stores, inventory, sizeOptions, sizeMap, getAvailableQuantity]);

  // clamp quantity to stock
  useEffect(() => {
    if (availableQuantity <= 0) {
      setQuantity(1);
    } else {
      setQuantity((q) => Math.min(Math.max(1, q), availableQuantity));
    }
  }, [availableQuantity]);

  // optional: if store/variant changes, keep range but close the calendar
  useEffect(() => {
    setCalendarOpen(false);
  }, [selectedStoreId, selectedVariantId]);

  const handlePrevImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((idx) => (idx === 0 ? images.length - 1 : idx - 1));
  };

  const handleNextImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((idx) => (idx === images.length - 1 ? 0 : idx + 1));
  };

  const canAddToCart =
    !!selectedVariant &&
    !!selectedStoreId &&
    availableQuantity > 0 &&
    !!range.from &&
    !!range.to &&
    quantity >= 1 &&
    quantity <= availableQuantity;

  const handleAddToCart = () => {
    if (!canAddToCart || !selectedVariant || !selectedStoreId || !range.from || !range.to) return;

    console.log("Add to cart clicked", {
      productId: product.id,
      variantId: selectedVariant.id,
      storeId: selectedStoreId,
      start_date: formatDateForApi(range.from),
      end_date: formatDateForApi(range.to),
      quantity,
    });
  };

  const title = product.name || `Bike #${product.id}`;
  const priceLabel = product.price_category || "standard";
  const rangeLabel = formatRangeLabel(range);

  type ActiveDateField = "from" | "to";

  function formatPillDate(d?: Date) {
    if (!d) return "Add date";
    return new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "numeric" }).format(d);
  }

  const [activeDateField, setActiveDateField] = useState<ActiveDateField>("from");

  return (
    <div className={styles.inner}>
      <div className={styles.layout}>
        {/* LEFT: media */}
        <section className={styles.media}>
          {images.length === 0 ? (
            <div className={styles.mediaEmpty}>
              <span>No images yet</span>
            </div>
          ) : (
            <>
              <div className={styles.mainImageWrapper}>
                <button
                  type="button"
                  className={`${styles.imageArrow} ${styles.imageArrowLeft}`}
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[currentImageIndex]?.url}
                  alt={images[currentImageIndex]?.alt_text || product.name || "Bike image"}
                  className={styles.mainImage}
                />

                <button
                  type="button"
                  className={`${styles.imageArrow} ${styles.imageArrowRight}`}
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  ›
                </button>
              </div>

              <div className={styles.thumbs}>
                {images.map((img, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.alt_text || ""}
                    className={`${styles.thumb} ${idx === currentImageIndex ? styles.thumbActive : ""}`}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* RIGHT: info + controls */}
        <section className={styles.sidebar}>
          <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            <div className={styles.subtitle}>
              <span>Shop #{product.shop_id}</span>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.pricePill}>{priceLabel}</span>
            </div>
          </header>

          {/* Store selector */}
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>Pick-up location</h2>
            <div className={styles.chipRow}>
              {stores.map((store) => {
                const hasInv = storeHasInventoryForSelectedVariant(store.id);
                const isSelected = selectedStoreId === store.id && hasInv;

                return (
                  <button
                    key={store.id}
                    type="button"
                    disabled={!hasInv}
                    onClick={() => hasInv && setSelectedStoreId(store.id)}
                    className={[
                      styles.chip,
                      !hasInv ? styles.chipDisabled : "",
                      isSelected ? styles.chipSelected : "",
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
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>Size</h2>
            <div className={styles.chipRow}>
              {sizeOptions.map((size) => {
                const variantForSize = sizeMap.get(size);
                if (!variantForSize) return null;

                const enabled =
                  selectedStoreId !== null &&
                  getAvailableQuantity(variantForSize.id, selectedStoreId) > 0;

                const isSelected = enabled && selectedVariantId === variantForSize.id;

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && setSelectedVariantId(variantForSize.id)}
                    className={[
                      styles.chip,
                      !enabled ? styles.chipDisabled : "",
                      isSelected ? styles.chipSelected : "",
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

          {/* Dates (Airbnb-style pill + popover) */}
          <div className={styles.block} ref={calendarWrapRef}>
            <h2 className={styles.blockTitle}>Pick-up &amp; return</h2>

            <div
              className={[
                styles.datePill,
                !canPickDates ? styles.datePillDisabled : "",
              ].join(" ")}
            >
              <button
                type="button"
                className={[
                  styles.dateCell,
                  activeDateField === "from" && calendarOpen ? styles.dateCellActive : "",
                ].join(" ")}
                disabled={!canPickDates}
                onClick={() => {
                  if (!canPickDates) return;
                  setActiveDateField("from");
                  setCalendarOpen(true);
                }}
                aria-label="Select check-in date"
              >
                <span className={styles.dateLabel}>CHECK-IN</span>
                <span className={styles.dateValue}>{formatPillDate(range.from)}</span>
              </button>

              <div className={styles.dateDivider} />

              <button
                type="button"
                className={[
                  styles.dateCell,
                  activeDateField === "to" && calendarOpen ? styles.dateCellActive : "",
                ].join(" ")}
                disabled={!canPickDates}
                onClick={() => {
                  if (!canPickDates) return;
                  setActiveDateField("to");
                  setCalendarOpen(true);
                }}
                aria-label="Select checkout date"
              >
                <span className={styles.dateLabel}>CHECKOUT</span>
                <span className={styles.dateValue}>{formatPillDate(range.to)}</span>
              </button>
            </div>

            {calendarOpen && canPickDates && (
              <div className={styles.calendarPopover}>
                <AvailabilityRangeCalendar
                  variantId={selectedVariant!.id}
                  storeId={selectedStoreId!}
                  quantity={quantity}
                  value={range}
                  onChange={handleRangeChange}
                />
              </div>
            )}
          </div>


          {/* Quantity */}
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>
              Quantity{" "}
              {availableQuantity > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                  ({availableQuantity} available)
                </span>
              )}
            </h2>

            <div className={styles.quantity}>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(availableQuantity || 1, q + 1))}
                disabled={availableQuantity === 0 || quantity >= availableQuantity}
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <div className={styles.block}>
            <button
              type="button"
              className={styles.addToCart}
              onClick={handleAddToCart}
              disabled={!canAddToCart}
            >
              Add to cart
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
