"use client";

import { useState } from "react";

export default function SearchPill() {
  const [quantity, setQuantity] = useState(1);

  // UI-only for now – no navigation, no API calls
  return (
    <div className="w-full flex justify-center mt-6 mb-8">
      <div className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm max-w-3xl w-full">
        {/* WHAT */}
        <button
          type="button"
          className="flex-1 flex flex-col text-left hover:bg-neutral-50 rounded-full px-3 py-1 transition"
        >
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            What
          </span>
          <span className="text-sm text-neutral-900">
            Any bike
          </span>
        </button>

        <div className="h-6 w-px bg-neutral-200" />

        {/* WHEN */}
        <button
          type="button"
          className="flex-1 flex flex-col text-left hover:bg-neutral-50 rounded-full px-3 py-1 transition"
        >
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            When
          </span>
          <span className="text-sm text-neutral-900">
            Add dates
          </span>
        </button>

        <div className="h-6 w-px bg-neutral-200" />

        {/* HOW MANY */}
        <button
          type="button"
          className="flex-1 flex flex-col text-left hover:bg-neutral-50 rounded-full px-3 py-1 transition"
        >
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            How many
          </span>
          <span className="text-sm text-neutral-900">
            {quantity} bike{quantity > 1 ? "s" : ""}
          </span>
        </button>

        {/* CTA */}
        <button
          type="button"
          className="ml-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
        >
          Search
        </button>
      </div>
    </div>
  );
}
