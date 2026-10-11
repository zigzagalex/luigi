import { getTranslations } from "next-intl/server";

import FaqList from "./FaqList";
import pageShell from "../../PageShell.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FAQPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faqPage" });

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <header className={pageShell.introSection}>
          <h1 className={pageShell.introTitle}>{t("title")}</h1>
          <p className={pageShell.introSubtitle}>{t("subtitle")}</p>
        </header>

        <section
          className={pageShell.section}
          aria-label={t("sectionAriaLabel")}
        >
          <FaqList
            locale={locale}
            contactPrompt={t("contactPrompt")}
            contactLink={t("contactLink")}
          />
        </section>
      </div>
    </main>
  );
}
