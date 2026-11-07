import { defaultLocale, isLocale } from "../../i18n/config";
import type { CopyDocument } from "../copy/types";
import { legalCopy, type LegalKind } from "./copy";

export function getLegalCopy(locale: string, kind: LegalKind): CopyDocument {
  const bundle = isLocale(locale) ? legalCopy[locale] : legalCopy[defaultLocale];
  return bundle[kind];
}
