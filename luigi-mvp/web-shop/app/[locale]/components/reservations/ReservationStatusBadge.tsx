import styles from "./ReservationStatusBadge.module.css";

type Props = {
  status: string;
  cancelledAt: any;
};

export default function ReservationStatusBadge({
  status,
  cancelledAt,
}: Props) {
  let className = styles.default;
  let label = status;

  if (status === "confirmed") {
    className = styles.confirmed;
    label = "Confirmed";
  }

  if (status === "cancelled" || cancelledAt?.Valid) {
    className = styles.cancelled;
    label = "Cancelled";
  }

  if (status === "pending") {
    className = styles.pending;
    label = "Pending payment";
  }

  return <div className={`${styles.badge} ${className}`}>{label}</div>;
}
