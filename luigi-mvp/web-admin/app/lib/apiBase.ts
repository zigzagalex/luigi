const DEFAULT_API_BASE = "http://localhost:8080";

/** Origin of the Go API. Local default is localhost; override per deploy. */
export function apiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    DEFAULT_API_BASE;
  return raw.replace(/\/+$/, "");
}
