import { getTranslations } from "next-intl/server";

export default async function AGBPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legalPages" });

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("agbs")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}