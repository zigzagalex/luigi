// app/search/page.tsx
import { fetchApi } from "utils/fetchAPI";

type RawSearchParams = {
  shop_id?: string;
  category_id?: string;
  from?: string;
  to?: string;
  quantity?: string;
};

type SearchPageProps = {
  searchParams?: Promise<RawSearchParams>;
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
  // 🔑 THIS is the important part: await the promise
  const sp: RawSearchParams = (await searchParams) ?? {};

  const shopId = Number(sp.shop_id ?? "1");
  const categoryId = sp.category_id ? Number(sp.category_id) : undefined;
  const from = sp.from; // "YYYY-MM-DD"
  const to = sp.to;     // "YYYY-MM-DD"
  const quantity = Number(sp.quantity ?? "1");

  let availability: AvailabilityRow[] = [];
  let error: string | null = null;

  if (from && to) {
    try {
      const body: any = {
        shop_id: shopId,
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

        {/* Debug: show incoming search params */}
        <pre style={{ fontSize: 12, margin: "8px 0 16px" }}>
          {JSON.stringify(sp, null, 2)}
        </pre>

        {!from || !to ? (
          <p>Please choose dates in the search bar first.</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : availability.length === 0 ? (
          <p>No available bikes for that search.</p>
        ) : (
          <div className="product-grid">
            {availability.map((row) => (
              <div
                key={`${row.product_id}-${row.store_ids.join("-")}`}
                className="product-card"
              >
                <div className="product-card-body">
                  <h3>Product #{row.product_id}</h3>
                  <p>
                    From CHF {(row.min_price_cents / 100).toFixed(2)} ·{" "}
                    {row.variants.reduce(
                      (sum, v) => sum + v.available_quantity,
                      0
                    )}{" "}
                    bikes available
                  </p>
                  <p className="product-card-meta">
                    Stores: {row.store_ids.join(", ")}
                  </p>
                </div>

                <a
                  href={`/products/${row.product_id}`}
                  className="product-card-link"
                >
                  View details
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
