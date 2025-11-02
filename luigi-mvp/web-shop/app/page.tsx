import { fetchApi } from "../utils/fetchAPI";

export default async function Page() {
  const res = await fetchApi("/v1/products");
  if (!res.ok) return <main style={{padding:24}}>Fehler: {res.status}</main>;
  const items = await res.json();
  return (
    <main style={{padding:24}}>
      <h1>Produkte</h1>
      <ul>{items.map((p:any)=><li key={p.id}>{p.name}</li>)}</ul>
    </main>
  );
}

