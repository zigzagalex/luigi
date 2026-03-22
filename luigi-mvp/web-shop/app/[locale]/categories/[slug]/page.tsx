import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import ProductGrid from "@/[locale]/components/products/ProductGrid";
import {
  categoryBreadcrumbs,
  fetchCategoryTree,
  findCategoryBySlug,
  indexCategoriesById,
  sortedActiveChildren,
} from "@/../utils/categories";
import { fetchApi } from "@/../utils/fetchAPI";
import { fetchProducts, type Product } from "@/../utils/products";

import styles from "./page.module.css";
import pageShell from "../../PageShell.module.css";

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
  const fallbackByCategory: Record<
    string,
    { dayCount: number; priceCents: number }
  > = {};

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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("categoryPage");

  let tree;
  try {
    tree = await fetchCategoryTree(DEFAULT_SHOP_ID);
  } catch (err) {
    console.error("Failed to load category tree:", err);
    notFound();
  }

  const node = findCategoryBySlug(tree, slug);
  if (!node || node.is_active === false) {
    notFound();
  }

  const byId = indexCategoriesById(tree);
  const breadcrumbs = categoryBreadcrumbs(byId, node);
  const subcategories = sortedActiveChildren(node);

  let products: Product[] = [];
  try {
    products = await fetchProducts({
      shop_id: DEFAULT_SHOP_ID,
      category_id: node.id,
      limit: 200,
      locale,
    });
  } catch (err) {
    console.error("Failed to fetch category products:", err);
    products = [];
  }

  let fromDailyPriceByCategory: Record<string, number> = {};
  try {
    const res = await fetchApi("/v1/price_points");
    if (res.ok) {
      const points = (await res.json()) as PricePointDTO[];
      fromDailyPriceByCategory = buildFromDailyPriceByCategory(points);
    }
  } catch (err) {
    console.error("Failed to fetch price points for category page:", err);
  }

  const description =
    typeof node.description === "string" && node.description.trim()
      ? node.description.trim()
      : null;

  return (
    <main className={pageShell.page}>
      <div className={styles.inner}>
        <nav aria-label={t("breadcrumbAria")}>
          <ol className={styles.breadcrumbs}>
            <li>
              <Link href={`/${locale}`}>{t("breadcrumbHome")}</Link>
            </li>
            {breadcrumbs.map((c, i) => (
              <li key={c.slug}>
                <span className={styles.crumbSep} aria-hidden="true">
                  /
                </span>{" "}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={`/${locale}/categories/${c.slug}`}>
                    {c.name}
                  </Link>
                ) : (
                  <span aria-current="page">{c.name}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className={styles.title}>{node.name}</h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}

        {subcategories.length > 0 ? (
          <section aria-labelledby="subcategories-heading">
            <h2 id="subcategories-heading" className={styles.subsectionTitle}>
              {t("subcategoriesHeading")}
            </h2>
            <div className={styles.subcategories}>
              {subcategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/${locale}/categories/${c.slug}`}
                  className={styles.subcategoryLink}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {products.length > 0 ? (
          <ProductGrid
            products={products}
            linkSearchParams={{ ref: "category", category: slug }}
            fromDailyPriceByCategory={fromDailyPriceByCategory}
          />
        ) : (
          <p className={styles.empty}>{t("empty")}</p>
        )}
      </div>
    </main>
  );
}
