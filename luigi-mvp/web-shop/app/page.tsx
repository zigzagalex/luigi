// app/page.tsx
import CategoryRow from "./components/products/CategoryRow";
import FeaturedProductsSlider from "./components/products/FeaturedProductsSlider";
import {
  fetchProducts,
  groupProductsByMainCategory,
  type Product,
} from "../utils/products";

export const dynamic = "force-dynamic";

const DEFAULT_SHOP_ID = 1;

export default async function HomePage() {
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
    <main className="page">
      <div className="page-inner">
        {/* No SearchPill here anymore – it lives in AppHeader */}

        {featured.length > 0 && (
          <section className="section-block">
            <FeaturedProductsSlider products={featured} />
          </section>
        )}

        {rows.map((row) => (
          <section key={row.key} className="section-block">
            <CategoryRow
              title={row.title}
              products={row.products.slice(0, 10)}
            />
          </section>
        ))}

        {products.length === 0 && (
          <p className="no-products-msg">
            No bikes to show yet. Check your API config or seed some products.
          </p>
        )}
      </div>
    </main>
  );
}
