// app/search/page.tsx
import ProductGrid from "../components/products/ProductGrid";
import { fetchApi } from "utils/fetchAPI";
import { fetchProducts, type Product } from "@/../utils/products";
import { getTranslations } from "next-intl/server";

import pageShell from "../PageShell.module.css";
import styles from "./page.module.css";

type RawSearchParams = {
  shop_id?: string;
  store_id?: string;
  category_id?: string;
  from?: string;
  to?: string;
  quantity?: string;
};

type SearchPageProps = {
  searchParams: Promise<RawSearchParams>;
  params: Promise<{ locale: string }>;
};

type AvailabilityVariant = {
  product_variant_id: number;
  available_quantity: number;
};

type AvailabilityRow = {
  product_id: number;
  shop_id: number;
  store_ids: number[];
  min_price_cents: number;
  currency: string;
  variants: AvailabilityVariant[];
};

type AvailabilitySearchBody = {
  shop_id: number;
  store_id: number;
  start_date: string;
  end_date: string;
  quantity: number;
  category_ids?: number[];
};

type PricePointDTO = {
  price_category: string;
  day_count: number;
  price_total_cents: number;
};

function normalizeCategoryKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildFromDailyPriceByCategory(
  pricePoints: PricePointDTO[],
): Record<string, number> {
  const oneDayPriceByCategory: Record<string, number> = {};
  const fallbackByCategory: Record<string, { dayCount: number; priceCents: number }> = {};

  for (const point of pricePoints) {
    if (point.day_count <= 0) continue;

    const key = normalizeCategoryKey(point.price_category);
    const priceCents = Math.round(point.price_total_cents);

    if (point.day_count === 1) {
      oneDayPriceByCategory[key] = priceCents;
      continue;
    }

    const existingFallback = fallbackByCategory[key];
    if (
      !existingFallback ||
      point.day_count < existingFallback.dayCount ||
      (point.day_count === existingFallback.dayCount && priceCents < existingFallback.priceCents)
    ) {
      fallbackByCategory[key] = { dayCount: point.day_count, priceCents };
    }
  }

  for (const [key, fallback] of Object.entries(fallbackByCategory)) {
    if (oneDayPriceByCategory[key] == null) {
      oneDayPriceByCategory[key] = fallback.priceCents;
    }
  }

  return oneDayPriceByCategory;
}

export default async function SearchPage({ searchParams, params }: SearchPageProps) {
  const { locale } = await params;
  const t = await getTranslations("searchPage");
  const sp: RawSearchParams = (await searchParams) ?? {};

  const shopId = Number(sp.shop_id ?? "1");
  const storeIdRaw = sp.store_id;
  const storeId = Number(storeIdRaw ?? "");
  const storeOk = Number.isFinite(storeId) && storeId > 0;

  const categoryId = sp.category_id ? Number(sp.category_id) : undefined;
  const from = sp.from;
  const to = sp.to;
  const quantity = Number(sp.quantity ?? "1");

  let products: Product[] = [];
  let availabilityInfo: Record<number, { minPriceCents: number; availableQuantity: number }> = {};
  let error: string | null = null;
  let info: string | null = null;

  let fromDailyPriceByCategory: Record<string, number> = {};
  try {
    const res = await fetchApi("/v1/price_points");
    if (res.ok) {
      const points = (await res.json()) as PricePointDTO[];
      fromDailyPriceByCategory = buildFromDailyPriceByCategory(points);
    }
  } catch (err) {
    console.error("Failed to fetch price points for search page:", err);
  }

  if (!storeIdRaw) {
    info = t("selectLocation");
  } else if (!storeOk) {
    info = t("invalidStore");
  } else if (!from || !to) {
    info = t("chooseDates");
  } else {
    try {
      const body: AvailabilitySearchBody = {
        shop_id: shopId,
        store_id: storeId,
        start_date: from,
        end_date: to,
        quantity,
        ...(categoryId ? { category_ids: [categoryId] } : {}),
      };

      const res = await fetchApi("/v1/availability/search", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("availability search HTTP error:", res.status, text);
        error = t("availabilityFailed");
      } else {
        const availability = (await res.json()) as AvailabilityRow[];

        if (availability.length) {
          for (const row of availability) {
            const totalAvailable = row.variants.reduce((sum, v) => sum + v.available_quantity, 0);

            const existing = availabilityInfo[row.product_id];
            if (!existing || row.min_price_cents < existing.minPriceCents) {
              availabilityInfo[row.product_id] = {
                minPriceCents: row.min_price_cents,
                availableQuantity: totalAvailable,
              };
            }
          }

          const productIds = Array.from(new Set(availability.map((a) => a.product_id)));

          products = await fetchProducts({
            shop_id: shopId,
            ids: productIds.join(","),
            locale,
          });
        }
      }
    } catch (err) {
      console.error("availability search failed:", err);
      error = t("searchError");
    }
  }

  const showGrid = !info && !error && products.length > 0;

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <section className={pageShell.section}>
          <header className={styles.resultsHeader}>
            <h1 className={styles.title}>{t("title")}</h1>
            {showGrid ? (
              <p className={styles.subtitle}>
                {t("resultCount", { count: products.length })}
              </p>
            ) : null}
          </header>

          {info ? (
            <p className={styles.message}>{info}</p>
          ) : error ? (
            <p className={styles.messageError}>{error}</p>
          ) : products.length === 0 ? (
            <p className={styles.message}>{t("empty")}</p>
          ) : (
            <ProductGrid
              products={products}
              availabilityInfo={availabilityInfo}
              fromDailyPriceByCategory={fromDailyPriceByCategory}
              linkSearchParams={{
                shop_id: String(shopId),
                store_id: storeIdRaw,
                category_id: sp.category_id,
                from,
                to,
                quantity: String(quantity),
                ref: "search",
              }}
            />
          )}
        </section>
      </div>
    </main>
  );
}
