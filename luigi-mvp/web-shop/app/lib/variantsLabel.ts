// app/lib/variantLabel.ts

type VariantAttrs = Record<string, any> | null | undefined;

export function formatVariantSpecs(attrs: VariantAttrs): string {
  if (!attrs) return "";

  const a: any = (attrs as any).RawMessage ?? attrs;

  const size =
    typeof a.size === "string" ? a.size :
    typeof a?.RawMessage?.size === "string" ? a.RawMessage.size :
    undefined;

  const color =
    typeof a.color === "string" ? a.color :
    typeof a?.RawMessage?.color === "string" ? a.RawMessage.color :
    undefined;

  const parts = [size, color].filter(Boolean);

  // Fallback: if nothing matched, try a safe stringify of simple keys
  if (parts.length === 0) {
    const safe = Object.entries(a)
      .filter(([k, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v)}`);
    return safe.join(" · ");
  }

  return parts.join(" / ");
}

export function normalizeVariantAttributes(
  attrs: any
): Record<string, any> | null {
  if (!attrs) return null;

  // If backend sent pqtype.NullRawMessage-like wrapper
  if (typeof attrs === "object" && ("RawMessage" in attrs || "Valid" in attrs)) {
    if (!attrs.Valid) return null;

    const raw = attrs.RawMessage;
    if (!raw) return null;

    // RawMessage can be an object already OR a JSON string
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    if (typeof raw === "object") return raw;
    return null;
  }

  // Already a plain attributes object
  if (typeof attrs === "object") return attrs;

  return null;
}
