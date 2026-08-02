import styles from "@/components/shared/operations.module.css";

import type {
  CommissionProviderRow,
  CommissionStatus,
} from "../types/comisiones.types";

interface ProviderCommissionsTableProps {
  rows: readonly CommissionProviderRow[];
}

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

export function ProviderCommissionsTable({
  rows,
}: ProviderCommissionsTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Servicio</th>
            <th>Servicios pagados</th>
            <th>Tarifa ilustrativa</th>
            <th>Bruto</th>
            <th>Ajustes</th>
            <th>Neto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = getStatus(row.status);
            return (
              <tr key={row.id}>
                <td>
                  <strong>{row.providerName}</strong>
                  <small>{row.id}</small>
                </td>
                <td>{row.serviceName}</td>
                <td>{row.paidServices}</td>
                <td>{formatMoney(row.unitRate)}</td>
                <td>{formatMoney(row.grossAmount)}</td>
                <td>{formatMoney(row.adjustments)}</td>
                <td className={styles.amountPositive}>
                  {formatMoney(row.netAmount)}
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
  );
}
