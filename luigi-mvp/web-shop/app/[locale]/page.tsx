import CategoryRow from "@/[locale]/components/products/CategoryRow";
import FeaturedProductsSlider from "@/[locale]/components/products/FeaturedProductsSlider";
import {
  fetchProducts,
  groupProductsByMainCategory,
  type Product,
} from "@/../utils/products";
import { getTranslations } from "next-intl/server";
import styles from "./PageShell.module.css";

export const dynamic = "force-dynamic";

const DEFAULT_SHOP_ID = 1;

export default async function HomePage() {
  const t = await getTranslations("home");
  let products: Product[] = [];

  try {
    products = await fetchProducts({
      shop_id: DEFAULT_SHOP_ID,
      limit: 32,
    });
  } catch (err) {
    console.error("Failed to fetch products for homepage:", err);
    products = [];
  }

  const featured = products.slice(0, 8);
  const rows = groupProductsByMainCategory(products);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        {featured.length > 0 && (
          <section className={styles.section}>
            <FeaturedProductsSlider products={featured} />
          </section>
        )}

        {rows.map((row) => (
          <section key={row.key} className={styles.section}>
            <CategoryRow title={row.title} products={row.products.slice(0, 10)} />
          </section>
        ))}

        {products.length === 0 && (
          <p className={styles.emptyMsg}>
            {t("empty")}
          </p>
        )}
      </div>
    </main>
  );
}
