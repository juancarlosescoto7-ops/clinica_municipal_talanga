import styles from "@/components/shared/operations.module.css";

import type { CommissionsOverview } from "../types/comisiones.types";

interface CommissionSummaryProps {
  data: CommissionsOverview;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

export function CommissionSummary({ data }: CommissionSummaryProps) {
  return (
    <section className={styles.stats} aria-label="Resumen de comisiones">
      <article className={styles.statCard}>
        <span className={styles.statIcon}>SV</span>
        <div>
          <span>Servicios pagados computados</span>
          <strong>{data.totalPaidServices}</strong>
          <small>Obligaciones a proveedores</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconGold}`}>
          AC
        </span>
        <div>
          <span>Comisión acumulada</span>
          <strong>{formatMoney(data.accruedAmount)}</strong>
          <small>Cálculo ilustrativo</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
          LI
        </span>
        <div>
          <span>Liquidado</span>
          <strong>{formatMoney(data.liquidatedAmount)}</strong>
          <small>Período actual</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconRed}`}>
          PD
        </span>
        <div>
          <span>Pendiente</span>
          <strong>{formatMoney(data.pendingAmount)}</strong>
          <small>Requiere revisión</small>
        </div>
      </article>
    </section>
  );
}
