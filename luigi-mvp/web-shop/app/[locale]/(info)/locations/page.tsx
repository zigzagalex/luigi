import { getTranslations } from "next-intl/server";

import {
  fetchStoresForLocations,
  type StoreForLocation,
} from "@/../utils/fetchAPI";

import LocationsContent from "./LocationsContent";
import pageShell from "../../PageShell.module.css";

export const dynamic = "force-dynamic";

const DEFAULT_SHOP_ID = 1;

export default async function LocationsPage() {
  const t = await getTranslations("locationsPage");
  let stores: StoreForLocation[];
  try {
    stores = await fetchStoresForLocations(DEFAULT_SHOP_ID);
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
          <LocationsContent stores={stores} />
        </section>
      </div>
    </main>
  );
}
