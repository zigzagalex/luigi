import { getTranslations } from "next-intl/server";

import {
  fetchStoresForLocations,
  type StoreForLocation,
} from "@/../utils/fetchAPI";

import { SHOP_ID } from "@/lib/shopId";
import LocationsContent from "./LocationsContent";
import pageShell from "../../PageShell.module.css";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "locationsPage" });
  let stores: StoreForLocation[];
  try {
    stores = await fetchStoresForLocations(SHOP_ID);
  } catch {
    stores = [];
  }

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <header className={pageShell.introSection}>
          <h1 className={pageShell.introTitle}>{t("title")}</h1>
          <p className={pageShell.introSubtitle}>{t("subtitle")}</p>
        </header>

        <section
          className={pageShell.section}
          aria-labelledby="location-stores-heading"
        >
          <LocationsContent stores={stores} locale={locale} />
        </section>
      </div>
    </main>
  );
}
