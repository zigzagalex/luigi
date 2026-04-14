"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";
import { SHOP_ID } from "@/lib/AuthSession";
import {
  createStore,
  listStores,
  updateStore,
  type ApiHoliday,
  type ApiOpeningTime,
  type ApiStore,
} from "@/lib/storesApi";
import { useLocale } from "@/../i18n/useLocale";
import styles from "./stores.module.css";

type DraftStore = {
  name: string;
  address1: string;
  address2: string;
  postal_code: string;
  city: string;
  country: string;
  timezone: string;
  is_active: boolean;
  opening_times: ApiOpeningTime[];
  holidays: ApiHoliday[];
};

function emptyOpeningTimes(): ApiOpeningTime[] {
  return Array.from({ length: 7 }, (_, index) => ({
    day_of_week: index,
    opens_at: "09:00",
    closes_at: "18:00",
    is_closed: false,
  }));
}

function toDraft(store?: ApiStore): DraftStore {
  if (!store) {
    return {
      name: "",
      address1: "",
      address2: "",
      postal_code: "",
      city: "",
      country: "CH",
      timezone: "",
      is_active: true,
      opening_times: emptyOpeningTimes(),
      holidays: [],
    };
  }

  const byDay = new Map(store.opening_times.map((row) => [row.day_of_week, row]));
  return {
    name: store.name,
    address1: store.address1 ?? "",
    address2: store.address2 ?? "",
    postal_code: store.postal_code ?? "",
    city: store.city ?? "",
    country: store.country ?? "CH",
    timezone: store.timezone ?? "",
    is_active: store.is_active,
    opening_times: Array.from({ length: 7 }, (_, index) => {
      const row = byDay.get(index);
      return {
        day_of_week: index,
        opens_at: row?.opens_at ?? "09:00",
        closes_at: row?.closes_at ?? "18:00",
        is_closed: row?.is_closed ?? false,
      };
    }),
    holidays: store.holidays.map((item) => ({
      start_date: item.start_date,
      end_date: item.end_date,
      note: item.note ?? "",
    })),
  };
}

function isAdminRole(role: string | null | undefined) {
  return (role ?? "").toLowerCase().trim() === "admin";
}

export function StoresPageClient() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const { me, loading } = useAdminAuth();
  const canManage = useMemo(() => isAdminRole(me?.role ?? null), [me?.role]);

  const [stores, setStores] = useState<ApiStore[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftStore>(toDraft());
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const rows = await listStores(SHOP_ID);
    setStores(rows);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      router.replace(`/${locale}/login?next=/${locale}/users/stores`);
    }
  }, [loading, me, locale, router]);

  useEffect(() => {
    if (!me) return;
    void (async () => {
      try {
        await reload();
        setLoadError(null);
      } catch {
        setLoadError(t("storesLoadError"));
      }
    })();
  }, [me, reload, t]);

  function startEdit(store?: ApiStore) {
    setEditingId(store ? store.id : "new");
    setDraft(toDraft(store));
    setFormError(null);
  }

  function setOpenTime(day: number, field: "opens_at" | "closes_at", value: string) {
    setDraft((prev) => ({
      ...prev,
      opening_times: prev.opening_times.map((row) => (row.day_of_week === day ? { ...row, [field]: value } : row)),
    }));
  }

  function setClosed(day: number, isClosed: boolean) {
    setDraft((prev) => ({
      ...prev,
      opening_times: prev.opening_times.map((row) => (row.day_of_week === day ? { ...row, is_closed: isClosed } : row)),
    }));
  }

  function addHoliday() {
    const today = new Date().toISOString().slice(0, 10);
    setDraft((prev) => ({
      ...prev,
      holidays: [...prev.holidays, { start_date: today, end_date: today, note: "" }],
    }));
  }

  function updateHoliday(index: number, field: keyof ApiHoliday, value: string) {
    setDraft((prev) => ({
      ...prev,
      holidays: prev.holidays.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  }

  function removeHoliday(index: number) {
    setDraft((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((_, idx) => idx !== index),
    }));
  }

  async function saveCurrent() {
    if (!canManage || !editingId) return;
    const validationError = validateDraft(draft, t);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSavingId(editingId);
    setLoadError(null);
    setFormError(null);
    try {
      if (editingId === "new") {
        await createStore({ ...draft, shop_id: SHOP_ID });
      } else {
        await updateStore(editingId, draft);
      }
      await reload();
      setEditingId(null);
    } catch (err) {
      setLoadError(err instanceof Error && err.message ? err.message : t("storesSaveError"));
    } finally {
      setSavingId(null);
    }
  }

  if (loading || !me) {
    return (
      <main className={styles.main}>
        <p className={styles.muted}>…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.h1}>{t("storesTitle")}</h1>
        <p className={styles.sub}>{t("storesSubtitle")}</p>
      </div>

      {canManage ? (
        <button type="button" className={styles.primaryBtn} onClick={() => startEdit()}>
          {t("createStore")}
        </button>
      ) : (
        <p className={styles.readonly}>{t("readOnly")}</p>
      )}

      {loadError ? (
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      ) : null}
      {formError ? (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      ) : null}

      <div className={styles.grid}>
        {editingId === "new" ? (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2>{t("newStore")}</h2>
            </div>
            <StoreFields t={t} data={draft} editable onChange={setDraft} />
            <OpeningTimesTable t={t} data={draft} editable onSetTime={setOpenTime} onSetClosed={setClosed} />
            <HolidaysTable t={t} data={draft} editable onAddHoliday={addHoliday} onUpdateHoliday={updateHoliday} onRemoveHoliday={removeHoliday} />
            <div className={styles.actions}>
              <button type="button" className={styles.actionBtn} disabled={savingId === "new"} onClick={() => void saveCurrent()}>
                {savingId === "new" ? t("saving") : t("create")}
              </button>
              <button type="button" className={styles.actionBtn} disabled={savingId === "new"} onClick={() => setEditingId(null)}>
                {t("cancel")}
              </button>
            </div>
          </section>
        ) : null}

        {stores.map((store) => {
          const isEditing = editingId === store.id;
          const data = isEditing ? draft : toDraft(store);
          return (
            <section key={store.id} className={styles.card}>
              <div className={styles.cardHead}>
                <h2>{isEditing ? data.name || t("unnamedStore") : store.name}</h2>
                {canManage && !isEditing ? (
                  <button type="button" className={styles.actionBtn} onClick={() => startEdit(store)}>
                    {t("edit")}
                  </button>
                ) : null}
              </div>
              <StoreFields t={t} data={data} editable={isEditing} onChange={setDraft} />
              <OpeningTimesTable t={t} data={data} editable={isEditing} onSetTime={setOpenTime} onSetClosed={setClosed} />
              <HolidaysTable t={t} data={data} editable={isEditing} onAddHoliday={addHoliday} onUpdateHoliday={updateHoliday} onRemoveHoliday={removeHoliday} />
              {isEditing ? (
                <div className={styles.actions}>
                  <button type="button" className={styles.actionBtn} disabled={savingId === store.id} onClick={() => void saveCurrent()}>
                    {savingId === store.id ? t("saving") : t("save")}
                  </button>
                  <button type="button" className={styles.actionBtn} disabled={savingId === store.id} onClick={() => setEditingId(null)}>
                    {t("cancel")}
                  </button>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </main>
  );
}

function StoreFields({
  t,
  data,
  editable,
  onChange,
}: {
  t: ReturnType<typeof useTranslations<"admin">>;
  data: DraftStore;
  editable: boolean;
  onChange: Dispatch<SetStateAction<DraftStore>>;
}) {
  function updateField<K extends keyof DraftStore>(key: K, value: DraftStore[K]) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  const fields: Array<{ key: keyof DraftStore; label: string }> = [
    { key: "name", label: t("storeFieldName") },
    { key: "address1", label: t("storeFieldAddress1") },
    { key: "address2", label: t("storeFieldAddress2") },
    { key: "postal_code", label: t("storeFieldPostalCode") },
    { key: "city", label: t("storeFieldCity") },
    { key: "country", label: t("storeFieldCountry") },
    { key: "timezone", label: t("storeFieldTimezone") },
  ];

  return (
    <div className={styles.fields}>
      {fields.map((field) => (
        <label key={field.key} className={styles.field}>
          <span>{field.label}</span>
          {editable ? (
            <input value={String(data[field.key] ?? "")} onChange={(e) => updateField(field.key, e.target.value as never)} />
          ) : (
            <strong>{String(data[field.key] ?? "—") || "—"}</strong>
          )}
        </label>
      ))}
      <label className={styles.field}>
        <span>{t("storeFieldActive")}</span>
        {editable ? (
          <input type="checkbox" checked={data.is_active} onChange={(e) => updateField("is_active", e.target.checked)} />
        ) : (
          <strong>{data.is_active ? t("yes") : t("no")}</strong>
        )}
      </label>
    </div>
  );
}

function OpeningTimesTable({
  t,
  data,
  editable,
  onSetTime,
  onSetClosed,
}: {
  t: ReturnType<typeof useTranslations<"admin">>;
  data: DraftStore;
  editable: boolean;
  onSetTime: (day: number, field: "opens_at" | "closes_at", value: string) => void;
  onSetClosed: (day: number, value: boolean) => void;
}) {
  const dayLabels = [
    t("dayMon"),
    t("dayTue"),
    t("dayWed"),
    t("dayThu"),
    t("dayFri"),
    t("daySat"),
    t("daySun"),
  ];

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t("openingTimesDay")}</th>
          <th>{t("openingTimesOpen")}</th>
          <th>{t("openingTimesClose")}</th>
          <th>{t("openingTimesClosed")}</th>
        </tr>
      </thead>
      <tbody>
        {data.opening_times.map((row) => (
          <tr key={row.day_of_week}>
            <td>{dayLabels[row.day_of_week] ?? row.day_of_week}</td>
            <td>
              {editable ? (
                <input
                  type="time"
                  value={row.opens_at ?? ""}
                  disabled={row.is_closed}
                  onChange={(e) => onSetTime(row.day_of_week, "opens_at", e.target.value)}
                />
              ) : row.is_closed ? (
                "—"
              ) : (
                row.opens_at
              )}
            </td>
            <td>
              {editable ? (
                <input
                  type="time"
                  value={row.closes_at ?? ""}
                  disabled={row.is_closed}
                  onChange={(e) => onSetTime(row.day_of_week, "closes_at", e.target.value)}
                />
              ) : row.is_closed ? (
                "—"
              ) : (
                row.closes_at
              )}
            </td>
            <td>
              {editable ? (
                <input type="checkbox" checked={row.is_closed} onChange={(e) => onSetClosed(row.day_of_week, e.target.checked)} />
              ) : row.is_closed ? (
                t("yes")
              ) : (
                t("no")
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HolidaysTable({
  t,
  data,
  editable,
  onAddHoliday,
  onUpdateHoliday,
  onRemoveHoliday,
}: {
  t: ReturnType<typeof useTranslations<"admin">>;
  data: DraftStore;
  editable: boolean;
  onAddHoliday: () => void;
  onUpdateHoliday: (index: number, field: keyof ApiHoliday, value: string) => void;
  onRemoveHoliday: (index: number) => void;
}) {
  return (
    <div className={styles.holidaysWrap}>
      <div className={styles.holidaysHead}>
        <h3>{t("holidaysTitle")}</h3>
        {editable ? (
          <button type="button" className={styles.actionBtn} onClick={onAddHoliday}>
            {t("addHoliday")}
          </button>
        ) : null}
      </div>
      {data.holidays.length === 0 ? <p className={styles.muted}>{t("noHolidays")}</p> : null}
      {data.holidays.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("holidayStartDate")}</th>
              <th>{t("holidayEndDate")}</th>
              <th>{t("holidayNote")}</th>
              {editable ? <th>{t("colActions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.holidays.map((row, idx) => (
              <tr key={`${row.start_date}-${row.end_date}-${idx}`}>
                <td>
                  {editable ? (
                    <input type="date" value={row.start_date} onChange={(e) => onUpdateHoliday(idx, "start_date", e.target.value)} />
                  ) : (
                    row.start_date
                  )}
                </td>
                <td>
                  {editable ? (
                    <input type="date" value={row.end_date} onChange={(e) => onUpdateHoliday(idx, "end_date", e.target.value)} />
                  ) : (
                    row.end_date
                  )}
                </td>
                <td>
                  {editable ? (
                    <input value={row.note ?? ""} onChange={(e) => onUpdateHoliday(idx, "note", e.target.value)} />
                  ) : (
                    row.note || "—"
                  )}
                </td>
                {editable ? (
                  <td>
                    <button type="button" className={styles.actionBtn} onClick={() => onRemoveHoliday(idx)}>
                      {t("remove")}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function validateDraft(
  draft: DraftStore,
  t: ReturnType<typeof useTranslations<"admin">>,
): string | null {
  if (!draft.name.trim()) {
    return t("storeValidationNameRequired");
  }

  for (const row of draft.opening_times) {
    if (row.is_closed) continue;
    if (!row.opens_at || !row.closes_at) {
      return t("storeValidationHoursRequired");
    }
    if (row.opens_at >= row.closes_at) {
      return t("storeValidationHoursOrder");
    }
  }

  for (const row of draft.holidays) {
    if (!row.start_date || !row.end_date) {
      return t("storeValidationHolidayDatesRequired");
    }
    if (row.start_date > row.end_date) {
      return t("storeValidationHolidayOrder");
    }
  }

  return null;
}
