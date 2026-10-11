const DEV_API_BASE = "http://localhost:8080";

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Base URL for browser calls. Production leaves this empty so fetches stay
 * on the page origin (`/v1/...`). Dev falls back to the local API.
 */
export function apiBase(): string {
  const configured = readEnv("NEXT_PUBLIC_API_BASE") || readEnv("NEXT_PUBLIC_API_BASE_URL");
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return DEV_API_BASE;
  return "";
}

/** Base URL for Next server code. In production this is the API on the Docker network. */
export function serverApiBase(): string {
  const internal = readEnv("API_BASE_URL");
  if (internal) return internal.replace(/\/+$/, "");
  const pub = apiBase();
  if (pub) return pub;
  return DEV_API_BASE;
}
