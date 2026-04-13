// app/i18n/useLocale.ts
"use client";

import { useParams } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "../i18n/config";

export function useLocale(): Locale {
  const params = useParams<{ locale?: string }>();
  const loc = params?.locale;
  return loc && isLocale(loc) ? loc : defaultLocale;
}