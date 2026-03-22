"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/../utils/products";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import styles from "./ProductDetail.module.css";
import {
  AvailabilityRangeCalendar,
  type RangeValue,
} from "@/[locale]/components/daterangepicker/AvailabilityRangeCalendar";
import { useCart } from "@/[locale]/components/cart/CartContext"; 
import StoreConflictModal from "@/[locale]/components/cart/StoreConflictModal";


/** ---------- Types ---------- */
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

/** ---------- Helpers ---------- */

/** Extracts size from variant attributes (supports your RawMessage nesting) */
function getVariantSize(v?: VariantWithImages | null): string | undefined {
  if (!v || !v.attributes) return undefined;
  const attrs = v.attributes as any;
  const raw = attrs.size ?? attrs.RawMessage?.size;
  return typeof raw === "string" ? raw : undefined;
}

/** YYYY-MM-DD for API */
function formatDateForApiLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** From date to RFC local midnight */
function toRFC3339LocalMidnight(d: Date): string {
  // Create local midnight for that calendar day
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return dt.toISOString(); // RFC3339 in UTC; backend parses RFC3339 fine
}


/**
 * Parse "YYYY-MM-DD" coming from query params.
 * We use UTC so we don't get a timezone shift that changes the day.
 */
function parseYYYYMMDDLocal(s: string | null): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;

  // Local midnight (no UTC conversion)
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}


function formatSummaryDate(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProductDetail({ product, variants, stores, inventory }: Props) {
  const t = useTranslations("productDetail");
  const locale = useLocale();
  /** ---------- Read incoming query params from URL ---------- */
  const sp = useSearchParams();

  // Read initial values from search params (if present)
  const initialFrom = useMemo(() => parseYYYYMMDDLocal(sp.get("from")), [sp]);
  const initialTo = useMemo(() => parseYYYYMMDDLocal(sp.get("to")), [sp]);

  const initialStoreId = useMemo(() => {
    const id = Number(sp.get("store_id") ?? "");
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [sp]);

  const initialQuantity = useMemo(() => {
    const q = Number(sp.get("quantity") ?? "1");
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [sp]);

  /** ---------- Component state ---------- */

  // Variant defaults to first variant, your logic later may change it to one with stock
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(variants[0]?.id ?? null);

  // If URL had a store_id, preselect it (we validate it later against inventory)
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(initialStoreId);

  // If URL had dates, prefill range
  const [range, setRange] = useState<RangeValue>({ from: initialFrom, to: initialTo });

  // If URL had quantity, prefill quantity
  const [quantity, setQuantity] = useState<number>(initialQuantity);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [showStoreConflict, setShowStoreConflict] = useState(false);

  const [datesExpanded, setDatesExpanded] = useState(false);

  /** Quote state */
  const [quote, setQuote] = useState<{ currency: string; totalPriceCents: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  /** ---------- Derived values ---------- */

  // Selected variant object
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
    [variants, selectedVariantId]
  );

  // Images for carousel
  const images = selectedVariant?.images ?? [];

  // Map size -> variant
  const sizeMap = useMemo(() => {
    const map = new Map<string, VariantWithImages>();
    variants.forEach((v) => {
      const size = getVariantSize(v);
      if (size) map.set(size, v);
    });
    return map;
  }, [variants]);

  // Only show sizes that exist
  const sizeOptions = useMemo(() => allSizeOptions.filter((s) => sizeMap.has(s)), [sizeMap]);

  // Inventory count map: "variantId:storeId" -> count
  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventory.forEach((item) => {
      // Skip inactive items
      if (item.is_active === false) return;
      // Skip items not in active status (if status exists)
      if (item.status && item.status !== "active") return;

      const key = `${item.product_variant_id}:${item.store_id}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [inventory]);

  // Helper to get available quantity for a given (variant, store)
  const getAvailableQuantity = useCallback(
    (variantId: number | null | undefined, storeId: number | null | undefined): number => {
      if (!variantId || !storeId) return 0;
      return inventoryMap.get(`${variantId}:${storeId}`) ?? 0;
    },
    [inventoryMap]
  );

  // Quantity available for current selection
  const availableQuantity = useMemo(
    () => getAvailableQuantity(selectedVariant?.id ?? null, selectedStoreId),
    [selectedVariant?.id, selectedStoreId, getAvailableQuantity]
  );

  // Used to disable store chips without stock (for the currently selected variant)
  const storeHasInventoryForSelectedVariant = useCallback(
    (storeId: number): boolean => getAvailableQuantity(selectedVariant?.id ?? null, storeId) > 0,
    [getAvailableQuantity, selectedVariant?.id]
  );

  /** ---------- Initialization: choose sensible store+variant without overwriting URL intent ---------- */
  useEffect(() => {
    if (!variants.length || !stores.length || !inventory.length) {
      setSelectedVariantId(variants[0]?.id ?? null);
      setSelectedStoreId(null);
      return;
    }

    // Try to respect the store from URL if it exists and has stock for ANY size.
    const preferredStoreId = initialStoreId;

    let newVariantId: number | null = null;
    let newStoreId: number | null = null;

    // A) If URL store exists, try to find a variant that has stock in that store
    if (preferredStoreId) {
      for (const size of sizeOptions) {
        const v = sizeMap.get(size);
        if (!v) continue;

        if (getAvailableQuantity(v.id, preferredStoreId) > 0) {
          newVariantId = v.id;
          newStoreId = preferredStoreId;
          break;
        }
      }
    }

    // B) Fallback: find first store with stock for any size
    if (newVariantId === null) {
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
    }

    // Apply results (only once when data is ready)
    setSelectedVariantId(newVariantId ?? variants[0]?.id ?? null);

    // Only override selectedStoreId if:
    // - we found a valid one, OR
    // - the current one is null
    setSelectedStoreId((prev) => (prev == null ? newStoreId : prev));

    setCurrentImageIndex(0);
    // NOTE: we intentionally depend on initialStoreId here, but do NOT include selectedStoreId,
    // so we don't "fight" the user's clicks.
  }, [variants, stores, inventory, sizeOptions, sizeMap, getAvailableQuantity, initialStoreId]);

  /** ---------- Clamp quantity to stock ---------- */
  useEffect(() => {
    if (availableQuantity <= 0) {
      setQuantity(1);
    } else {
      setQuantity((q) => Math.min(Math.max(1, q), availableQuantity));
    }
  }, [availableQuantity]);

  /** ---------- Image navigation ---------- */
  const handlePrevImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((idx) => (idx === 0 ? images.length - 1 : idx - 1));
  };

  const handleNextImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((idx) => (idx === images.length - 1 ? 0 : idx + 1));
  };

  /** ---------- Add to cart ---------- */
  const { cart, addItems, removeItem, openAddPopover } = useCart();
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const canAddToCart =
    !!selectedVariant &&
    !!selectedStoreId &&
    availableQuantity > 0 &&
    !!range.from &&
    !!range.to &&
    quantity >= 1 &&
    quantity <= availableQuantity;

  /** ---------- UI labels ---------- */
  const title = product.name || t("bikeFallback", { id: String(product.id) });
  const priceLabel = product.price_category || t("standard");
  const description = product.description?.trim() ?? "";

  const addCurrentSelection = useCallback(async () => {
    if (!canAddToCart || !selectedVariant || !selectedStoreId || !range.from || !range.to) return;

    await addItems({
      shop_id: product.shop_id,
      store_id: selectedStoreId,
      product_id: product.id,
      variant_id: selectedVariant.id,
      start_date: formatDateForApiLocal(range.from),
      end_date: formatDateForApiLocal(range.to),
      quantity,
    });

    openAddPopover({
      title,
      imageUrl: images[0]?.url,
      storeName: stores.find((s) => s.id === selectedStoreId)?.name,
      from: formatDateForApiLocal(range.from),
      to: formatDateForApiLocal(range.to),
      quantity,
      priceLabel: quote
        ? `${quote.currency} ${(quote.totalPriceCents / 100).toFixed(2)}`
        : undefined,
    });
  }, [
    canAddToCart,
    selectedVariant,
    selectedStoreId,
    range.from,
    range.to,
    addItems,
    product.shop_id,
    product.id,
    quantity,
    openAddPopover,
    title,
    images,
    stores,
    quote,
  ]);

  const handleAddToCart = useCallback(async () => {
    setAddError(null);
    setAdding(true);
    try {
      await addCurrentSelection();
    } catch (e: any) {
      if (e?.code === "different_store") {
        setShowStoreConflict(true);
        return;
      }
      setAddError(e?.message ?? t("failedToAddToCart"));
    } finally {
      setAdding(false);
    }
  }, [addCurrentSelection, t]);
    

  // We only want to let users pick dates if store + variant are selected
  const canPickDates = selectedVariant?.id != null && selectedStoreId != null;

  useEffect(() => {
    if (!canPickDates) setDatesExpanded(false);
  }, [canPickDates]);

  /** Quote */
  const isValidRange =
  !!range.from &&
  !!range.to &&
  range.to.getTime() >= range.from.getTime();

  const canQuote =
    !!selectedVariant?.id &&
    !!selectedStoreId &&
    isValidRange &&
    quantity > 0;

  useEffect(() => {
    if (!canQuote) {
      // Selection incomplete → clear quote UI
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        setQuoteLoading(true);
        setQuoteError(null);

        const payload = {
          product_variant_id: selectedVariant!.id,
          store_id: selectedStoreId!,
          start_date: formatDateForApiLocal(range.from!),
          end_date: formatDateForApiLocal(range.to!), // inclusive
          quantity,
        };

        // Call Next.js route proxy (server will call your API via fetchApi)
        const res = await fetch("/api/availability/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Quote failed (${res.status}): ${text}`);
        }

        const data = await res.json();

        // Adapt fields to match your actual API response
        setQuote({
          currency: data.currency ?? "CHF",
          totalPriceCents: data.price_total_cents,
        });
      } catch (e: any) {
        if (e?.name === "AbortError") return; // ignore rapid changes
        setQuote(null);
        setQuoteError(e?.message ?? t("failedToFetchPrice"));
      } finally {
        setQuoteLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [canQuote, selectedVariant?.id, selectedStoreId, range.from, range.to, quantity]);


  /** ---------- Render ---------- */
  return (
    <div className={styles.inner}>
      <div className={styles.layout}>
        {/* LEFT: media */}
        <section className={styles.media}>
          {images.length === 0 ? (
            <div className={styles.mediaEmpty}>
              <span>{t("noImagesYet")}</span>
            </div>
          ) : (
            <>
              <div className={styles.mainImageWrapper}>
                <button
                  type="button"
                  className={`${styles.imageArrow} ${styles.imageArrowLeft}`}
                  onClick={handlePrevImage}
                  aria-label={t("previousImage")}
                >
                  ‹
                </button>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[currentImageIndex]?.url}
                  alt={images[currentImageIndex]?.alt_text || product.name || t("bikeImage")}
                  className={styles.mainImage}
                />

                <button
                  type="button"
                  className={`${styles.imageArrow} ${styles.imageArrowRight}`}
                  onClick={handleNextImage}
                  aria-label={t("nextImage")}
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

        {/* RIGHT: compact commerce strip */}
        <section className={`${styles.sidebar} ${styles.sidebarCommerce}`}>
          <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            {description.length > 0 && (
              <p className={styles.headerDescription}>{description}</p>
            )}
          </header>

          {/* Store selector */}
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>{t("pickupLocation")}</h2>
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
            <h2 className={styles.blockTitle}>{t("size")}</h2>
            <div className={styles.chipRow}>
              {sizeOptions.map((size) => {
                const variantForSize = sizeMap.get(size);
                if (!variantForSize) return null;

                // Enable size only if selectedStore has stock for that size
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

          {/* Dates — compact summary; calendar on demand */}
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>{t("pickupReturn")}</h2>

            <button
              type="button"
              className={styles.dateSummaryTrigger}
              disabled={!canPickDates}
              aria-expanded={datesExpanded}
              aria-label={datesExpanded ? t("datePickerToggleCollapse") : t("datePickerToggleExpand")}
              onClick={() => canPickDates && setDatesExpanded((open) => !open)}
            >
              <span className={styles.dateSummaryInline}>
                <span className={styles.dateSummaryInlinePart}>
                  <span className={styles.dateSummaryInlineLabel}>{t("dateSummaryInlinePickup")}</span>
                  <span className={styles.dateSummaryInlineDash} aria-hidden>
                    —
                  </span>
                  <span className={styles.dateSummaryInlineValue}>
                    {range.from ? formatSummaryDate(range.from, locale) : t("addDate")}
                  </span>
                </span>
                <span className={styles.dateSummaryInlineSep} aria-hidden>
                  ·
                </span>
                <span className={styles.dateSummaryInlinePart}>
                  <span className={styles.dateSummaryInlineLabel}>{t("dateSummaryInlineReturn")}</span>
                  <span className={styles.dateSummaryInlineDash} aria-hidden>
                    —
                  </span>
                  <span className={styles.dateSummaryInlineValue}>
                    {range.to ? formatSummaryDate(range.to, locale) : t("addDate")}
                  </span>
                </span>
              </span>
              <span className={styles.dateSummaryTriggerChevron} aria-hidden>
                {datesExpanded ? "▴" : "▾"}
              </span>
            </button>

            {!canPickDates && <p className={styles.dateHintMuted}>{t("selectStoreForDates")}</p>}

            {datesExpanded && canPickDates && (
              <div className={styles.calendarPanel}>
                <AvailabilityRangeCalendar
                  variantId={selectedVariant?.id ?? 0}
                  storeId={selectedStoreId ?? 0}
                  quantity={quantity}
                  value={range}
                  onChange={setRange}
                />
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>
              {t("quantity")}{" "}
              {availableQuantity > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                  ({t("available", { count: String(availableQuantity) })})
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

          {/* Price */}
          <div className={styles.priceBlock}>
            {quoteLoading ? (
              <div className={styles.priceLoading}>{t("calculating")}</div>
            ) : quote && Number.isFinite(quote.totalPriceCents) ? (
              <div className={styles.priceBig}>
                {quote.currency} {(quote.totalPriceCents / 100).toFixed(2)}
              </div>
            ) : (
              <div className={styles.pricePlaceholder}>{t("selectDatesForPrice")}</div>
            )}

            <div className={styles.priceHint}>{t("priceHint")}</div>
            {quoteError && <div className={styles.priceError}>{quoteError}</div>}
          </div>


          {/* Add to cart */}
          <div className={styles.block}>
          <button
              type="button"
              className={styles.addToCart}
              onClick={handleAddToCart}
              disabled={!canAddToCart || adding}
            >
              {adding ? t("adding") : t("addToCart")}
            </button>
          </div>
        </section>
      </div>
      {/* Store conflict modal */}
      <StoreConflictModal
        open={showStoreConflict}
        onClose={() => setShowStoreConflict(false)}
        onClearCart={async () => {
          setAddError(null);
          setAdding(true);
          try {
            const itemIds = (cart?.items ?? []).map((item) => item.id);
            for (const itemId of itemIds) {
              await removeItem(itemId);
            }

            await addCurrentSelection();
            setShowStoreConflict(false);
          } catch (e: any) {
            setAddError(e?.message ?? t("failedToAddToCart"));
          } finally {
            setAdding(false);
          }
        }}
      />
    </div>
  );
}
