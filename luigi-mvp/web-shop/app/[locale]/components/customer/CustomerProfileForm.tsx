"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { emptyCustomerProfile, type CustomerProfile } from "@/types/customer";
import styles from "./CustomerProfileForm.module.css";

const REQUIRED: Array<keyof CustomerProfile> = [
  "email",
  "first_name",
  "last_name",
  "phone",
  "address1",
  "city",
  "postal_code",
];

const CONTACT_KEYS = ["first_name", "last_name", "email", "phone"] as const;
const ADDRESS_KEYS = [
  "address1",
  "address2",
  "postal_code",
  "city",
  "country",
] as const;

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

function labelFor(
  k: keyof CustomerProfile,
  t: (key: string, values?: Record<string, string>) => string,
) {
  switch (k) {
    case "first_name":
      return t("firstName");
    case "last_name":
      return t("lastName");
    case "postal_code":
      return t("postalCode");
    case "address1":
      return t("address1");
    case "address2":
      return t("address2");
    case "email":
      return t("email");
    case "phone":
      return t("phone");
    case "city":
      return t("city");
    case "country":
      return t("country");
    case "notes":
      return t("notes");
  }
}

function EditableFieldRow({
  label,
  value,
  required,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  error,
  saving,
  actionsLocked,
  requiredLabel,
  notSetLabel,
  addLabel,
  editLabel,
  cancelLabel,
  saveLabel,
  renderEditor,
}: {
  label: string;
  value: string;
  required?: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  error: string | null;
  saving: boolean;
  actionsLocked: boolean;
  requiredLabel: string;
  notSetLabel: string;
  addLabel: string;
  editLabel: string;
  cancelLabel: string;
  saveLabel: string;
  renderEditor: (inputId: string) => React.ReactNode;
}) {
  const reactId = React.useId();
  const inputId = `${reactId}-input`;
  const empty = !value.trim();
  const disableActions = actionsLocked || (isEditing && saving);

  return (
    <div className={styles.fieldRow}>
      {isEditing ? (
        <label className={styles.fieldLabel} htmlFor={inputId}>
          {label}{" "}
          {required && (
            <span className={styles.fieldLabelMuted}>{requiredLabel}</span>
          )}
        </label>
      ) : (
        <div className={styles.fieldLabel} id={`${reactId}-term`}>
          {label}{" "}
          {required && (
            <span className={styles.fieldLabelMuted}>{requiredLabel}</span>
          )}
        </div>
      )}

      {!isEditing ? (
        <div
          className={empty ? styles.fieldValueEmpty : styles.fieldValue}
          aria-labelledby={`${reactId}-term`}
        >
          {empty ? notSetLabel : value}
        </div>
      ) : (
        <div className={styles.fieldEditor}>
          {renderEditor(inputId)}
          {error ? (
            <p className={styles.errorText} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      {!isEditing ? (
        <div className={styles.fieldActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onEdit}
            disabled={disableActions}
          >
            {empty ? addLabel : editLabel}
          </button>
        </div>
      ) : (
        <div className={styles.fieldActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onCancel}
            disabled={disableActions}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={onSave}
            disabled={disableActions}
          >
            {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className={styles.textInput}
    />
  );
}

export function CustomerProfileForm() {
  const t = useTranslations("customerProfile");
  const [value, setValue] = React.useState<CustomerProfile>(emptyCustomerProfile);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [editingKey, setEditingKey] = React.useState<keyof CustomerProfile | null>(
    null,
  );
  const [draft, setDraft] = React.useState<string>("");

  const [bulkMode, setBulkMode] = React.useState(false);
  const [bulkDraft, setBulkDraft] = React.useState<CustomerProfile>(emptyCustomerProfile);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedFlash, setSavedFlash] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const res = await fetch("/api/me/customer", { method: "GET", cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setLoadError(body?.error ?? t("failedToLoad"));
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => null);

    if (!data) {
      setValue(emptyCustomerProfile);
    } else {
      setValue({
        ...emptyCustomerProfile,
        ...data,
        country: (data.country && String(data.country)) || t("countryPlaceholder"),
      });
    }

    setLoading(false);
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!savedFlash) return;
    const id = window.setTimeout(() => setSavedFlash(false), 4000);
    return () => window.clearTimeout(id);
  }, [savedFlash]);

  const missing = missingRequired(value);
  const actionsLocked = saving || bulkMode;

  function startEdit(k: keyof CustomerProfile) {
    setSaveError(null);
    setEditingKey(k);
    setDraft(value[k] ?? "");
  }

  function cancelEdit() {
    setSaveError(null);
    setEditingKey(null);
    setDraft("");
  }

  function openBulkMode() {
    setSaveError(null);
    setEditingKey(null);
    setDraft("");
    setBulkDraft({
      ...value,
      country: value.country.trim() || t("countryPlaceholder"),
    });
    setBulkMode(true);
  }

  function cancelBulkMode() {
    setSaveError(null);
    setBulkMode(false);
  }

  async function saveEdit() {
    if (!editingKey) return;
    setSaveError(null);

    const k = editingKey;
    const next: CustomerProfile = { ...value, [k]: draft };

    if (REQUIRED.includes(k) && !draft.trim()) {
      setSaveError(t("requiredField", { field: labelFor(k, t) }));
      return;
    }

    if (k === "country" && !next.country.trim()) {
      next.country = t("countryPlaceholder");
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
        setSaveError(body?.error ?? t("failedToSave"));
        return;
      }

      const saved = await res.json().catch(() => null);
      if (saved) {
        setValue({
          ...next,
          ...saved,
          country: saved.country || next.country || t("countryPlaceholder"),
        });
      } else {
        setValue(next);
      }

      setEditingKey(null);
      setDraft("");
      setSavedFlash(true);
    } finally {
      setSaving(false);
    }
  }

  async function saveBulk() {
    setSaveError(null);
    const miss = missingRequired(bulkDraft);
    if (miss.length > 0) {
      setSaveError(
        t("pleaseAdd", {
          fields: miss.map((k) => labelFor(k as keyof CustomerProfile, t)).join(", "),
        }),
      );
      return;
    }

    let next = { ...bulkDraft };
    if (!next.country.trim()) next = { ...next, country: t("countryPlaceholder") };

    setSaving(true);
    try {
      const res = await fetch("/api/me/customer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeForApi(next)),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSaveError(body?.error ?? t("failedToSave"));
        return;
      }

      const saved = await res.json().catch(() => null);
      if (saved) {
        setValue({
          ...next,
          ...saved,
          country: saved.country || next.country || t("countryPlaceholder"),
        });
      } else {
        setValue(next);
      }

      setBulkMode(false);
      setSavedFlash(true);
    } finally {
      setSaving(false);
    }
  }

  function bulkField(
    k: keyof CustomerProfile,
    opts?: { type?: string; placeholder?: string },
  ) {
    const ph =
      opts?.placeholder ??
      (k === "country" ? t("countryPlaceholder") : labelFor(k, t));
    return (
      <div className={styles.bulkField} key={k}>
        <label className={styles.bulkLabel} htmlFor={`bulk-${k}`}>
          {labelFor(k, t)}
          {REQUIRED.includes(k) ? ` ${t("required")}` : ""}
        </label>
        <TextInput
          id={`bulk-${k}`}
          value={bulkDraft[k]}
          onChange={(v) => setBulkDraft((d) => ({ ...d, [k]: v }))}
          placeholder={ph}
          type={opts?.type ?? "text"}
        />
      </div>
    );
  }

  return (
    <div
      className={`${styles.card} ${loading ? styles.cardLoading : ""}`}
      aria-busy={loading || undefined}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <h2 className={styles.title}>{t("profileTitle")}</h2>
        <p className={styles.subtitle}>{t("profileSubtitle")}</p>
      </div>

      {savedFlash ? (
        <p className={styles.savedStatus} role="status" aria-live="polite">
          {t("saved")}
        </p>
      ) : null}

      {loadError ? (
        <div role="alert" className={styles.banner}>
          <p className={styles.bannerBody} style={{ margin: 0 }}>
            {loadError}
          </p>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => void load()}
              disabled={loading}
            >
              {t("retryLoad")}
            </button>
          </div>
        </div>
      ) : null}

      {!loading && !loadError && bulkMode ? (
        <>
          <h3 className={styles.sectionTitle}>{t("completeProfile")}</h3>
          <div className={styles.bulkForm}>
            {saveError ? (
              <p className={styles.errorText} role="alert">
                {saveError}
              </p>
            ) : null}
            <p className={styles.subtitle} style={{ margin: 0 }}>
              {t("completeProfileHint")}
            </p>
            <div className={styles.bulkGrid}>
              <h4 className={styles.sectionTitle} style={{ fontSize: "var(--text-meta-size)" }}>
                {t("contact")}
              </h4>
              {CONTACT_KEYS.map((k) =>
                bulkField(k, { type: k === "email" ? "email" : "text" }),
              )}
              <h4
                className={styles.sectionTitle}
                style={{ fontSize: "var(--text-meta-size)", marginTop: 8 }}
              >
                {t("address")}
              </h4>
              {ADDRESS_KEYS.map((k) => bulkField(k))}
              <h4
                className={styles.sectionTitle}
                style={{ fontSize: "var(--text-meta-size)", marginTop: 8 }}
              >
                {t("notesSectionTitle")}
              </h4>
              <div className={styles.bulkField}>
                <label className={styles.bulkLabel} htmlFor="bulk-notes">
                  {t("notes")}
                </label>
                <textarea
                  id="bulk-notes"
                  value={bulkDraft.notes}
                  onChange={(e) =>
                    setBulkDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  rows={4}
                  className={styles.textarea}
                  placeholder={t("notes")}
                />
              </div>
            </div>
            <div className={styles.bulkActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={cancelBulkMode}
                disabled={saving}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => void saveBulk()}
                disabled={saving}
              >
                {saving ? t("saving") : t("saveAll")}
              </button>
            </div>
          </div>
        </>
      ) : !loading && !loadError ? (
        <>
          {missing.length > 0 && (
            <div className={styles.banner}>
              <p className={styles.bannerTitle}>{t("profileIncomplete")}</p>
              <p className={styles.bannerBody}>
                {t("pleaseAdd", {
                  fields: missing
                    .map((k) => labelFor(k as keyof CustomerProfile, t))
                    .join(", "),
                })}
              </p>
              <div className={styles.completeProfileRow} style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={openBulkMode}
                  disabled={actionsLocked}
                >
                  {t("completeProfile")}
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 6 }} className={styles.subsectionTitle}>
            {t("contact")}
          </div>
          {CONTACT_KEYS.map((k) => (
            <EditableFieldRow
              key={k}
              label={labelFor(k, t)}
              value={value[k]}
              required={REQUIRED.includes(k)}
              isEditing={editingKey === k}
              onEdit={() => startEdit(k)}
              onCancel={cancelEdit}
              onSave={() => void saveEdit()}
              error={editingKey === k ? saveError : null}
              saving={saving}
              actionsLocked={actionsLocked}
              requiredLabel={t("required")}
              notSetLabel={t("notSet")}
              addLabel={t("add")}
              editLabel={t("edit")}
              cancelLabel={t("cancel")}
              saveLabel={t("save")}
              renderEditor={(inputId) => (
                <>
                  <TextInput
                    id={inputId}
                    value={draft}
                    onChange={setDraft}
                    type={k === "email" ? "email" : "text"}
                    placeholder={labelFor(k, t)}
                  />
                  {saving && editingKey === k ? (
                    <span className={styles.subtitle}>{t("saving")}</span>
                  ) : null}
                </>
              )}
            />
          ))}

          <div style={{ marginTop: 12 }} className={styles.subsectionTitle}>
            {t("address")}
          </div>
          {ADDRESS_KEYS.map((k) => (
            <EditableFieldRow
              key={k}
              label={labelFor(k, t)}
              value={value[k]}
              required={REQUIRED.includes(k)}
              isEditing={editingKey === k}
              onEdit={() => startEdit(k)}
              onCancel={cancelEdit}
              onSave={() => void saveEdit()}
              error={editingKey === k ? saveError : null}
              saving={saving}
              actionsLocked={actionsLocked}
              requiredLabel={t("required")}
              notSetLabel={t("notSet")}
              addLabel={t("add")}
              editLabel={t("edit")}
              cancelLabel={t("cancel")}
              saveLabel={t("save")}
              renderEditor={(inputId) => (
                <>
                  <TextInput
                    id={inputId}
                    value={draft}
                    onChange={setDraft}
                    placeholder={
                      k === "country" ? t("countryPlaceholder") : labelFor(k, t)
                    }
                  />
                  {saving && editingKey === k ? (
                    <span className={styles.subtitle}>{t("saving")}</span>
                  ) : null}
                </>
              )}
            />
          ))}

          <div style={{ marginTop: 12 }} className={styles.subsectionTitle}>
            {t("notesSectionTitle")}
          </div>
          <p className={styles.notesSectionHint}>{t("notesSectionHint")}</p>
          <EditableFieldRow
            label={t("notes")}
            value={value.notes}
            isEditing={editingKey === "notes"}
            onEdit={() => startEdit("notes")}
            onCancel={cancelEdit}
            onSave={() => void saveEdit()}
            error={editingKey === "notes" ? saveError : null}
            saving={saving}
            actionsLocked={actionsLocked}
            requiredLabel={t("required")}
            notSetLabel={t("notSet")}
            addLabel={t("add")}
            editLabel={t("edit")}
            cancelLabel={t("cancel")}
            saveLabel={t("save")}
            renderEditor={(inputId) => (
              <>
                <textarea
                  id={inputId}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  className={styles.textarea}
                  placeholder={t("notes")}
                />
                {saving && editingKey === "notes" ? (
                  <span className={styles.subtitle}>{t("saving")}</span>
                ) : null}
              </>
            )}
          />
        </>
      ) : null}
    </div>
  );
}
