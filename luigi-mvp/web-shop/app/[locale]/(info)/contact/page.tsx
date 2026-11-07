import { getTranslations } from "next-intl/server";

import pageShell from "../../PageShell.module.css";
import ContactForm from "./ContactForm";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contactPage" });

  return (
    <main className={pageShell.page}>
      <div className={pageShell.inner}>
        <header className={pageShell.introSection}>
          <h1 className={pageShell.introTitle}>{t("title")}</h1>
          <p className={pageShell.introSubtitle}>{t("subtitle")}</p>
        </header>
        <ContactForm />
      </div>
    </main>
  );
}
