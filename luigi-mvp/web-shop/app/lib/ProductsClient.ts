export type ProductDTO = {
    id: number;
    name: string;
  };
  
  export async function fetchProduct(productId: number): Promise<ProductDTO> {
    const res = await fetch(`/api/products/${productId}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as ProductDTO;
  }
  