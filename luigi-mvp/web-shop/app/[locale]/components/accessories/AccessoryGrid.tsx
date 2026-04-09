import type { Accessory } from "@/../utils/accessories";
import AccessoryCard from "./AccessoryCard";
import styles from "./AccessoryGrid.module.css";

type Props = {
  accessories: Accessory[];
};

export default function AccessoryGrid({ accessories }: Props) {
  if (!accessories.length) return null;
  return (
    <div className={styles.grid}>
      {accessories.map((accessory) => (
        <AccessoryCard key={accessory.id} accessory={accessory} />
      ))}
    </div>
  );
}
