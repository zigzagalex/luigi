// app/lib/variantsLabel.ts

type VariantAttrs = Record<string, any> | null | undefined;

const ATTR_LABELS: Record<string, Record<string, string>> = {
  de: {
    size: "Grösse",
    size_eu: "Grösse",
    color: "Farbe",
    colour: "Farbe",
  },
  en: {
    size: "Size",
    size_eu: "Size",
    color: "Color",
    colour: "Colour",
  },
  fr: {
    size: "Taille",
    size_eu: "Taille",
    color: "Couleur",
    colour: "Couleur",
  },
  it: {
    size: "Taglia",
    size_eu: "Taglia",
    color: "Colore",
    colour: "Colore",
  },
};

const SKIP_KEYS = new Set(["category", "type", "sku", "id"]);

function labelsForLocale(locale?: string) {
  const key = (locale ?? "de").slice(0, 2).toLowerCase();
  return ATTR_LABELS[key] ?? ATTR_LABELS.de;
}

function readAttr(a: any, key: string): string | number | undefined {
  const direct = a?.[key];
  if (typeof direct === "string" || typeof direct === "number") return direct;
  const nested = a?.RawMessage?.[key];
  if (typeof nested === "string" || typeof nested === "number") return nested;
  return undefined;
}

export function formatVariantSpecs(attrs: VariantAttrs, locale = "de"): string {
  if (!attrs) return "";

  const a: any = (attrs as any).RawMessage ?? attrs;
  const labels = labelsForLocale(locale);

  const size = readAttr(a, "size_eu") ?? readAttr(a, "size");
  const color = readAttr(a, "color") ?? readAttr(a, "colour");

  const parts: string[] = [];
  if (size !== undefined) parts.push(`${labels.size_eu}: ${size}`);
  if (color !== undefined) parts.push(`${labels.color}: ${color}`);

  if (parts.length === 0) {
    const safe = Object.entries(a)
      .filter(([k, v]) => !SKIP_KEYS.has(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"))
      .slice(0, 3)
      .map(([k, v]) => {
        const label = labels[k] ?? k;
        return `${label}: ${String(v)}`;
      });
    return safe.join(" · ");
  }

  return parts.join(" · ");
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
