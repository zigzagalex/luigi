import { getTranslations } from "next-intl/server";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "infoPages" });

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("contact")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}
