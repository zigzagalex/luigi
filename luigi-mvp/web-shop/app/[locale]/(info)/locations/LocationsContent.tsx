import { getTranslations } from "next-intl/server";

import type { StoreForLocation } from "@/../utils/fetchAPI";
import {
  formatStoreAddress,
  googleMapsSearchUrl,
} from "@/../utils/storeCoordinates";

import styles from "./locations.module.css";

type Props = {
  stores: StoreForLocation[];
  locale: string;
};

export default async function LocationsContent({ stores, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "locationsPage" });

  const sortedStores = [...stores].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (sortedStores.length === 0) {
    return (
      <p className={styles.emptyStores} role="status">
        {t("noStores")}
      </p>
    );
  }

  return (
    <div className={styles.layout}>
      <h2 id="location-stores-heading" className={styles.heading}>
        {t("storesHeading")}
      </h2>
      <ul className={styles.cards}>
        {sortedStores.map((s) => {
          const address = formatStoreAddress(s);
          const mapsHref = googleMapsSearchUrl(
            address || `${s.name} ${s.city}`.trim(),
          );
          return (
            <li key={s.id}>
              <article className={styles.card}>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{s.name}</h3>
                  {address ? (
                    <p className={styles.cardAddress}>{address}</p>
                  ) : (
                    <p className={styles.cardAddressMuted}>
                      {s.city || t("addressPending")}
                    </p>
                  )}
                </div>
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.cardLink}
                >
                  {t("openInMaps")}
                </a>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
