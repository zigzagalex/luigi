"use client";

import styles from "./ReservationStatusBadge.module.css";
import { useTranslations } from "next-intl";

type Props = {
  status: string;
  cancelledAt: any;
};

export default function ReservationStatusBadge({
  status,
  cancelledAt,
}: Props) {
  const t = useTranslations("reservationStatus");
  let className = styles.default;
  let label = status;

  if (status === "confirmed") {
    className = styles.confirmed;
    label = t("confirmed");
  }

  if (status === "cancelled" || cancelledAt?.Valid) {
    className = styles.cancelled;
    label = t("cancelled");
  }

  if (status === "pending") {
    className = styles.pending;
    label = t("pending");
  }

  return <div className={`${styles.badge} ${className}`}>{label}</div>;
}
