// app/page.tsx
import SearchPill from "./components/search/SearchPill";
import ProductGrid from "./components/products/ProductGrid";
import CategoryRow from "./components/products/CategoryRow";
import { fetchProducts, type Product } from "@/utils/products";

export const dynamic = "force-dynamic";

function groupByPriceCategory(products: Product[]): Record<string, Product[]> {
  const groups: Record<string, Product[]> = {};
  for (const p of products) {
    const key = p.price_category || "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return groups;
}

function prettyLabel(category: string): string {
  if (!category) return "Other bikes";
  const lower = category.toLowerCase();
  if (lower === "budget") return "Budget-friendly bikes";
  if (lower === "standard") return "Everyday rides";
  if (lower === "premium") return "Premium & performance";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default async function HomePage() {
  let products: Product[] = [];

  try {
    products = await fetchProducts({ limit: 32 });
  } catch (err) {
    console.error("Failed to fetch products for homepage:", err);
  }

  const featured = products.slice(0, 8);
  const byCategory = groupByPriceCategory(products);

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

        {Object.entries(byCategory).map(([category, prods]) => (
          <section key={category} className="section-block">
            <CategoryRow
              title={prettyLabel(category)}
              products={prods.slice(0, 20)}
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
