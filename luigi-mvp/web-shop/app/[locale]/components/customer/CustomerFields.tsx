"use client";

import * as React from "react";
import type { CustomerProfile } from "@/types/customer";

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: "#444" }}>{children}</span>;
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <Label>{props.label}</Label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        disabled={props.disabled}
        style={{
          height: 42,
          borderRadius: 12,
          border: "1px solid #e6e6e6",
          padding: "0 12px",
          outline: "none",
          background: props.disabled ? "#fafafa" : "white",
        }}
      />
    </label>
  );
}

function TextArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <Label>{props.label}</Label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        disabled={props.disabled}
        rows={4}
        style={{
          borderRadius: 12,
          border: "1px solid #e6e6e6",
          padding: 12,
          outline: "none",
          resize: "vertical",
          background: props.disabled ? "#fafafa" : "white",
        }}
      />
    </label>
  );
}

export function CustomerFields(props: {
  value: CustomerProfile;
  onChange: (next: CustomerProfile) => void;
  disabled?: boolean;
}) {
  const v = props.value;
  const set = <K extends keyof CustomerProfile>(key: K, val: CustomerProfile[K]) => {
    props.onChange({ ...v, [key]: val });
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Contact</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input
            label="First name"
            value={v.first_name}
            onChange={(x) => set("first_name", x)}
            autoComplete="given-name"
            disabled={props.disabled}
          />
          <Input
            label="Last name"
            value={v.last_name}
            onChange={(x) => set("last_name", x)}
            autoComplete="family-name"
            disabled={props.disabled}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input
            label="Email"
            value={v.email}
            onChange={(x) => set("email", x)}
            type="email"
            autoComplete="email"
            disabled={props.disabled}
          />
          <Input
            label="Phone"
            value={v.phone}
            onChange={(x) => set("phone", x)}
            autoComplete="tel"
            placeholder="+41 …"
            disabled={props.disabled}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Address</div>

        <Input
          label="Address line 1"
          value={v.address1}
          onChange={(x) => set("address1", x)}
          autoComplete="address-line1"
          disabled={props.disabled}
        />
        <Input
          label="Address line 2"
          value={v.address2}
          onChange={(x) => set("address2", x)}
          autoComplete="address-line2"
          disabled={props.disabled}
        />

        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 12 }}>
          <Input
            label="Postal code"
            value={v.postal_code}
            onChange={(x) => set("postal_code", x)}
            autoComplete="postal-code"
            disabled={props.disabled}
          />
          <Input
            label="City"
            value={v.city}
            onChange={(x) => set("city", x)}
            autoComplete="address-level2"
            disabled={props.disabled}
          />
          <Input
            label="Country"
            value={v.country}
            onChange={(x) => set("country", x)}
            autoComplete="country"
            placeholder="CH"
            disabled={props.disabled}
          />
        </div>
      </div>

      <TextArea
        label="Notes (optional)"
        value={v.notes}
        onChange={(x) => set("notes", x)}
        placeholder="Delivery notes, preferences…"
        disabled={props.disabled}
      />
    </div>
  );
}
