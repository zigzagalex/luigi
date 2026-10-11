"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import styles from "./checkout.module.css";

import { useAuth } from "@/[locale]/components/auth/AuthContext";
import { useCart } from "@/[locale]/components/cart/CartContext";
import { localeHref } from "@/../i18n/localeHref";
import { formatMoneyCents, formatRentalDay } from "@/lib/rentalDates";

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

type PickupPerson = {
  enabled: boolean;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

type CheckoutBanner =
  | { kind: "error"; message: string }
  | { kind: "warning"; message: string };

function missingRequired(v: CustomerProfile): Array<keyof CustomerProfile> {
  return REQUIRED.filter((k) => !String(v[k] ?? "").trim());
}

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

async function fetchCustomer(): Promise<CustomerProfile> {
  const res = await fetch("/api/me/customer", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load customer profile");
  const data = await res.json();

  if (!data) return emptyCustomerProfile;

  return {
    ...emptyCustomerProfile,
    ...data,
    country: data.country || "CH",
  };
}

async function saveCustomer(next: CustomerProfile): Promise<CustomerProfile> {
  const res = await fetch("/api/me/customer", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizeForApi(next)),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to save profile");
  }
  const saved = await res.json().catch(() => null);
  return saved ? ({ ...next, ...saved, country: saved.country || next.country || "CH" }) : next;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.summaryRow}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  autoComplete,
  multiline,
  rows = 4,
  maxLength,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  className?: string;
}) {
  const rootClass = className ? `${styles.field} ${className}` : styles.field;
  return (
    <div className={rootClass}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {required ? <span className={styles.req}>*</span> : null}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={styles.textarea}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          autoComplete={autoComplete}
        />
      ) : (
        <input
          id={id}
          className={styles.input}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
        />
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const fieldId = React.useId();
  const { me, loading: authLoading } = useAuth();

  function profileFieldLabel(k: keyof CustomerProfile): string {
    switch (k) {
      case "email":
        return t("email");
      case "first_name":
        return t("firstName");
      case "last_name":
        return t("lastName");
      case "phone":
        return t("phone");
      case "address1":
        return t("address1");
      case "address2":
        return t("address2");
      case "postal_code":
        return t("postalCode");
      case "city":
        return t("city");
      case "country":
        return t("country");
      case "notes":
        return t("notesLabel");
      default:
        return String(k);
    }
  }

  const {
    cart,
    loading: cartLoading,
    refresh,
    canCheckout,
    blockedItems,
    imageUrlForCartItem,
    productNameForCartItem,
    variantTextForCartItem,
  } = useCart();

  const items = cart?.items ?? [];
  const currency = cart?.currency ?? "CHF";
  const store_name = cart?.store_name
  const store_address = cart?.store_address
  const store_postalcode = cart?.store_postalcode
  const store_city = cart?.store_city

  // customer profile state
  const [customer, setCustomer] = React.useState<CustomerProfile>(emptyCustomerProfile);
  const [loadingCustomer, setLoadingCustomer] = React.useState(true);

  const [profileExpanded, setProfileExpanded] = React.useState(false);
  const [profileDraft, setProfileDraft] = React.useState<CustomerProfile>(emptyCustomerProfile);
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  // pickup + terms
  const [pickupExpanded, setPickupExpanded] = React.useState(false);
  const [pickup, setPickup] = React.useState<PickupPerson>({
    enabled: false,
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [pickupDraft, setPickupDraft] = React.useState<PickupPerson>({
    enabled: false,
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const [checkoutBanner, setCheckoutBanner] = React.useState<CheckoutBanner | null>(null);
  const [agreed, setAgreed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingCustomer(true);
        setProfileError(null);

        const c = await fetchCustomer();
        if (cancelled) return;

        setCustomer(c);
        setProfileDraft(c);

        if (missingRequired(c).length > 0) setProfileExpanded(true);
      } catch (e: any) {
        if (!cancelled) setProfileError(e?.message ?? t("failedToLoadProfile"));
      } finally {
        if (!cancelled) setLoadingCustomer(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const missing = missingRequired(customer);
  const activeProfile = profileExpanded ? profileDraft : customer;
  const activeMissing = missingRequired(activeProfile);
  const pickupMissingFields = React.useMemo(() => {
    const source = pickupExpanded ? pickupDraft : pickup;
    if (!source.enabled) return [] as string[];
    const missingFields: string[] = [];
    if (!source.first_name.trim()) missingFields.push(t("firstName"));
    if (!source.last_name.trim()) missingFields.push(t("lastName"));
    if (!source.email.trim()) missingFields.push(t("email"));
    if (!source.phone.trim()) missingFields.push(t("phone"));
    return missingFields;
  }, [pickup, pickupDraft, pickupExpanded, t]);
  const profileComplete = activeMissing.length === 0;
  const profileDirty =
    JSON.stringify(normalizeForApi(profileDraft)) !== JSON.stringify(normalizeForApi(customer));
  const termsReady = profileComplete && pickupMissingFields.length === 0 && items.length > 0 && canCheckout;

  const canBuy =
    !authLoading &&
    !!me &&
    termsReady &&
    agreed &&
    !profileSaving;

  React.useEffect(() => {
    if (!termsReady && agreed) setAgreed(false);
  }, [termsReady, agreed]);

  async function onBuy() {
    setCheckoutBanner(null);
    setProfileError(null);

    if (!agreed) {
      setCheckoutBanner({ kind: "warning", message: t("acceptTermsAlert") });
      return;
    }

    if (activeMissing.length > 0) {
      setProfileExpanded(true);
      setCheckoutBanner({
        kind: "warning",
        message: t("pleaseFill", { fields: activeMissing.map(profileFieldLabel).join(", ") }),
      });
      return;
    }

    if (pickupMissingFields.length > 0) {
      setPickupExpanded(true);
      setCheckoutBanner({
        kind: "warning",
        message: t("pleaseFill", { fields: pickupMissingFields.join(", ") }),
      });
      return;
    }

    let savedCustomer = customer;
    if (profileDirty || profileExpanded) {
      setProfileSaving(true);
      try {
        savedCustomer = await saveCustomer(profileDraft);
        setCustomer(savedCustomer);
        setProfileDraft(savedCustomer);
        setProfileExpanded(false);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : t("failedToSaveProfile");
        setProfileError(message);
        setCheckoutBanner({ kind: "error", message });
        setProfileSaving(false);
        return;
      } finally {
        setProfileSaving(false);
      }
    }

    const nextPickup = pickupExpanded ? pickupDraft : pickup;
    if (pickupExpanded) {
      setPickup(pickupDraft);
      setPickupExpanded(false);
    }

    const idempotencyKey = crypto.randomUUID();

    const customerName = `${savedCustomer.first_name} ${savedCustomer.last_name}`.trim();

    const pickupPersonName = nextPickup.enabled
      ? `${nextPickup.first_name.trim()} ${nextPickup.last_name.trim()}`.trim()
      : customerName;

    const pickupPersonEmail = nextPickup.enabled ? nextPickup.email.trim() : savedCustomer.email.trim();
    const pickupPersonPhone = nextPickup.enabled ? nextPickup.phone.trim() : savedCustomer.phone.trim();

    const notesTrimmed = savedCustomer.notes?.trim() || null;

    const payload = {
      shop_id: me?.shop_id,
      store_id: cart?.store_id,
      idempotency_key: idempotencyKey,
      notes: notesTrimmed,

      pickup_person_name: pickupPersonName || null,
      pickup_person_email: pickupPersonEmail || null,
      pickup_person_phone: pickupPersonPhone || null,
    };

    try {
      const res = await fetch("/api/reservations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        setCheckoutBanner({ kind: "error", message: t("checkoutFailed") });
        return;
      }

      try {
        sessionStorage.setItem("luigi.checkout.reservations", JSON.stringify(data));
        sessionStorage.setItem(
          "luigi.checkout.meta",
          JSON.stringify({
            store_name: store_name ?? null,
            store_address: store_address ?? null,
            store_postalcode: store_postalcode ?? null,
            store_city: store_city ?? null,
          }),
        );
      } catch {
        // ignore storage failures; confirmation page still shows success
      }

      await refresh();

      router.push(localeHref(locale, "/checkout/confirmation?success=1"));
    } catch (err) {
      console.error(err);
      setCheckoutBanner({ kind: "error", message: t("unexpectedError") });
    }
  }

  if (authLoading) return <div className={styles.page}>{t("loadingCart")}</div>;

  if (!me) {
    return (
      <div className={styles.page}>
        <h1 className={styles.h1}>{t("title")}</h1>
        <p className={styles.muted}>{t("signInToContinue")}</p>
        <Link className={styles.link} href={localeHref(locale, "/cart")}>
          {t("backToCart")}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.h1}>{t("title")}</h1>
        <Link className={styles.link} href={localeHref(locale, "/cart")}>
          {t("backToCart")}
        </Link>
      </div>

      {/* 1) Profile section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>{t("yourDetails")}</div>
            <div className={styles.cardSubtitle}>{t("detailsSubtitle")}</div>
          </div>

          {!profileExpanded ? (
            <button
              className={styles.btn}
              onClick={() => {
                setProfileDraft(customer);
                setProfileExpanded(true);
              }}
              disabled={loadingCustomer}
            >
              {profileComplete ? t("edit") : t("complete")}
            </button>
          ) : null}
        </div>

        {!profileExpanded ? (
          <div className={styles.summary}>
            {missing.length > 0 ? (
              <div className={styles.warnBox}>
                <div className={styles.warnTitle}>{t("profileIncomplete")}</div>
                <div className={styles.warnText}>
                  {t("pleaseAdd", { fields: missing.map(profileFieldLabel).join(", ") })}
                </div>
              </div>
            ) : null}

            <div className={styles.summaryGrid}>
              <SummaryRow label={t("name")} value={`${customer.first_name} ${customer.last_name}`.trim() || t("dash")} />
              <SummaryRow label={t("email")} value={customer.email || t("dash")} />
              <SummaryRow label={t("phone")} value={customer.phone || t("dash")} />
              <SummaryRow
                label={t("address")}
                value={
                  customer.address1
                    ? `${customer.address1}${customer.postal_code || customer.city ? `, ${customer.postal_code} ${customer.city}` : ""}`
                    : t("dash")
                }
              />
              {customer.notes.trim() ? <SummaryRow label={t("notesLabel")} value={customer.notes.trim()} /> : null}
            </div>
          </div>
        ) : (
          <div className={styles.expand}>
            <div className={styles.expandGrid}>
              <Field
                id={`${fieldId}-profile-first_name`}
                label={t("firstName")}
                required
                value={profileDraft.first_name}
                onChange={(v) => setProfileDraft((p) => ({ ...p, first_name: v }))}
                disabled={profileSaving}
                autoComplete="given-name"
              />
              <Field
                id={`${fieldId}-profile-last_name`}
                label={t("lastName")}
                required
                value={profileDraft.last_name}
                onChange={(v) => setProfileDraft((p) => ({ ...p, last_name: v }))}
                disabled={profileSaving}
                autoComplete="family-name"
              />
              <Field
                id={`${fieldId}-profile-email`}
                label={t("email")}
                required
                type="email"
                value={profileDraft.email}
                onChange={(v) => setProfileDraft((p) => ({ ...p, email: v }))}
                disabled={profileSaving}
                autoComplete="email"
              />
              <Field
                id={`${fieldId}-profile-phone`}
                label={t("phone")}
                required
                placeholder={t("phonePlaceholder")}
                value={profileDraft.phone}
                onChange={(v) => setProfileDraft((p) => ({ ...p, phone: v }))}
                disabled={profileSaving}
                autoComplete="tel"
              />
              <Field
                id={`${fieldId}-profile-address1`}
                label={t("address1")}
                required
                value={profileDraft.address1}
                onChange={(v) => setProfileDraft((p) => ({ ...p, address1: v }))}
                disabled={profileSaving}
                autoComplete="street-address"
              />
              <Field
                id={`${fieldId}-profile-postal_code`}
                label={t("postalCode")}
                required
                value={profileDraft.postal_code}
                onChange={(v) => setProfileDraft((p) => ({ ...p, postal_code: v }))}
                disabled={profileSaving}
                autoComplete="postal-code"
              />
              <Field
                id={`${fieldId}-profile-city`}
                label={t("city")}
                required
                value={profileDraft.city}
                onChange={(v) => setProfileDraft((p) => ({ ...p, city: v }))}
                disabled={profileSaving}
                autoComplete="address-level2"
              />
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`${fieldId}-profile-country`}>
                  {t("country")}
                </label>
                <select
                  id={`${fieldId}-profile-country`}
                  className={styles.input}
                  value={profileDraft.country || "CH"}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, country: e.target.value }))}
                  disabled={profileSaving}
                  autoComplete="country"
                >
                  <option value="CH">CH</option>
                  <option value="DE">DE</option>
                  <option value="AT">AT</option>
                  <option value="FR">FR</option>
                  <option value="IT">IT</option>
                </select>
              </div>
              <Field
                id={`${fieldId}-profile-address2`}
                className={styles.fieldFullWidth}
                label={t("address2")}
                value={profileDraft.address2}
                onChange={(v) => setProfileDraft((p) => ({ ...p, address2: v }))}
                disabled={profileSaving}
                autoComplete="address-line2"
              />
              <Field
                id={`${fieldId}-profile-notes`}
                className={styles.fieldFullWidth}
                label={t("notesLabel")}
                placeholder={t("notesPlaceholder")}
                value={profileDraft.notes}
                onChange={(v) => setProfileDraft((p) => ({ ...p, notes: v }))}
                disabled={profileSaving}
                multiline
                rows={3}
                maxLength={500}
                autoComplete="off"
              />
            </div>

            {profileError ? <div className={styles.errorBox}>{profileError}</div> : null}

            {missing.length === 0 ? (
              <div className={styles.expandActions}>
                <button
                  className={styles.btnGhost}
                  onClick={() => {
                    setProfileDraft(customer);
                    setProfileExpanded(false);
                    setProfileError(null);
                  }}
                  disabled={profileSaving}
                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <div className={styles.muted}>{t("confirmSavesProfileHint")}</div>
            )}
          </div>
        )}
      </div>

      {/* 1.1) Pick-up location */}
      {store_name && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>{t("pickupLocation")}</div>
              <div className={styles.cardSubtitle}>
                {t("pickupLocationSubtitle")}
              </div>
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                  <div className={styles.summaryLabel}>{t("store")}</div>
                <div className={styles.summaryValue}>{store_name}</div>
              </div>

              {(store_address || store_postalcode || store_city) && (
                <div className={styles.summaryRow}>
                  <div className={styles.summaryLabel}>{t("address")}</div>
                  <div className={styles.summaryValue}>
                    {store_address}
                    {(store_postalcode || store_city) && (
                      <>
                        <br />
                        {store_postalcode} {store_city}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2) Cart summary */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>{t("cartSummary")}</div>
            <div className={styles.cardSubtitle}>{t("cartSummarySubtitle")}</div>
          </div>
        </div>

        {blockedItems.length > 0 ? (
          <div className={styles.warnBox}>
            <div className={styles.warnTitle}>{t("blockedItemsTitle")}</div>
            <div className={styles.warnText}>
              {t("blockedItemsText")}
            </div>
          </div>
        ) : null}

        {cartLoading ? (
          <div className={styles.muted}>{t("loadingCart")}</div>
        ) : items.length === 0 ? (
          <div className={styles.muted}>{t("cartEmpty")}</div>
        ) : (
          <div className={styles.cartList}>
            {items.map((item: any) => {
              const imageUrl = imageUrlForCartItem(item);
              const name = productNameForCartItem(item);
              const variantLine = variantTextForCartItem(item);

              const blocked = item.blocked === true;
              const start = item.start_at;
              const end = item.end_at;

              const lineCents = Number(item.unit_price_cents ?? 0) * Number(item.quantity ?? 1);

              return (
                <div className={styles.cartRow} key={String(item.id)}>
                  <div className={styles.cartImgWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={name} className={styles.cartImg} />
                  </div>

                  <div className={styles.cartInfo}>
                    <div className={styles.cartTitle}>{name}</div>
                    {variantLine ? <div className={styles.cartMeta}>{variantLine}</div> : null}
                    <div className={styles.cartMeta}>
                      {start && end
                        ? `${formatRentalDay(start, locale)} → ${formatRentalDay(end, locale, true)}`
                        : t("datesFallback")}
                      {blocked ? ` · ${t("blocked")}` : ""}
                    </div>
                  </div>

                  <div className={styles.cartPrice}>{formatMoneyCents(lineCents, locale, currency)}</div>
                </div>
              );
            })}

            <div className={styles.cartTotalRow}>
              <div className={styles.cartTotalLabel}>{t("total")}</div>
              <div className={styles.cartTotalValue}>
                {formatMoneyCents(Number(cart?.subtotal_cents ?? 0), locale, currency)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3) Pickup person */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>{t("pickupPerson")}</div>
            <div className={styles.cardSubtitle}>{t("pickupPersonSubtitle")}</div>
          </div>

          {!pickupExpanded ? (
            <button
              className={styles.btn}
              onClick={() => {
                setPickupDraft(pickup);
                setPickupExpanded(true);
              }}
            >
              {t("edit")}
            </button>
          ) : null}
        </div>

        {!pickupExpanded ? (
          <div className={styles.summary}>
            <div className={styles.summaryGrid}>
              <SummaryRow
                label={t("pickupBy")}
                value={pickup.enabled ? `${pickup.first_name} ${pickup.last_name}`.trim() || t("dash") : t("sameAsCustomer")}
              />
              {pickup.enabled ? (
                <>
                  <SummaryRow label={t("email")} value={pickup.email || t("dash")} />
                  <SummaryRow label={t("phone")} value={pickup.phone || t("dash")} />
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.expand}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={pickupDraft.enabled}
                onChange={(e) => setPickupDraft((p) => ({ ...p, enabled: e.target.checked }))}
              />
              <span>{t("differentPickupPerson")}</span>
            </label>

            {pickupDraft.enabled ? (
              <div className={styles.expandGrid}>
                <Field
                  id={`${fieldId}-pickup-first_name`}
                  label={t("firstName")}
                  required={pickupDraft.enabled}
                  value={pickupDraft.first_name}
                  onChange={(v) => setPickupDraft((p) => ({ ...p, first_name: v }))}
                  autoComplete="given-name"
                />
                <Field
                  id={`${fieldId}-pickup-last_name`}
                  label={t("lastName")}
                  required={pickupDraft.enabled}
                  value={pickupDraft.last_name}
                  onChange={(v) => setPickupDraft((p) => ({ ...p, last_name: v }))}
                  autoComplete="family-name"
                />
                <Field
                  id={`${fieldId}-pickup-email`}
                  label={t("email")}
                  required={pickupDraft.enabled}
                  type="email"
                  value={pickupDraft.email}
                  onChange={(v) => setPickupDraft((p) => ({ ...p, email: v }))}
                  autoComplete="email"
                />
                <Field
                  id={`${fieldId}-pickup-phone`}
                  label={t("phone")}
                  required={pickupDraft.enabled}
                  placeholder={t("phonePlaceholder")}
                  value={pickupDraft.phone}
                  onChange={(v) => setPickupDraft((p) => ({ ...p, phone: v }))}
                  autoComplete="tel"
                />
              </div>
            ) : (
              <div className={styles.muted}>{t("pickupWillBeCustomer")}</div>
            )}

            <div className={styles.expandActions}>
              <button
                className={styles.btnGhost}
                onClick={() => {
                  setPickupDraft(pickup);
                  setPickupExpanded(false);
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4) Payment (informational — matches checkout API) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>{t("payment")}</div>
            <div className={styles.cardSubtitle}>{t("paymentInfoSubtitle")}</div>
          </div>
        </div>

        <p className={styles.paymentInfo}>{t("paymentInfoBody")}</p>
      </div>

      {/* Terms + Buy */}
      <div className={styles.card}>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={agreed}
            disabled={!termsReady}
            onChange={(e) => {
              const checked = e.target.checked;
              setAgreed(checked);
              if (checked) setCheckoutBanner(null);
            }}
          />
          <span>
            {t("agreePrefix")}{" "}
            <Link className={styles.inlineLink} href={localeHref(locale, "/agbs")}>
              {t("agbs")}
            </Link>{" "}
            {t("agreeMiddle")}{" "}
            <Link className={styles.inlineLink} href={localeHref(locale, "/privacy")}>
              {t("privacyTerms")}
            </Link>
            .
          </span>
        </label>

        {checkoutBanner?.kind === "error" ? (
          <div className={styles.errorBox} role="alert">
            {checkoutBanner.message}
          </div>
        ) : null}
        {checkoutBanner?.kind === "warning" ? (
          <div className={styles.warnBox} role="status">
            <div className={styles.warnText}>{checkoutBanner.message}</div>
          </div>
        ) : null}

        <button
          className={styles.buyBtn}
          disabled={!canBuy}
          onClick={() => void onBuy()}
          title={
            blockedItems.length > 0
              ? t("fixBlockedItemsTitle")
              : items.length === 0
              ? t("cartEmptyTitle")
              : !profileComplete
              ? t("completeProfileTitle")
              : !agreed
              ? t("acceptTermsTitle")
              : ""
          }
        >
          {profileSaving ? t("saving") : t("rent")}
        </button>

        {blockedItems.length > 0 ? (
          <div className={styles.muted}>{t("blockedCheckoutHint")}</div>
        ) : null}
      </div>
    </div>
  );
}
