// web-shop/utils/fetchApi.ts
export async function fetchApi(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE!;
  const headers: Record<string, string> = {};
  const audience = base;

  // Cloud Run 
  const runningInCloudRun = !!process.env.K_SERVICE;

  if (runningInCloudRun) {
    // ID-Token vom Metadata-Server 
    const meta =
      "http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=" +
      encodeURIComponent(audience);
    const r = await fetch(meta, { headers: { "Metadata-Flavor": "Google" } });
    if (r.ok) headers.Authorization = `Bearer ${await r.text()}`;
  } else if (process.env.API_IDTOKEN) {
    // Lokaler Dev: ID-Token aus ENV verwenden
    headers.Authorization = `Bearer ${process.env.API_IDTOKEN}`;
  }

  return fetch(base + path, { headers, cache: "no-store" });
}
