import type { Product } from "@/../utils/products";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
};

export default function ProductGrid({ products }: Props) {
  if (!products.length) return null;

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
