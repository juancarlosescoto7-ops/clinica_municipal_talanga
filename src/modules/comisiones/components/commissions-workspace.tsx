import styles from "@/components/shared/operations.module.css";

import { getCommissionsOverview } from "../services/comisiones-overview.service";
import type { CommissionStatus } from "../types/comisiones.types";
import { CommissionLiquidationPanel } from "./commission-liquidation-panel";
import { CommissionSummary } from "./commission-summary";
import { ProviderCommissionsTable } from "./provider-commissions-table";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

function getStatus(status: CommissionStatus) {
  if (status === "liquidada") {
    return {
      label: "Liquidada",
      className: styles.statusSuccess,
    };
  }

  if (status === "en_revision") {
    return {
      label: "En revisión",
      className: styles.statusInfo,
    };
  }

  return {
    label: "Pendiente",
    className: styles.statusDraft,
  };
}

export function CommissionsWorkspace() {
  const data = getCommissionsOverview();

  return (
    <div className={styles.module}>
      <header className={styles.moduleHeader}>
        <div>
          <h1>Comisiones</h1>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.field}>
            <span>Período</span>
            <select defaultValue="2026-07">
              <option value="2026-07">Julio 2026</option>
              <option value="2026-06">Junio 2026</option>
            </select>
          </label>
          <button className={styles.primaryButton} type="button">
            Generar cálculo
          </button>
        </div>
      </header>

      <CommissionSummary data={data} />

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <h2>{data.period}</h2>
          </div>
          <span
            className={`${styles.statusBadge} ${styles.statusInfo}`}
          >
            En revisión
          </span>
        </header>
        <ProviderCommissionsTable rows={data.providers} />
        <footer className={styles.panelFooter}>
          <span>
            Tarifas aplicadas al período seleccionado.
          </span>
          <strong>{formatMoney(data.accruedAmount)}</strong>
        </footer>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Períodos recientes</h2>
            </div>
            <button className={styles.ghostButton} type="button">
              Ver historial
            </button>
          </header>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPeriods.map((period) => {
                  const status = getStatus(period.status);
                  return (
                    <tr key={period.id}>
                      <td>
                        <strong>{period.label}</strong>
                        <small>{period.id}</small>
                      </td>
                      <td>{formatMoney(period.totalAmount)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <button className={styles.ghostButton} type="button">
                          Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <CommissionLiquidationPanel
          providers={data.providers}
        />
      </div>
    </div>
  );
}
