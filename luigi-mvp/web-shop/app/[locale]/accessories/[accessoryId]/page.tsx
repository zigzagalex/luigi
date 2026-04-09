export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import AccessoryDetail from "./AccessoryDetail";
import {
  fetchAccessoryByID,
  fetchAccessoryInventory,
  fetchImagesForAccessoryVariant,
  fetchStores,
  fetchVariantsForAccessory,
} from "@/../utils/accessories";

async function parseID(raw: string): Promise<number> {
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
  const id = await parseID(accessoryId);

  let accessory;
  try {
    accessory = await fetchAccessoryByID(id, locale);
  } catch (err) {
    console.error("Failed to fetch accessory:", err);
    notFound();
  }

  const variants = await fetchVariantsForAccessory(id);
  const imagesPerVariant = await Promise.all(variants.map((v) => fetchImagesForAccessoryVariant(v.id)));
  const allImages = imagesPerVariant.flat();
  const variantsWithImages = variants.map((variant, idx) => ({
    ...variant,
    images: imagesPerVariant[idx]?.length ? imagesPerVariant[idx] : allImages,
  }));

  const variantIds = variants.map((v) => v.id);
  const [stores, inventory] = await Promise.all([
    fetchStores(accessory.shop_id),
    fetchAccessoryInventory(accessory.shop_id, variantIds),
  ]);

  return (
    <main className="page product-detail-page">
      <div className="page-inner">
        <AccessoryDetail
          accessory={accessory}
          variants={variantsWithImages}
          stores={stores}
          inventory={inventory}
        />
      </div>
    </main>
  );
}
