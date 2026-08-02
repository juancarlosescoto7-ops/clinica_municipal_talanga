import styles from "@/components/shared/operations.module.css";

import type { DailyReconciliationOverview } from "../types/arqueos.types";

interface ReconciliationSummaryProps {
  data: DailyReconciliationOverview;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

export function ReconciliationSummary({
  data,
}: ReconciliationSummaryProps) {
  return (
    <section className={styles.stats} aria-label="Resumen del arqueo">
      <article className={styles.statCard}>
        <span className={styles.statIcon}>RC</span>
        <div>
          <span>Recibos válidos</span>
          <strong>{data.validReceipts}</strong>
          <small>{data.annulledReceipts} anulados con justificación</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconGold}`}>
          EF
        </span>
        <div>
          <span>Efectivo esperado</span>
          <strong>{formatMoney(data.expectedCash)}</strong>
          <small>Según cierre de caja</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
          TR
        </span>
        <div>
          <span>Transferencias</span>
          <strong>{formatMoney(data.transferAmount)}</strong>
          <small>Referencias registradas</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={styles.statIcon}>Σ</span>
        <div>
          <span>Total cobrado</span>
          <strong>{formatMoney(data.totalCollected)}</strong>
          <small>Base del arqueo diario</small>
        </div>
      </article>
    </section>
  );
}
