import { getTranslations } from "next-intl/server";

export default async function AGBPage() {
  const t = await getTranslations("legalPages");

  return (
    <div style={{ padding: 24 }}>
      <h1>{t("agbs")}</h1>
      <p>{t("comingSoon")}</p>
    </div>
  );
}