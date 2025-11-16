import Link from "next/link";
import { fetchApi } from "@/utils/fetchAPI";

type Product = {
  id: number;
  name: string;
  // add more fields if your API returns them (description, price, etc.)
};

export default async function Page() {
  const res = await fetchApi("/v1/products");

  if (!res.ok) {
    return <div>Error: {res.status}</div>;
  }

  const items: Product[] = await res.json();

  return (
    <div>
      <h2>Produkte</h2>
      {items.length === 0 && <p>Keine Produkte gefunden.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((p) => (
          <li
            key={p.id}
            style={{
              marginBottom: 12,
              padding: 12,
              background: "white",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          >
            <Link href={`/products/${p.id}`} style={{ textDecoration: "none", color: "#111827" }}>
              <strong>{p.name}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
