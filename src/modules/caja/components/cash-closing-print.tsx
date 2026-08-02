import { MunicipalLogo } from "@/components/shared/municipal-logo";
import type {
  CashRegisterState,
  ReceiptRecord,
} from "../types/caja.types";
import {
  formatDate,
  formatDateTime,
  formatHnlFromCents,
  getPaymentMethodLabel,
} from "../utils/caja-formatters";

import styles from "./cash-closing-print.module.css";

interface CashClosingPrintProps {
  state: CashRegisterState;
}

function getPaymentDetail(receipt: ReceiptRecord): string {
  if (receipt.method === "transferencia") {
    return [
      receipt.bank,
      receipt.transferReference
        ? `Ref. ${receipt.transferReference}`
        : null,
      receipt.transferDate ? formatDate(receipt.transferDate) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return [
    `Recibido ${formatHnlFromCents(receipt.cashReceivedCents ?? 0)}`,
    `Cambio ${formatHnlFromCents(receipt.changeCents ?? 0)}`,
  ].join(" · ");
}

export function CashClosingPrint({ state }: CashClosingPrintProps) {
  const session = state.session;

  if (!session || session.status !== "cerrada" || !session.closedAt) {
    return null;
  }

  const validReceipts = state.receipts
    .filter((receipt) => receipt.status === "valido")
    .sort((left, right) => left.issuedAt.localeCompare(right.issuedAt));
  const annulledReceipts = state.receipts
    .filter((receipt) => receipt.status === "anulado")
    .sort((left, right) => left.issuedAt.localeCompare(right.issuedAt));
  const cashReceipts = validReceipts.filter(
    (receipt) => receipt.method === "efectivo",
  );
  const transferReceipts = validReceipts.filter(
    (receipt) => receipt.method === "transferencia",
  );
  const cashCollectedCents = cashReceipts.reduce(
    (total, receipt) => total + receipt.totalCents,
    0,
  );
  const transferCollectedCents = transferReceipts.reduce(
    (total, receipt) => total + receipt.totalCents,
    0,
  );
  const totalCollectedCents = cashCollectedCents + transferCollectedCents;
  const differenceCents = session.differenceCents ?? 0;
  const statusLabel =
    differenceCents === 0 ? "Cuadrado" : "Con diferencia";

  return (
    <article
      aria-label="Cierre y arqueo diario para impresión"
      className={styles.printRoot}
    >
      <header className={styles.documentHeader}>
        <div className={styles.brandBlock}>
          <MunicipalLogo
            alt="Escudo de la Municipalidad de Talanga"
            className={styles.municipalLogo}
            height={50}
            width={48}
          />
          <div>
            <span className={styles.organization}>
              SIEMC · Clínica Municipal
            </span>
            <h1>Cierre de caja y arqueo diario</h1>
            <p>Detalle consolidado de la sesión y sus movimientos.</p>
          </div>
        </div>
        <div className={styles.documentStatus}>
          <span>Estado del arqueo</span>
          <strong>{statusLabel}</strong>
        </div>
      </header>

      <dl className={styles.identityGrid}>
        <div>
          <dt>Caja</dt>
          <dd>{session.code}</dd>
        </div>
        <div>
          <dt>Apertura</dt>
          <dd>{formatDateTime(session.openedAt)}</dd>
        </div>
        <div>
          <dt>Cierre</dt>
          <dd>{formatDateTime(session.closedAt)}</dd>
        </div>
        <div className={styles.sessionIdentifier}>
          <dt>Identificador de sesión</dt>
          <dd>{session.id}</dd>
        </div>
      </dl>

      <section className={styles.section}>
        <h2>Resumen del cierre</h2>
        <dl className={styles.summaryGrid}>
          <div>
            <dt>Fondo inicial</dt>
            <dd>{formatHnlFromCents(session.openingAmountCents)}</dd>
          </div>
          <div>
            <dt>Cobros en efectivo</dt>
            <dd>{formatHnlFromCents(cashCollectedCents)}</dd>
          </div>
          <div>
            <dt>Transferencias</dt>
            <dd>{formatHnlFromCents(transferCollectedCents)}</dd>
          </div>
          <div>
            <dt>Total cobrado</dt>
            <dd>{formatHnlFromCents(totalCollectedCents)}</dd>
          </div>
          <div>
            <dt>Efectivo esperado</dt>
            <dd>{formatHnlFromCents(session.expectedCashCents ?? 0)}</dd>
          </div>
          <div>
            <dt>Efectivo declarado</dt>
            <dd>{formatHnlFromCents(session.declaredCashCents ?? 0)}</dd>
          </div>
          <div className={styles.differenceSummary}>
            <dt>Diferencia</dt>
            <dd>
              {differenceCents > 0 ? "+" : ""}
              {formatHnlFromCents(differenceCents)}
            </dd>
          </div>
          <div>
            <dt>Recibos</dt>
            <dd>
              {validReceipts.length} válidos · {annulledReceipts.length}{" "}
              anulados
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.section}>
        <h2>Composición por medio de pago</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Medio</th>
              <th className={styles.numeric}>Operaciones</th>
              <th className={styles.numeric}>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Efectivo</td>
              <td className={styles.numeric}>{cashReceipts.length}</td>
              <td className={styles.numeric}>
                {formatHnlFromCents(cashCollectedCents)}
              </td>
            </tr>
            <tr>
              <td>Transferencias</td>
              <td className={styles.numeric}>{transferReceipts.length}</td>
              <td className={styles.numeric}>
                {formatHnlFromCents(transferCollectedCents)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total cobrado</td>
              <td className={styles.numeric}>{validReceipts.length}</td>
              <td className={styles.numeric}>
                {formatHnlFromCents(totalCollectedCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className={styles.section}>
        <h2>Conteo físico por denominación</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Denominación</th>
              <th>Tipo</th>
              <th className={styles.numeric}>Cantidad</th>
              <th className={styles.numeric}>Valor unitario</th>
              <th className={styles.numeric}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {state.countDetails.map((detail) => (
              <tr key={detail.denominationId}>
                <td>{detail.label}</td>
                <td>
                  {detail.denominationId.startsWith("bill-")
                    ? "Billete"
                    : "Moneda"}
                </td>
                <td className={styles.numeric}>{detail.quantity}</td>
                <td className={styles.numeric}>
                  {formatHnlFromCents(detail.valueCents)}
                </td>
                <td className={styles.numeric}>
                  {formatHnlFromCents(detail.subtotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total declarado</td>
              <td className={styles.numeric}>
                {formatHnlFromCents(session.declaredCashCents ?? 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className={styles.section}>
        <h2>Recibos válidos</h2>
        {validReceipts.length > 0 ? (
          <table className={`${styles.table} ${styles.receiptTable}`}>
            <thead>
              <tr>
                <th>Recibo / hora</th>
                <th>Paciente / atención</th>
                <th>Medio / detalle</th>
                <th className={styles.numeric}>Total</th>
              </tr>
            </thead>
            <tbody>
              {validReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>
                    <strong>{receipt.localNumber}</strong>
                    <small>{formatDateTime(receipt.issuedAt)}</small>
                  </td>
                  <td>
                    <strong>{receipt.patientName}</strong>
                    <small>{receipt.attentionNumber}</small>
                  </td>
                  <td>
                    <strong>{getPaymentMethodLabel(receipt.method)}</strong>
                    <small>{getPaymentDetail(receipt)}</small>
                    {receipt.notes ? <small>Nota: {receipt.notes}</small> : null}
                  </td>
                  <td className={styles.numeric}>
                    {formatHnlFromCents(receipt.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyText}>No se emitieron recibos válidos.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>Recibos anulados</h2>
        {annulledReceipts.length > 0 ? (
          <table
            className={`${styles.table} ${styles.receiptTable} ${styles.annulledTable}`}
          >
            <thead>
              <tr>
                <th>Recibo / emisión</th>
                <th>Paciente / atención</th>
                <th>Medio / detalle</th>
                <th>Anulación / motivo</th>
                <th className={styles.numeric}>Monto anulado</th>
              </tr>
            </thead>
            <tbody>
              {annulledReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>
                    <strong>{receipt.localNumber}</strong>
                    <small>{formatDateTime(receipt.issuedAt)}</small>
                  </td>
                  <td>
                    <strong>{receipt.patientName}</strong>
                    <small>{receipt.attentionNumber}</small>
                  </td>
                  <td>
                    <strong>{getPaymentMethodLabel(receipt.method)}</strong>
                    <small>{getPaymentDetail(receipt)}</small>
                    {receipt.notes ? <small>Nota: {receipt.notes}</small> : null}
                  </td>
                  <td>
                    <strong>
                      {receipt.annulledAt
                        ? formatDateTime(receipt.annulledAt)
                        : "Sin fecha registrada"}
                    </strong>
                    <small>
                      {receipt.annulmentReason ?? "Sin motivo registrado"}
                    </small>
                  </td>
                  <td className={styles.numeric}>
                    {formatHnlFromCents(receipt.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyText}>No se anularon recibos.</p>
        )}
      </section>

      <section className={`${styles.section} ${styles.notesSection}`}>
        <h2>Observaciones</h2>
        <dl>
          <div>
            <dt>Apertura</dt>
            <dd>{session.openingNotes ?? "Sin observaciones."}</dd>
          </div>
          <div>
            <dt>Cierre y diferencia</dt>
            <dd>{session.closingNotes ?? "Sin observaciones."}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.signatures} aria-label="Firmas del cierre">
        <div>
          <span />
          <strong>Responsable de caja</strong>
          <small>Nombre, firma y fecha</small>
        </div>
        <div>
          <span />
          <strong>Revisión / supervisión</strong>
          <small>Nombre, firma y fecha</small>
        </div>
      </section>

      <footer className={styles.documentFooter}>
        <span>Generado mediante SIEMC</span>
        <span>Cierre: {formatDateTime(session.closedAt)}</span>
      </footer>
    </article>
  );
}
