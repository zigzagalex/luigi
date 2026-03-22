"use client";

import styles from "./ReservationStatusBadge.module.css";
import { useTranslations } from "next-intl";

type Props = {
  status: string;
  cancelledAt: any;
  emphasis?: "default" | "high";
  className?: string;
};

export default function ReservationStatusBadge({
  status,
  cancelledAt,
  emphasis = "default",
  className,
}: Props) {
  const t = useTranslations("reservationStatus");
  let toneClass =
    emphasis === "high" ? styles.defaultHigh : styles.default;
  let label = status;

  if (status === "confirmed") {
    toneClass =
      emphasis === "high" ? styles.confirmedHigh : styles.confirmed;
    label = t("confirmed");
  }

  if (status === "cancelled" || cancelledAt?.Valid) {
    toneClass =
      emphasis === "high" ? styles.cancelledHigh : styles.cancelled;
    label = t("cancelled");
  }

  if (status === "pending") {
    toneClass = emphasis === "high" ? styles.pendingHigh : styles.pending;
    label = t("pending");
  }

  const emphasisClass = emphasis === "high" ? styles.badgeHigh : "";

  const cls = [styles.badge, toneClass, emphasisClass, className].filter(
    Boolean,
  ) as string[];

  return <div className={cls.join(" ")}>{label}</div>;
}
