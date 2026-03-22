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
  sortedActiveRootCategories,
  type CategoryTreeNode,
} from "@/../utils/categories";
import { TOP_BIKES_CATEGORY_SLUG } from "@/../utils/categorySlugs";
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
  const isVirtualAllBikes =
    !node && slug === TOP_BIKES_CATEGORY_SLUG;

  if ((!node || node.is_active === false) && !isVirtualAllBikes) {
    notFound();
  }

  let breadcrumbs: { slug: string; name: string }[] = [];
  let subcategories: CategoryTreeNode[] = [];
  let pageTitle: string;
  let description: string | null = null;
  let products: Product[] = [];
  let gridCategorySlug = slug;

  if (node && node.is_active !== false) {
    const byId = indexCategoriesById(tree);
    breadcrumbs = categoryBreadcrumbs(byId, node);
    subcategories = sortedActiveChildren(node);
    pageTitle = node.name;
    description =
      typeof node.description === "string" && node.description.trim()
        ? node.description.trim()
        : null;
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
  } else {
    pageTitle = t("allBikesTitle");
    breadcrumbs = [{ slug: TOP_BIKES_CATEGORY_SLUG, name: pageTitle }];
    subcategories = sortedActiveRootCategories(tree);
    gridCategorySlug = TOP_BIKES_CATEGORY_SLUG;
    try {
      products = await fetchProducts({
        shop_id: DEFAULT_SHOP_ID,
        limit: 200,
        locale,
      });
    } catch (err) {
      console.error("Failed to fetch all bikes for top category:", err);
      products = [];
    }
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

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <section className={pageShell.section}>
        <nav aria-label={t("breadcrumbAria")}>
          <ol className={styles.breadcrumbs}>
            <li>
              <Link href={`/${locale}`}>{t("breadcrumbHome")}</Link>
            </li>
            {breadcrumbs.map((c, i) => (
              <li key={`${c.slug}-${i}`}>
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

        <h1 className={styles.title}>{pageTitle}</h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}

        {subcategories.length > 0 ? (
          <nav className={styles.subcategories} aria-label={t("subcategoriesNavAria")}>
            {subcategories.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/categories/${c.slug}`}
                className={styles.subcategoryLink}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {products.length > 0 ? (
          <ProductGrid
            products={products}
            linkSearchParams={{
              ref: "category",
              category: gridCategorySlug,
            }}
            fromDailyPriceByCategory={fromDailyPriceByCategory}
          />
        ) : (
          <p className={styles.empty}>{t("empty")}</p>
        )}
        </section>
      </div>
    </main>
  );
}
