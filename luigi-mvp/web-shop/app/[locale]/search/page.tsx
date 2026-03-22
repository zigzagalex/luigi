// app/search/page.tsx
import styles from "./page.module.css";
import ProductGrid from "../components/products/ProductGrid";
import { fetchApi } from "utils/fetchAPI";
import { fetchProducts, type Product } from "@/../utils/products";
import { getTranslations } from "next-intl/server";

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

export default async function SearchPage({ searchParams }: SearchPageProps) {
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

  // Basic input checks (but keep one consistent layout)
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
        error = t("apiError", { status: String(res.status), text });
      } else {
        const availability = (await res.json()) as AvailabilityRow[];

        if (availability.length) {
          // Build availabilityInfo per product
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
          });
        }
      }
    } catch (err) {
      console.error("availability search failed:", err);
      error = t("searchError");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <h1>{t("title")}</h1>

        {info ? (
          <p>{info}</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : products.length === 0 ? (
          <p>{t("empty")}</p>
        ) : (
          <ProductGrid
            products={products}
            availabilityInfo={availabilityInfo}
            className="product-grid-search"
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
      </div>
    </main>
  );
}
