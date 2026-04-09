import { fetchCategoryTree, findCategoryBySlug } from "./categories";
import { fetchProducts, type Product } from "./products";

/** Category groups used for bike add-to-cart upsell (helmet → navigation → shoes). */
export const CART_UPSELL_ACCESSORY_SLUGS = [
  "acc-helmets",
  "acc-navigation",
  "acc-shoes",
] as const;

export type CartUpsellAccessorySlug = (typeof CART_UPSELL_ACCESSORY_SLUGS)[number];

export type CartUpsellAccessoryItem = {
  categorySlug: CartUpsellAccessorySlug;
  product: Product | null;
};

export async function fetchCartAccessoryUpsell(
  shopId: number,
  locale: string,
): Promise<CartUpsellAccessoryItem[]> {
  const tree = await fetchCategoryTree(shopId);
  return Promise.all(
    CART_UPSELL_ACCESSORY_SLUGS.map(async (slug) => {
      const node = findCategoryBySlug(tree, slug);
      if (!node) {
        return { categorySlug: slug, product: null };
      }
      try {
        const products = await fetchProducts({
          shop_id: shopId,
          category_id: node.id,
          limit: 6,
          locale,
          is_accessory: true,
        });
        const withImage =
          products.find((p) => p.primary_image_url) ?? products[0] ?? null;
        return { categorySlug: slug, product: withImage };
      } catch {
        return { categorySlug: slug, product: null };
      }
    }),
  );
}
