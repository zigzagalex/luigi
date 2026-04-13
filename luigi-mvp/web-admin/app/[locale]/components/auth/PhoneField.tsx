"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useTranslations } from "next-intl";
import styles from "./PhoneField.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  onValidityChange?: (valid: boolean) => void;
  disabled?: boolean;
};

function normalizeE164ish(v: string) {
  let s = v.replace(/[^\d+]/g, "");
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
  disabled,
}: Props) {
  const t = useTranslations("phoneField");
  return (
    <PhoneInput
      international
      defaultCountry={defaultCountry as never}
      countryCallingCodeEditable={false}
      value={value ? value : undefined}
      onChange={(v) => {
        const next = normalizeE164ish(v ?? "");
        onChange(next);
        onValidityChange?.(next ? isValidPhoneNumber(next) : false);
      }}
      className={styles.phone}
      disabled={disabled}
      numberInputProps={{
        inputMode: "tel",
        pattern: "[0-9+]*",
      }}
      placeholder={t("placeholder")}
    />
  );
}
