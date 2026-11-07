import { getTranslations } from "next-intl/server";

import { getLegalCopy } from "@/../content/legal/getLegalCopy";
import CopyArticle from "../../components/layout/CopyArticle";

export default async function AGBPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legalPages" });
  const copy = getLegalCopy(locale, "agbs");

  return (
    <CopyArticle title={t("agbs")} intro={copy.intro} sections={copy.sections} />
  );
}
