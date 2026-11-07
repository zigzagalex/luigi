import { getTranslations } from "next-intl/server";
import {
  IconCalendarReserve,
  IconPayAtPickup,
  IconRideBike,
  IconShieldInsured,
  IconWrenchServiced,
  IconBikeChoose,
} from "@/[locale]/components/icons/icons";
import styles from "./RentalTrustBanner.module.css";

type Props = {
  locale: string;
};

export default async function RentalTrustBanner({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "home" });

  const processSteps = [
    {
      key: "step1",
      Icon: IconBikeChoose,
    },
    {
      key: "step2",
      Icon: IconCalendarReserve,
    },
    {
      key: "step3",
      Icon: IconPayAtPickup,
    },
    {
      key: "step4",
      Icon: IconRideBike,
    },
  ] as const;

  const highlights = [
    { key: "serviced", Icon: IconWrenchServiced },
    { key: "insured", Icon: IconShieldInsured },
  ] as const;

  return (
    <div
      className={styles.banner}
      role="region"
      aria-labelledby="rental-trust-banner-title"
    >
      <div className={styles.headerBlock}>
        <h2 id="rental-trust-banner-title" className={styles.title}>
          {t("trustBanner.title")}
        </h2>
        <p className={styles.subtitle}>{t("trustBanner.subtitle")}</p>
      </div>

      <div className={styles.process}>
        <p className={styles.sectionLabel}>{t("trustBanner.processTitle")}</p>
        <ol className={styles.processGrid}>
          {processSteps.map(({ key, Icon }, index) => (
            <li key={key} className={styles.step}>
              <div className={styles.stepTop}>
                <Icon className={styles.stepIcon} aria-hidden />
                <span className={styles.stepIndex} aria-hidden="true">
                  {index + 1}
                </span>
              </div>
              <div className={styles.stepText}>
                <h3 className={styles.stepTitle}>
                  {t(`trustBanner.${key}.title`)}
                </h3>
                <p className={styles.stepBody}>{t(`trustBanner.${key}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <hr className={styles.divider} />

      <div>
        <p className={styles.sectionLabel}>{t("trustBanner.highlightsTitle")}</p>
        <ul className={styles.highlightsGrid}>
          {highlights.map(({ key, Icon }) => (
            <li key={key} className={styles.highlight}>
              <Icon className={styles.highlightIcon} aria-hidden />
              <div className={styles.highlightText}>
                <p className={styles.highlightTitle}>
                  {t(`trustBanner.${key}.title`)}
                </p>
                <p className={styles.highlightBody}>
                  {t(`trustBanner.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
