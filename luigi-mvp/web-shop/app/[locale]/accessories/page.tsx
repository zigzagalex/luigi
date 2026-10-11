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
import { SHOP_ID } from "@/lib/shopId";

import catStyles from "../categories/[slug]/page.module.css";
import pageShell from "../PageShell.module.css";

export const dynamic = "force-dynamic";

const ACCESSORIES_ROOT_SLUG = "accessories";

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

export default async function AccessoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tCat = await getTranslations({ locale, namespace: "categoryPage" });
  const tAcc = await getTranslations({ locale, namespace: "accessoryPage" });

  let tree;
  try {
    tree = await fetchCategoryTree(SHOP_ID);
  } catch (err) {
    console.error("Failed to load category tree:", err);
    notFound();
  }

  const node = findCategoryBySlug(tree, ACCESSORIES_ROOT_SLUG);
  if (!node || node.is_active === false) {
    notFound();
  }

  const byId = indexCategoriesById(tree);
  const breadcrumbs = categoryBreadcrumbs(byId, node);
  const subcategories = sortedActiveChildren(node);
  const pageTitle = node.name;
  const description =
    typeof node.description === "string" && node.description.trim()
      ? node.description.trim()
      : null;

  let products: Product[] = [];
  try {
    products = await fetchProducts({
      shop_id: SHOP_ID,
      category_id: node.id,
      limit: 200,
      locale,
      is_accessory: true,
    });
  } catch (err) {
    console.error("Failed to fetch accessory catalog:", err);
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
    console.error("Failed to fetch price points for accessories page:", err);
  }

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <section className={pageShell.section}>
          <nav aria-label={tCat("breadcrumbAria")}>
            <ol className={catStyles.breadcrumbs}>
              <li>
                <Link href={`/${locale}`}>{tCat("breadcrumbHome")}</Link>
              </li>
              {breadcrumbs.map((c, i) => (
                <li key={`${c.slug}-${i}`}>
                  <span className={catStyles.crumbSep} aria-hidden="true">
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

          <h1 className={catStyles.title}>{pageTitle}</h1>
          {description ? (
            <p className={catStyles.description}>{description}</p>
          ) : (
            <p className={catStyles.description}>{tAcc("subtitle")}</p>
          )}

          {subcategories.length > 0 ? (
            <nav
              className={catStyles.subcategories}
              aria-label={tCat("subcategoriesNavAria")}
            >
              {subcategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/${locale}/categories/${c.slug}`}
                  className={catStyles.subcategoryLink}
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
                category: ACCESSORIES_ROOT_SLUG,
              }}
              fromDailyPriceByCategory={fromDailyPriceByCategory}
            />
          ) : (
            <p className={catStyles.empty}>{tAcc("empty")}</p>
          )}
        </section>
      </div>
    </main>
  );
}
