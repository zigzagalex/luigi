// app/page.tsx
import SearchPill from "./components/search/SearchPill";
import ProductGrid from "./components/products/ProductGrid";
import CategoryRow from "./components/products/CategoryRow";
import {
  fetchProducts,
  groupProductsByMainCategory,
  type Product,
} from "@/utils/products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Product[] = [];

  try {
    products = await fetchProducts({
      shop_id: 1,
      limit: 32,
    });

  } catch (err) {
    console.error("Failed to fetch products for homepage:", err);
  }

  const featured = products.slice(0, 8);
  const rows = groupProductsByMainCategory(products);

  return (
    <main className="page">
      <div className="page-inner">
        <SearchPill />

        {featured.length > 0 && (
          <section className="section-block">
            <h2 className="section-title">Featured bikes</h2>
            <ProductGrid products={featured} />
          </section>
        )}

        {rows.map((row) => (
          <section key={row.key} className="section-block">
            <CategoryRow
              title={row.title}                     // e.g. "Mountain Bikes"
              products={row.products.slice(0, 10)}  // cap per row if you want
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
