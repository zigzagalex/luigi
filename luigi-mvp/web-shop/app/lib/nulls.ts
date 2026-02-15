export function int64OrNull(v: any): number | null {
    if (!v) return null;
    if (v.Valid !== true) return null;
    return typeof v.Int64 === "number" ? v.Int64 : null;
  }

export type NullableInt64 = {
    Int64: number;
    Valid: boolean;
};

export type NullableString = {
    String: string;
    Valid: boolean;
};

export type NullableTime = {
    Time: string;
    Valid: boolean;
};