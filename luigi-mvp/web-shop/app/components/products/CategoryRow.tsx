import type { Product } from "@/utils/products";
import ProductCard from "./ProductCard";

type Props = {
  title: string;
  products: Product[];
};

export default function CategoryRow({ title, products }: Props) {
  if (!products.length) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-neutral-900">
        {title}
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product) => (
          <div
            key={product.id}
            className="min-w-[220px] max-w-[260px] flex-shrink-0"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
