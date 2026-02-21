"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./checkout.module.css";

import { useAuth } from "@/components/auth/AuthContext";
import { useCart } from "@/components/cart/CartContext";

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

type PaymentMethod = "pay_at_pickup" | "credit_card" | "bank_transfer" | "twint" | "paypal";

function missingRequired(v: CustomerProfile): Array<keyof CustomerProfile> {
  return REQUIRED.filter((k) => !String(v[k] ?? "").trim());
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
    default:
      return k.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
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

function formatDate(d: string) {
  return new Intl.DateTimeFormat("de-CH").format(new Date(d));
}

function formatMoneyCents(cents: number, currency: string) {
  return new Intl.NumberFormat("de-CH", { style: "currency", currency }).format(cents / 100);
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
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className={styles.field}>
      <div className={styles.fieldLabel}>
        {label} {required ? <span className={styles.req}>*</span> : null}
      </div>
      <input
        className={styles.input}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { me, loading: authLoading } = useAuth();

  const {
    cart,
    loading: cartLoading,
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

  // pickup + payment + terms
  const [pickupExpanded, setPickupExpanded] = React.useState(false);
  const [pickup, setPickup] = React.useState<PickupPerson>({
    enabled: false,
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const [payment, setPayment] = React.useState<PaymentMethod>("pay_at_pickup");
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
        if (!cancelled) setProfileError(e?.message ?? "Failed to load profile");
      } finally {
        if (!cancelled) setLoadingCustomer(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const missing = missingRequired(customer);
  const missingDraft = missingRequired(profileDraft);
  const profileComplete = missing.length === 0;

  async function onContinueProfile() {
    setProfileError(null);

    if (missingDraft.length > 0) {
      setProfileError(`Please fill: ${missingDraft.map(labelFor).join(", ")}`);
      return;
    }

    setProfileSaving(true);
    try {
      const saved = await saveCustomer(profileDraft);
      setCustomer(saved);
      setProfileDraft(saved);
      setProfileExpanded(false);
    } catch (e: any) {
      setProfileError(e?.message ?? "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  const canBuy =
    !authLoading &&
    !!me &&
    profileComplete &&
    agreed &&
    items.length > 0 &&
    canCheckout; 

    async function onBuy() {
      if (!agreed) {
        alert("Please accept terms");
        return;
      }
    
      const idempotencyKey = crypto.randomUUID();

      const customerName = `${customer.first_name} ${customer.last_name}`.trim();

      const pickupPersonName = pickup.enabled
        ? `${pickup.first_name.trim()} ${pickup.last_name.trim()}`.trim()
        : customerName;

      const pickupPersonEmail = pickup.enabled ? pickup.email.trim() : customer.email.trim();
      const pickupPersonPhone = pickup.enabled ? pickup.phone.trim() : customer.phone.trim();

      const payload = {
        shop_id: me?.shop_id,
        store_id: cart?.store_id,
        idempotency_key: idempotencyKey,
        notes: customer.notes?.trim() || null,

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
          alert("Checkout failed");
          return;
        }
    
        router.push(`/checkout/confirmation?success=1`);
      } catch (err) {
        console.error(err);
        alert("Unexpected error");
      }
    }

  if (authLoading) return <div className={styles.page}>Loading…</div>;

  if (!me) {
    return (
      <div className={styles.page}>
        <h1 className={styles.h1}>Checkout</h1>
        <p className={styles.muted}>Please sign in to continue.</p>
        <Link className={styles.link} href="/cart">
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.h1}>Checkout</h1>
        <Link className={styles.link} href="/cart">
          Back to cart
        </Link>
      </div>

      {/* 1) Profile section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Your details</div>
            <div className={styles.cardSubtitle}>Used for pickup and billing.</div>
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
              {profileComplete ? "Edit" : "Complete"}
            </button>
          ) : null}
        </div>

        {!profileExpanded ? (
          <div className={styles.summary}>
            {missing.length > 0 ? (
              <div className={styles.warnBox}>
                <div className={styles.warnTitle}>Profile incomplete</div>
                <div className={styles.warnText}>
                  Please add: {missing.map(labelFor).join(", ")}
                </div>
              </div>
            ) : null}

            <div className={styles.summaryGrid}>
              <SummaryRow label="Name" value={`${customer.first_name} ${customer.last_name}`.trim() || "—"} />
              <SummaryRow label="Email" value={customer.email || "—"} />
              <SummaryRow label="Phone" value={customer.phone || "—"} />
              <SummaryRow
                label="Address"
                value={
                  customer.address1
                    ? `${customer.address1}${customer.postal_code || customer.city ? `, ${customer.postal_code} ${customer.city}` : ""}`
                    : "—"
                }
              />
            </div>
          </div>
        ) : (
          <div className={styles.expand}>
            <div className={styles.expandGrid}>
              <Field label="First name" required value={profileDraft.first_name} onChange={(v) => setProfileDraft((p) => ({ ...p, first_name: v }))} disabled={profileSaving} />
              <Field label="Last name" required value={profileDraft.last_name} onChange={(v) => setProfileDraft((p) => ({ ...p, last_name: v }))} disabled={profileSaving} />
              <Field label="Email" required type="email" value={profileDraft.email} onChange={(v) => setProfileDraft((p) => ({ ...p, email: v }))} disabled={profileSaving} />
              <Field label="Phone" required placeholder="+41 …" value={profileDraft.phone} onChange={(v) => setProfileDraft((p) => ({ ...p, phone: v }))} disabled={profileSaving} />
              <Field label="Address line 1" required value={profileDraft.address1} onChange={(v) => setProfileDraft((p) => ({ ...p, address1: v }))} disabled={profileSaving} />
              <Field label="Postal code" required value={profileDraft.postal_code} onChange={(v) => setProfileDraft((p) => ({ ...p, postal_code: v }))} disabled={profileSaving} />
              <Field label="City" required value={profileDraft.city} onChange={(v) => setProfileDraft((p) => ({ ...p, city: v }))} disabled={profileSaving} />
              <Field label="Country" placeholder="CH" value={profileDraft.country} onChange={(v) => setProfileDraft((p) => ({ ...p, country: v }))} disabled={profileSaving} />
              <Field label="Address line 2" value={profileDraft.address2} onChange={(v) => setProfileDraft((p) => ({ ...p, address2: v }))} disabled={profileSaving} />
            </div>

            {profileError ? <div className={styles.errorBox}>{profileError}</div> : null}

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
                Cancel
              </button>

              <button
                className={styles.btnPrimary}
                onClick={onContinueProfile}
                disabled={profileSaving || missingDraft.length > 0}
                title={missingDraft.length > 0 ? `Missing: ${missingDraft.map(labelFor).join(", ")}` : ""}
              >
                {profileSaving ? "Saving…" : "Continue"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1.1) Pick-up location */}
      {store_name && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Pick-up location</div>
              <div className={styles.cardSubtitle}>
                This is where you will collect your bikes.
              </div>
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                <div className={styles.summaryLabel}>Store</div>
                <div className={styles.summaryValue}>{store_name}</div>
              </div>

              {(store_address || store_postalcode || store_city) && (
                <div className={styles.summaryRow}>
                  <div className={styles.summaryLabel}>Address</div>
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
            <div className={styles.cardTitle}>Cart summary</div>
            <div className={styles.cardSubtitle}>Items, dates, pickup location, total.</div>
          </div>
        </div>

        {blockedItems.length > 0 ? (
          <div className={styles.warnBox}>
            <div className={styles.warnTitle}>Some items are blocked</div>
            <div className={styles.warnText}>
              Please fix blocked items in your cart before checkout.
            </div>
          </div>
        ) : null}

        {cartLoading ? (
          <div className={styles.muted}>Loading cart…</div>
        ) : items.length === 0 ? (
          <div className={styles.muted}>Your cart is empty.</div>
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
                      {start && end ? `${formatDate(start)} → ${formatDate(end)}` : "Dates: —"}
                      {blocked ? " · Blocked" : ""}
                    </div>
                  </div>

                  <div className={styles.cartPrice}>{formatMoneyCents(lineCents, currency)}</div>
                </div>
              );
            })}

            <div className={styles.cartTotalRow}>
              <div className={styles.cartTotalLabel}>Total</div>
              <div className={styles.cartTotalValue}>
                {formatMoneyCents(Number(cart?.subtotal_cents ?? 0), currency)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3) Pickup person */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Pickup person</div>
            <div className={styles.cardSubtitle}>Optional: someone else can pick up the bikes.</div>
          </div>

          <button className={styles.btn} onClick={() => setPickupExpanded((v) => !v)}>
            {pickupExpanded ? "Collapse" : "Edit"}
          </button>
        </div>

        {!pickupExpanded ? (
          <div className={styles.summary}>
            <div className={styles.summaryGrid}>
              <SummaryRow
                label="Pickup by"
                value={pickup.enabled ? `${pickup.first_name} ${pickup.last_name}`.trim() || "—" : "Same as customer"}
              />
              {pickup.enabled ? (
                <>
                  <SummaryRow label="Email" value={pickup.email || "—"} />
                  <SummaryRow label="Phone" value={pickup.phone || "—"} />
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.expand}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={pickup.enabled}
                onChange={(e) => setPickup((p) => ({ ...p, enabled: e.target.checked }))}
              />
              <span>Set a different pickup person</span>
            </label>

            {pickup.enabled ? (
              <div className={styles.expandGrid}>
                <Field label="First name" value={pickup.first_name} onChange={(v) => setPickup((p) => ({ ...p, first_name: v }))} />
                <Field label="Last name" value={pickup.last_name} onChange={(v) => setPickup((p) => ({ ...p, last_name: v }))} />
                <Field label="Email" type="email" value={pickup.email} onChange={(v) => setPickup((p) => ({ ...p, email: v }))} />
                <Field label="Phone" value={pickup.phone} onChange={(v) => setPickup((p) => ({ ...p, phone: v }))} />
              </div>
            ) : (
              <div className={styles.muted}>Pickup person will be the customer.</div>
            )}
          </div>
        )}
      </div>

      {/* 4) Payment method */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Payment</div>
            <div className={styles.cardSubtitle}>Choose how you want to pay.</div>
          </div>
        </div>

        <div className={styles.radioList}>
          {[
            { v: "pay_at_pickup", label: "Pay at pickup" },
            { v: "credit_card", label: "Credit card" },
            { v: "bank_transfer", label: "Transfer before pickup" },
            { v: "twint", label: "TWINT" },
            { v: "paypal", label: "PayPal" },
          ].map((o) => (
            <label key={o.v} className={styles.radioRow}>
              <input
                type="radio"
                name="payment"
                value={o.v}
                checked={payment === (o.v as PaymentMethod)}
                onChange={() => setPayment(o.v as PaymentMethod)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Terms + Buy */}
      <div className={styles.card}>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            I agree to the{" "}
            <Link className={styles.inlineLink} href="/agbs">
              AGBs
            </Link>{" "}
            and the{" "}
            <Link className={styles.inlineLink} href="/privacy">
              Privacy terms
            </Link>
            .
          </span>
        </label>

        <button
          className={styles.buyBtn}
          disabled={!canBuy}
          onClick={onBuy}
          title={
            !canCheckout
              ? "Fix blocked items in cart"
              : !profileComplete
              ? "Complete your profile first"
              : !agreed
              ? "Accept AGBs and privacy terms"
              : items.length === 0
              ? "Cart is empty"
              : ""
          }
        >
          Rent
        </button>

        {!canCheckout ? <div className={styles.muted}>Your cart has blocked items — fix them before checkout.</div> : null}
      </div>
    </div>
  );
}
