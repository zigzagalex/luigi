export type CartItem = {
    id: number;
    cart_id: number;
    product_id: { Int64: number; Valid: boolean } | null;
    variant_id: { Int64: number; Valid: boolean } | null;
    inventory_item_id: number;
    start_at: string; // RFC3339 from API
    end_at: string;
    unit_price_cents: number;
    currency: string;
  };
  
  export type CartView = {
    cart: { id: number; shop_id: number; store_id: number; status: string };
    items: CartItem[];
    subtotal_cents: number;
    currency: string;
  };
  
  export async function fetchCart(shopId: number): Promise<CartView> {
    const res = await fetch(`/api/cart?shop_id=${shopId}`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  
  export async function addCartItems(payload: any): Promise<CartView> {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  
  export async function patchCartItem(cartItemId: number, payload: any): Promise<CartView> {
    const res = await fetch(`/api/cart/items/${cartItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  
  export async function deleteCartItem(cartItemId: number): Promise<CartView> {
    const res = await fetch(`/api/cart/items/${cartItemId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  