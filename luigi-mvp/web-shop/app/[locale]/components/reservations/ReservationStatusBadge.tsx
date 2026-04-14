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
    emphasis === "high" ? styles.confirmedHigh : styles.confirmed;
  let label = humanizeStatus(status);

  if (status === "confirmed") {
    toneClass =
      emphasis === "high" ? styles.confirmedHigh : styles.confirmed;
    label = t("confirmed");
  }

  if (status === "out_for_pickup") {
    label = t("out_for_pickup");
  }

  if (status === "in_use") {
    label = t("in_use");
  }

  if (status === "returned") {
    label = t("returned");
  }

  if (status === "serviced") {
    label = t("serviced");
  }

  if (status === "closed") {
    label = t("closed");
  }

  if (status === "expired") {
    label = t("expired");
  }

  if (status === "draft") {
    label = t("draft");
  }

  if (status === "held") {
    label = t("held");
  }

  if (status === "cancelled" || cancelledAt?.Valid) {
    toneClass =
      emphasis === "high" ? styles.cancelledHigh : styles.cancelled;
    label = t("cancelled");
  }

  if (status === "pending") {
    label = t("pending");
  }

  const emphasisClass = emphasis === "high" ? styles.badgeHigh : "";

  const cls = [styles.badge, toneClass, emphasisClass, className].filter(
    Boolean,
  ) as string[];

  return <div className={cls.join(" ")}>{label}</div>;
}

function humanizeStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
