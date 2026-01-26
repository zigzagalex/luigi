export type NullInt64 = { Int64: number; Valid: boolean } | null;

export function int64OrNull(v: any): number | null {
    if (!v) return null;
    if (v.Valid !== true) return null;
    return typeof v.Int64 === "number" ? v.Int64 : null;
  }
  