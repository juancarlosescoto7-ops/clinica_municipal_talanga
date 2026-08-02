import styles from "@/components/shared/operations.module.css";

import type {
  ReportCatalogItem,
  ReportKind,
} from "../types/reportes.types";

interface ReportCatalogProps {
  items: readonly ReportCatalogItem[];
  onSelect: (kind: ReportKind) => void;
  selected: ReportKind;
}

export function ReportCatalog({
  items,
  onSelect,
  selected,
}: ReportCatalogProps) {
  return (
    <section className={styles.reportGrid} aria-label="Catálogo de reportes">
      {items.map((item) => (
        <button
          className={`${styles.reportCard}${
            selected === item.id ? ` ${styles.reportCardActive}` : ""
          }`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span className={styles.reportCardTop}>
            <span className={styles.reportCardIcon}>{item.code}</span>
            <span className={styles.categoryChip}>{item.category}</span>
          </span>
          <span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </span>
        </button>
      ))}
    </section>
  );
}
