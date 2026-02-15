import { ReservationItem } from "@/lib/reservationClient";
import styles from "./ReservationItemsPreview.module.css";

type Props = {
  items: ReservationItem[];
};

export default function ReservationItemsPreview({ items }: Props) {
  const preview = items.slice(0, 3);

  return (
    <div className={styles.container}>
      {preview.map((item) => (
        <div key={item.id} className={styles.item}>
          <div className={styles.image} />
          <div className={styles.meta}>
            <div className={styles.price}>
              CHF {(item.unit_price_cents / 100).toFixed(2)}
            </div>
            <div className={styles.quantity}>
              {item.quantity}×
            </div>
          </div>
        </div>
      ))}

      {items.length > 3 && (
        <div className={styles.more}>
          +{items.length - 3} more
        </div>
      )}
    </div>
  );
}
