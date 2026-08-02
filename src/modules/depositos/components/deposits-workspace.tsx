import styles from "@/components/shared/operations.module.css";

import { getDepositsOverview } from "../services/depositos-overview.service";
import type { DepositStatus } from "../types/depositos.types";
import { DepositRegistrationPanel } from "./deposit-registration-panel";
import { DepositSummary } from "./deposit-summary";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

function getStatus(status: DepositStatus) {
  if (status === "conciliado") {
    return {
      label: "Conciliado",
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
    label: "Pendiente",
    className: styles.statusDraft,
  };
}

export function DepositsWorkspace() {
  const data = getDepositsOverview();

  return (
    <div className={styles.module}>
      <header className={styles.moduleHeader}>
        <div>
          <h1>Depósitos</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button">
            Ver pendientes
          </button>
          <button className={styles.primaryButton} type="button">
            Nuevo depósito
          </button>
        </div>
      </header>

      <DepositSummary data={data} />

      <div className={styles.contentGrid}>
        <div className={styles.module}>
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Arqueos disponibles</h2>
              </div>
              <span className={styles.dateChip}>Julio 2026</span>
            </header>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Arqueo</th>
                    <th>Fecha</th>
                    <th>Disponible</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sourceReconciliations.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.id}</strong>
                      </td>
                      <td>{row.date}</td>
                      <td>{formatMoney(row.availableAmount)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            row.status === "disponible"
                              ? styles.statusDraft
                              : styles.statusSuccess
                          }`}
                        >
                          {row.status === "disponible"
                            ? "Disponible"
                            : "Incluido"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Historial de depósitos</h2>
              </div>
              <button className={styles.ghostButton} type="button">
                Filtrar
              </button>
            </header>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Depósito</th>
                    <th>Banco / referencia</th>
                    <th>Esperado</th>
                    <th>Depositado</th>
                    <th>Diferencia</th>
                    <th>Estado</th>
                    <th>Evidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((row) => {
                    const status = getStatus(row.status);
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.id}</strong>
                          <small>{row.depositDate}</small>
                        </td>
                        <td>
                          <strong>{row.bank}</strong>
                          <small>{row.reference}</small>
                        </td>
                        <td>{formatMoney(row.expectedAmount)}</td>
                        <td>{formatMoney(row.depositedAmount)}</td>
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
                        <td>{row.hasEvidence ? "Adjunta" : "Pendiente"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <DepositRegistrationPanel expectedAmount={data.pendingAmount} />
      </div>
    </div>
  );
}
