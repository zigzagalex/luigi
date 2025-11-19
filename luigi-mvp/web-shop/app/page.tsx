import SearchPill from "./components/search/SearchPill";
import ProductGrid from "./components/products/ProductGrid";
import CategoryRow from "./components/products/CategoryRow";
import { fetchProducts, type Product } from "../utils/products";

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
  // adjust limit as you like
  const products = await fetchProducts({ limit: 32 });

  const featured = products.slice(0, 8);
  const byCategory = groupByPriceCategory(products);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {/* Hero Search */}
        <SearchPill />

        {/* Intro text */}
        <section className="mb-8">
          <h1 className="text-xl font-semibold text-neutral-900">
            Find your next adventure
          </h1>
          <p className="text-sm text-neutral-600">
            Browse high-quality bikes from local shops. Click any bike to see more details.
          </p>
        </section>

        {/* Featured grid */}
        <section className="mb-10">
          <h2 className="mb-3 text-base font-semibold text-neutral-900">
            Featured bikes
          </h2>
          <ProductGrid products={featured} />
        </section>

        {/* Category rows (Netflix-style) */}
        {Object.entries(byCategory).map(([category, prods]) => (
          <CategoryRow
            key={category}
            title={prettyLabel(category)}
            products={prods.slice(0, 12)}
          />
        ))}
      </div>
    </main>
  );
}
