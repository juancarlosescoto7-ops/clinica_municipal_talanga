import styles from "@/components/shared/operations.module.css";

import type { ReportRow } from "../types/reportes.types";

interface ReportTableProps {
  rows: readonly ReportRow[];
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

export function ReportTable({ rows }: ReportTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Registro</th>
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Detalle</th>
            <th>Estado</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.id}</strong>
              </td>
              <td>{row.date}</td>
              <td>{row.concept}</td>
              <td>{row.detail}</td>
              <td>
                <span
                  className={`${styles.statusBadge} ${styles.statusInfo}`}
                >
                  {row.status}
                </span>
              </td>
              <td>
                {row.amount === null ? "—" : formatMoney(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
