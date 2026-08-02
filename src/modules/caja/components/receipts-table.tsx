import type { ReceiptRecord } from "../types/caja.types";
import {
  formatDate,
  formatDateTime,
  formatHnlFromCents,
  getPaymentMethodLabel,
  getReceiptStatusLabel,
} from "../utils/caja-formatters";

import styles from "./caja.module.css";

interface ReceiptsTableProps {
  canAnnul: boolean;
  onAnnul: (receiptId: string) => void;
  receipts: readonly ReceiptRecord[];
}

export function ReceiptsTable({
  canAnnul,
  onAnnul,
  receipts,
}: ReceiptsTableProps) {
  const sortedReceipts = [...receipts].sort((left, right) =>
    right.issuedAt.localeCompare(left.issuedAt),
  );

  if (sortedReceipts.length === 0) {
    return (
      <div className={styles.compactEmpty}>
        <p>Los recibos emitidos durante la sesión aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Recibo</th>
            <th>Paciente</th>
            <th>Método</th>
            <th>Total</th>
            <th>Estado</th>
            <th>
              <span className={styles.visuallyHidden}>Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedReceipts.map((receipt) => (
            <tr key={receipt.id}>
              <td>
                <strong className={styles.receiptNumber}>
                  {receipt.localNumber}
                </strong>
                <small className={styles.secondaryCell}>
                  {formatDateTime(receipt.issuedAt)}
                </small>
              </td>
              <td>
                <strong className={styles.primaryCell}>
                  {receipt.patientName}
                </strong>
                <small className={styles.secondaryCell}>
                  {receipt.attentionNumber}
                </small>
              </td>
              <td>
                <strong className={styles.primaryCell}>
                  {getPaymentMethodLabel(receipt.method)}
                </strong>
                {receipt.method === "transferencia" ? (
                  <small className={styles.secondaryCell}>
                    {receipt.bank} · {receipt.transferReference}
                    {receipt.transferDate
                      ? ` · ${formatDate(receipt.transferDate)}`
                      : ""}
                  </small>
                ) : (
                  <small className={styles.secondaryCell}>
                    Cambio{" "}
                    {formatHnlFromCents(receipt.changeCents ?? 0)}
                  </small>
                )}
              </td>
              <td>
                <strong className={styles.receiptAmount}>
                  {formatHnlFromCents(receipt.totalCents)}
                </strong>
              </td>
              <td>
                <span
                  className={`${styles.statusBadge} ${
                    receipt.status === "valido"
                      ? styles.statusValid
                      : styles.statusAnnulled
                  }`}
                >
                  <span aria-hidden="true" />
                  {getReceiptStatusLabel(receipt.status)}
                </span>
              </td>
              <td>
                {receipt.status === "valido" && canAnnul ? (
                  <button
                    className={styles.annulButton}
                    onClick={() => onAnnul(receipt.id)}
                    type="button"
                  >
                    Anular
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

