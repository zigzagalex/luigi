// app/products/[productId]/page.tsx
export const dynamic = "force-dynamic";

import ProductDetail from "./ProductDetail";
import { loadProductDetailPageData } from "@/../utils/productDetailPageData";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { locale, productId } = await params;

  const { product, variantsWithImages, stores, inventory } = await loadProductDetailPageData(
    productId,
    locale,
  );

  return (
    <main className="page product-detail-page">
      <div className="page-inner">
        <ProductDetail
          product={product}
          variants={variantsWithImages}
          stores={stores}
          inventory={inventory}
        />
      </div>
    </main>
  );
}
