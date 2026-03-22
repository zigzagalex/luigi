import RentalTrustBanner from "@/[locale]/components/home/RentalTrustBanner";
import CategoryRow from "@/[locale]/components/products/CategoryRow";
import FeaturedProductsSlider from "@/[locale]/components/products/FeaturedProductsSlider";
import {
  fetchProducts,
  groupProductsByMainCategory,
  type Product,
} from "@/../utils/products";
import { fetchApi } from "@/../utils/fetchAPI";
import { getTranslations } from "next-intl/server";
import styles from "./PageShell.module.css";

export const dynamic = "force-dynamic";

const DEFAULT_SHOP_ID = 1;

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
      (point.day_count === existingFallback.dayCount &&
        priceCents < existingFallback.priceCents)
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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  let products: Product[] = [];
  let fromDailyPriceByCategory: Record<string, number> = {};

  try {
    products = await fetchProducts({
      shop_id: DEFAULT_SHOP_ID,
      limit: 32,
      locale,
    });
  } catch (err) {
    console.error("Failed to fetch products for homepage:", err);
    products = [];
  }

  try {
    const res = await fetchApi("/v1/price_points");
    if (!res.ok) {
      throw new Error(`price points request failed with status ${res.status}`);
    }

    const points = (await res.json()) as PricePointDTO[];
    fromDailyPriceByCategory = buildFromDailyPriceByCategory(points);
  } catch (err) {
    console.error("Failed to fetch price points for homepage:", err);
    fromDailyPriceByCategory = {};
  }

  const featured = products.slice(0, 8);
  const rows = groupProductsByMainCategory(products);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {featured.length > 0 && (
          <section className={styles.section}>
            <FeaturedProductsSlider
              products={featured}
              fromDailyPriceByCategory={fromDailyPriceByCategory}
              linkSearchParams={{ ref: "browse" }}
            />
          </section>
        )}

        {rows.map((row) => (
          <section key={row.key} className={styles.section}>
            <CategoryRow
              title={row.title}
              products={row.products.slice(0, 10)}
              fromDailyPriceByCategory={fromDailyPriceByCategory}
              viewAllHref={
                row.key !== "other"
                  ? `/${locale}/categories/${row.key}`
                  : undefined
              }
              linkSearchParams={{ ref: "browse" }}
            />
          </section>
        ))}

        {rows.length > 0 && (
          <section className={styles.section}>
            <RentalTrustBanner />
          </section>
        )}

        {products.length === 0 && (
          <p className={styles.emptyMsg}>
            {t("empty")}
          </p>
        )}
      </div>
    </main>
  );
}
