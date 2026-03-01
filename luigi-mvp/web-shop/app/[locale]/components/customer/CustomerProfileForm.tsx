"use client";

import * as React from "react";
import { emptyCustomerProfile, type CustomerProfile } from "@/types/customer";

const REQUIRED: Array<keyof CustomerProfile> = [
  "email",
  "first_name",
  "last_name",
  "phone",
  "address1",
  "city",
  "postal_code",
];

function normalizeForApi(v: CustomerProfile) {
  return {
    email: v.email.trim(),
    phone: v.phone.trim(),
    first_name: v.first_name.trim(),
    last_name: v.last_name.trim(),
    address1: v.address1.trim() || null,
    address2: v.address2.trim() || null,
    postal_code: v.postal_code.trim() || null,
    city: v.city.trim() || null,
    country: v.country.trim() || null,
    notes: v.notes.trim() || null,
  };
}

function missingRequired(v: CustomerProfile): string[] {
  const missing: string[] = [];
  for (const k of REQUIRED) {
    if (!v[k].trim()) missing.push(k);
  }
  return missing;
}

function labelFor(k: keyof CustomerProfile) {
  switch (k) {
    case "first_name":
      return "First name";
    case "last_name":
      return "Last name";
    case "postal_code":
      return "Postal code";
    case "address1":
      return "Address line 1";
    case "address2":
      return "Address line 2";
    default:
      return k.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function FieldRow({
  label,
  value,
  required,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  error,
  children,
}: {
  label: string;
  value: string;
  required?: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  error?: string | null;
  children?: React.ReactNode;
}) {
  const empty = !value.trim();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 0",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      <div style={{ fontSize: 13, color: "#444" }}>
        {label}{" "}
        {required && (
          <span style={{ color: "#999", fontSize: 12 }}>
            (required)
          </span>
        )}
      </div>

      {!isEditing ? (
        <div style={{ color: empty ? "#999" : "#111" }}>
          {empty ? "Not set" : value}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {children}
          {error ? <div style={{ color: "#b00020", fontSize: 12 }}>{error}</div> : null}
        </div>
      )}

      {!isEditing ? (
        <button
          onClick={onEdit}
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid #e6e6e6",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {empty ? "Add" : "Edit"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid #e6e6e6",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid #e6e6e6",
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      style={{
        height: 40,
        borderRadius: 12,
        border: "1px solid #e6e6e6",
        padding: "0 12px",
        outline: "none",
      }}
    />
  );
}

export function CustomerProfileForm() {
  const [value, setValue] = React.useState<CustomerProfile>(emptyCustomerProfile);
  const [loading, setLoading] = React.useState(true);

  const [editingKey, setEditingKey] = React.useState<keyof CustomerProfile | null>(null);
  const [draft, setDraft] = React.useState<string>("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/me/customer", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (!cancelled) setError(body?.error ?? "Failed to load profile.");
        if (!cancelled) setLoading(false);
        return;
      }

      const data = await res.json().catch(() => null);

      if (cancelled) return;

      if (!data) {
        setValue(emptyCustomerProfile);
      } else {
        setValue({
          ...emptyCustomerProfile,
          ...data,
          country: (data.country && String(data.country)) || "CH",
        });
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const missing = missingRequired(value);

  function startEdit(k: keyof CustomerProfile) {
    setError(null);
    setEditingKey(k);
    setDraft(value[k] ?? "");
  }

  function cancelEdit() {
    setError(null);
    setEditingKey(null);
    setDraft("");
  }

  async function saveEdit() {
    if (!editingKey) return;
    setError(null);

    const k = editingKey;
    const next: CustomerProfile = { ...value, [k]: draft };

    // enforce required fields cannot be saved empty
    if (REQUIRED.includes(k) && !draft.trim()) {
      setError(`${labelFor(k)} is required.`);
      return;
    }

    // small convenience: default country if someone clears it
    if (k === "country" && !next.country.trim()) {
      next.country = "CH";
    }

    setSaving(true);
    try {
      const res = await fetch("/api/me/customer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeForApi(next)),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Failed to save.");
        return;
      }

      const saved = await res.json().catch(() => null);
      if (saved) {
        setValue({ ...next, ...saved, country: saved.country || next.country || "CH" });
      } else {
        setValue(next);
      }

      setEditingKey(null);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 20,
        display: "grid",
        gap: 14,
        opacity: loading ? 0.7 : 1,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Customer profile</div>
        <div style={{ fontSize: 13, color: "#666" }}>
          This is the information used during checkout.
        </div>
      </div>

      {missing.length > 0 && (
        <div style={{ padding: 12, borderRadius: 12, background: "#fff7e6", border: "1px solid #ffe2b5" }}>
          <div style={{ fontWeight: 900, marginBottom: 4 }}>Profile incomplete</div>
          <div style={{ color: "#666", fontSize: 13 }}>
            Please add:{" "}
            {missing
              .map((k) => labelFor(k as keyof CustomerProfile))
              .join(", ")}
          </div>
        </div>
      )}

      {/* CONTACT */}
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900 }}>Contact</div>
      {(Array<keyof CustomerProfile>("first_name", "last_name", "email", "phone")).map((k) => (
        <FieldRow
          key={k}
          label={labelFor(k)}
          value={value[k]}
          required={REQUIRED.includes(k)}
          isEditing={editingKey === k}
          onEdit={() => startEdit(k)}
          onCancel={cancelEdit}
          onSave={saveEdit}
          error={editingKey === k ? error : null}
        >
          <Input
            value={draft}
            onChange={setDraft}
            type={k === "email" ? "email" : "text"}
            placeholder={labelFor(k)}
          />
          {saving ? <div style={{ fontSize: 12, color: "#666" }}>Saving…</div> : null}
        </FieldRow>
      ))}

      {/* ADDRESS */}
      <div style={{ marginTop: 12, fontSize: 14, fontWeight: 900 }}>Address</div>
      {(Array<keyof CustomerProfile>("address1", "address2", "postal_code", "city", "country")).map((k) => (
        <FieldRow
          key={k}
          label={labelFor(k)}
          value={value[k]}
          required={REQUIRED.includes(k)}
          isEditing={editingKey === k}
          onEdit={() => startEdit(k)}
          onCancel={cancelEdit}
          onSave={saveEdit}
          error={editingKey === k ? error : null}
        >
          <Input
            value={draft}
            onChange={setDraft}
            placeholder={k === "country" ? "CH" : labelFor(k)}
          />
          {saving ? <div style={{ fontSize: 12, color: "#666" }}>Saving…</div> : null}
        </FieldRow>
      ))}

      {/* NOTES */}
      <div style={{ marginTop: 12, fontSize: 14, fontWeight: 900 }}>Notes</div>
      <FieldRow
        label="Notes"
        value={value.notes}
        isEditing={editingKey === "notes"}
        onEdit={() => startEdit("notes")}
        onCancel={cancelEdit}
        onSave={saveEdit}
        error={editingKey === "notes" ? error : null}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          style={{
            borderRadius: 12,
            border: "1px solid #e6e6e6",
            padding: 12,
            outline: "none",
            resize: "vertical",
          }}
        />
        {saving ? <div style={{ fontSize: 12, color: "#666" }}>Saving…</div> : null}
      </FieldRow>
    </div>
  );
}
