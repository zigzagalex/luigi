import { notFound } from "next/navigation";
import ProductDetail from "@/[locale]/products/[productId]/ProductDetail";
import { loadProductDetailPageData } from "@/../utils/productDetailPageData";

export const dynamic = "force-dynamic";

function parseID(raw: string): number {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }
  return id;
}

export default async function AccessoryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; accessoryId: string }>;
}) {
  const { locale, accessoryId } = await params;
  const id = parseID(accessoryId);

  let data;
  try {
    data = await loadProductDetailPageData(String(id), locale);
  } catch (err) {
    console.error("Failed to load accessory PDP data:", err);
    notFound();
  }

  if (!data.product.is_accessory) {
    notFound();
  }

  const { product, variantsWithImages, stores, inventory } = data;

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
