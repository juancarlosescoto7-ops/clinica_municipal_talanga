import styles from "@/components/shared/operations.module.css";

import type { DepositOverview } from "../types/depositos.types";

interface DepositSummaryProps {
  data: DepositOverview;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

export function DepositSummary({ data }: DepositSummaryProps) {
  return (
    <section className={styles.stats} aria-label="Resumen de depósitos">
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconGold}`}>
          PD
        </span>
        <div>
          <span>Pendiente de depositar</span>
          <strong>{formatMoney(data.pendingAmount)}</strong>
          <small>Arqueos disponibles</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={styles.statIcon}>BM</span>
        <div>
          <span>Depositado este mes</span>
          <strong>{formatMoney(data.depositedThisMonth)}</strong>
          <small>Acumulado del período</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
          CN
        </span>
        <div>
          <span>Por conciliar</span>
          <strong>{data.pendingReconciliations}</strong>
          <small>Registro pendiente</small>
        </div>
      </article>
      <article className={styles.statCard}>
        <span className={`${styles.statIcon} ${styles.statIconRed}`}>
          Δ
        </span>
        <div>
          <span>Diferencia mensual</span>
          <strong>{formatMoney(data.differenceThisMonth)}</strong>
          <small>Requiere justificación</small>
        </div>
      </article>
    </section>
  );
}
