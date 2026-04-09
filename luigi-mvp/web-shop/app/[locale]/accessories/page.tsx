import { getTranslations } from "next-intl/server";
import AccessoryGrid from "@/[locale]/components/accessories/AccessoryGrid";
import pageShell from "../PageShell.module.css";
import styles from "./page.module.css";
import { fetchAccessories, type Accessory } from "@/../utils/accessories";

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

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <section className={pageShell.section}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.description}>{t("subtitle")}</p>
          {accessories.length > 0 ? (
            <AccessoryGrid accessories={accessories} />
          ) : (
            <p className={styles.empty}>{t("empty")}</p>
          )}
        </section>
      </div>
    </main>
  );
}
