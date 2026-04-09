import { getTranslations } from "next-intl/server";
import AccessoryGrid from "@/[locale]/components/accessories/AccessoryGrid";
import pageShell from "../PageShell.module.css";
import styles from "./page.module.css";
import {
  fetchAccessories,
  fetchImagesForAccessoryVariant,
  fetchVariantsForAccessory,
  type Accessory,
} from "@/../utils/accessories";

export const dynamic = "force-dynamic";

const DEFAULT_SHOP_ID = 1;

export default async function AccessoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("accessoryPage");

  let accessories: Accessory[] = [];
  try {
    accessories = await fetchAccessories({ shop_id: DEFAULT_SHOP_ID, limit: 200, locale });
  } catch (err) {
    console.error("Failed to fetch accessories:", err);
    accessories = [];
  }

  const accessoriesWithImages: Accessory[] = await Promise.all(
    accessories.map(async (accessory) => {
      try {
        const variants = await fetchVariantsForAccessory(accessory.id);
        if (!variants.length) return accessory;
        const firstVariant = variants[0];
        const images = await fetchImagesForAccessoryVariant(firstVariant.id);
        if (!images.length) return accessory;
        const primary = images.find((img) => img.is_primary) ?? images[0];
        return {
          ...accessory,
          primary_image_url: primary.url,
        };
      } catch {
        return accessory;
      }
    }),
  );

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <section className={pageShell.section}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.description}>{t("subtitle")}</p>
          {accessoriesWithImages.length > 0 ? (
            <AccessoryGrid accessories={accessoriesWithImages} />
          ) : (
            <p className={styles.empty}>{t("empty")}</p>
          )}
        </section>
      </div>
    </main>
  );
}
