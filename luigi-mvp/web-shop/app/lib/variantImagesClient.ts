export type VariantImage = {
    id: number;
    url: string;
    is_primary: boolean;
    sort_order: number;
    alt_text?: string | null;
  };
  
  export async function fetchVariantImages(variantId: number): Promise<VariantImage[]> {
    const res = await fetch(`/api/variants/${variantId}/images`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as VariantImage[];
  }
  