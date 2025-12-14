// app/search/page.tsx
import ProductGrid from "../components/products/ProductGrid";
import { fetchApi } from "utils/fetchAPI";
import { fetchProducts, type Product } from "@/../utils/products";

type RawSearchParams = {
  shop_id?: string;
  store_id?: string;     // <-- NEW
  category_id?: string;
  from?: string;
  to?: string;
  quantity?: string;
};

type SearchPageProps = {
  // Next 16 passes searchParams as a Promise
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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp: RawSearchParams = (await searchParams) ?? {};

  const shopId = Number(sp.shop_id ?? "1");

  const storeIdStr = sp.store_id;
  const categoryId = sp.category_id ? Number(sp.category_id) : undefined;
  const from = sp.from;
  const to = sp.to;
  const quantity = Number(sp.quantity ?? "1");

  let availability: AvailabilityRow[] = [];
  let products: Product[] = [];
  let availabilityInfo: Record<
    number,
    { minPriceCents: number; availableQuantity: number }
  > = {};
  let error: string | null = null;

  // Require store_id
  if (!storeIdStr) {
    return (
      <main className="page">
        <div className="page-inner">
          <h1>Available bikes</h1>
          <p>Please select a pickup location in the header first.</p>
        </div>
      </main>
    );
  }

  const storeId = Number(storeIdStr);
  if (!Number.isFinite(storeId) || storeId <= 0) {
    return (
      <main className="page">
        <div className="page-inner">
          <h1>Available bikes</h1>
          <p>Invalid store selected.</p>
        </div>
      </main>
    );
  }

  if (from && to) {
    try {
      const body: any = {
        shop_id: shopId,
        store_id: storeId,     // <-- ALWAYS pass store to availability search
        start_date: from,
        end_date: to,
        quantity,
      };
      if (categoryId) {
        body.category_ids = [categoryId];
      }

      const res = await fetchApi("/v1/availability/search", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        error = `API error ${res.status}: ${text}`;
      } else {
        availability = (await res.json()) as AvailabilityRow[];

        if (availability.length) {
          // Build availabilityInfo per product
          for (const row of availability) {
            const totalAvailable = row.variants.reduce(
              (sum, v) => sum + v.available_quantity,
              0
            );
            const existing = availabilityInfo[row.product_id];

            if (!existing || row.min_price_cents < existing.minPriceCents) {
              availabilityInfo[row.product_id] = {
                minPriceCents: row.min_price_cents,
                availableQuantity: totalAvailable,
              };
            }
          }

          const productIds = Array.from(
            new Set(availability.map((a) => a.product_id))
          );

          products = await fetchProducts({
            shop_id: shopId,
            ids: productIds.join(","),
          });
        }
      }
    } catch (err) {
      console.error("availability search failed:", err);
      error = "Something went wrong while searching availability.";
    }
  }

  return (
    <main className="page">
      <div className="page-inner">
        <h1>Available bikes</h1>

        {!from || !to ? (
          <p>Please choose dates in the search bar first.</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : products.length === 0 ? (
          <p>No available bikes for that search.</p>
        ) : (
          <ProductGrid
            products={products}
            availabilityInfo={availabilityInfo}
            className="product-grid-search"
          />
        )}
      </div>
    </main>
  );
}
