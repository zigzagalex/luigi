import type { Locale } from "./config";
import { isLocale } from "./config";

/**
 * Prefix an in-app path with the active locale.
 * Accepts paths like "/search?x=1", "cart", or "/en/cart" (already prefixed).
 */
export function localeHref(locale: string, path: string): string {
  const loc = isLocale(locale) ? locale : ("de" as Locale);
  const raw = path.startsWith("/") ? path : `/${path}`;

  const qIndex = raw.indexOf("?");
  const pathname = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const search = qIndex >= 0 ? raw.slice(qIndex) : "";

  const first = pathname.split("/")[1];
  if (first && isLocale(first)) {
    return `${pathname}${search}`;
  }

  if (pathname === "/") {
    return `/${loc}${search}`;
  }

  return `/${loc}${pathname}${search}`;
}
