export default async function Page() {
  const api = process.env.NEXT_PUBLIC_API_BASE!;
  const res = await fetch(`${api}/v1/products`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Products fetch failed: ${res.status} ${res.statusText}`);
  }

  const items = (await res.json()) as { id: string; name: string }[];

  return (
    <main style={{ padding: 24 }}>
      <h1>Produkte</h1>
      <ul>{items.map(p => <li key={p.id}>{p.name}</li>)}</ul>
    </main>
  );
}
