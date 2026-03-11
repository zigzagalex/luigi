"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useTranslations } from "next-intl";
import styles from "./PhoneField.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string; // e.g. "CH"
  onValidityChange?: (valid: boolean) => void;
};

function normalizeE164ish(v: string) {
  // keep only digits and "+"
  let s = v.replace(/[^\d+]/g, "");

  // allow at most one "+" and only at the start
  if (s.includes("+")) {
    s = (s.startsWith("+") ? "+" : "") + s.replace(/\+/g, "");
  }
  return s;
}

export default function PhoneField({
  value,
  onChange,
  defaultCountry = "CH",
  onValidityChange,
}: Props) {
  const t = useTranslations("phoneField");
  return (
    <PhoneInput
      international
      defaultCountry={defaultCountry as any}
      countryCallingCodeEditable={false}
      value={value ? value : undefined}
      onChange={(v) => {
        const next = normalizeE164ish(v ?? "");
        onChange(next);
        onValidityChange?.(next ? isValidPhoneNumber(next) : false);
      }}
      className={styles.phone}
      numberInputProps={{
        inputMode: "tel",
        pattern: "[0-9+]*",
      }}
      placeholder={t("placeholder")}
    />
  );
}
