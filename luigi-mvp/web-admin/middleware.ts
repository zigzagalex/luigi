import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, locales } from "./i18n/config";

function pickLocale(req: NextRequest) {
  const cookieLocale = req.cookies.get("locale")?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const header = req.headers.get("accept-language") ?? "";
  const lowered = header.toLowerCase();

  for (const l of locales) {
    if (lowered.includes(l)) return l;
  }
  return defaultLocale;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const seg = pathname.split("/")[1];
  if (seg && isLocale(seg)) return NextResponse.next();

  const locale = pickLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
