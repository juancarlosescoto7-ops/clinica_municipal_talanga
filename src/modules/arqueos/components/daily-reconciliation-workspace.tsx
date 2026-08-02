import styles from "@/components/shared/operations.module.css";

import { getDailyReconciliationOverview } from "../services/arqueos-overview.service";
import type { ReconciliationStatus } from "../types/arqueos.types";
import { ReconciliationForm } from "./reconciliation-form";
import { ReconciliationSummary } from "./reconciliation-summary";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

function getStatus(status: ReconciliationStatus) {
  if (status === "confirmado") {
    return {
      label: "Confirmado",
      className: styles.statusSuccess,
    };
  }

  if (status === "con_diferencia") {
    return {
      label: "Con diferencia",
      className: styles.statusWarning,
    };
  }

  return {
    label: "Borrador",
    className: styles.statusDraft,
  };
}

export function DailyReconciliationWorkspace() {
  const data = getDailyReconciliationOverview();

  return (
    <div className={styles.module}>
      <header className={styles.moduleHeader}>
        <div>
          <h1>Arqueo diario</h1>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.dateChip}>29 julio 2026</span>
          <button className={styles.primaryButton} type="button">
            Generar arqueo
          </button>
        </div>
      </header>

      <ReconciliationSummary data={data} />

      <div className={styles.contentGrid}>
        <div className={styles.module}>
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>{data.cashSessionCode}</h2>
              </div>
              <span
                className={`${styles.statusBadge} ${styles.statusDraft}`}
              >
                Pendiente de confirmar
              </span>
            </header>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Medio</th>
                    <th>Operaciones</th>
                    <th>Monto</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentRows.map((row) => (
                    <tr key={row.label}>
                      <td>
                        <strong>{row.label}</strong>
                        <small>
                          {row.tone === "cash"
                            ? "Conteo físico"
                            : "Referencias bancarias"}
                        </small>
                      </td>
                      <td>{row.transactions}</td>
                      <td>{formatMoney(row.amount)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${styles.statusInfo}`}
                        >
                          Conciliable
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className={styles.panelFooter}>
              <span>Recibos válidos y anulaciones consideradas</span>
              <strong>{formatMoney(data.totalCollected)}</strong>
            </footer>
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Últimos arqueos</h2>
              </div>
              <button className={styles.ghostButton} type="button">
                Ver todos
              </button>
            </header>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Esperado</th>
                    <th>Declarado</th>
                    <th>Diferencia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((row) => {
                    const status = getStatus(row.status);
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.date}</strong>
                          <small>{row.id}</small>
                        </td>
                        <td>{formatMoney(row.expectedAmount)}</td>
                        <td>{formatMoney(row.declaredAmount)}</td>
                        <td
                          className={
                            row.difference < 0
                              ? styles.amountNegative
                              : styles.amountPositive
                          }
                        >
                          {formatMoney(row.difference)}
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <ReconciliationForm expectedCash={data.expectedCash} />
      </div>
    </div>
  );
}
