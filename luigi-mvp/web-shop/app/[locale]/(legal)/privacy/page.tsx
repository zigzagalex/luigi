import { getTranslations } from "next-intl/server";

import { getLegalCopy } from "@/../content/legal/getLegalCopy";
import CopyArticle from "../../components/layout/CopyArticle";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legalPages" });
  const copy = getLegalCopy(locale, "privacy");

  return (
    <CopyArticle
      title={t("privacy")}
      intro={copy.intro}
      sections={copy.sections}
    />
  );
}
