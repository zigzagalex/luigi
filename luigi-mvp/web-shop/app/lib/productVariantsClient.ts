export type ProductVariantDTO = {
    id: number;
    label: string;
    attributes: Record<string, any> | null;
  };
  
  export async function fetchProductVariant(variantId: number): Promise<ProductVariantDTO> {
    const res = await fetch(`/api/variants/${variantId}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as ProductVariantDTO;
  }
  