import { defaultLocale, isLocale } from "../../i18n/config";
import type { CopyDocument } from "../copy/types";
import { aboutCopy } from "./copy";

export function getAboutCopy(locale: string): CopyDocument {
  if (isLocale(locale)) return aboutCopy[locale];
  return aboutCopy[defaultLocale];
}
