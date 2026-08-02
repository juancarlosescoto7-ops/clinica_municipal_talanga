import { MunicipalLogo } from "@/components/shared/municipal-logo";
import type { PaymentMethod } from "@/modules/caja/types/caja.types";
import {
  formatDateTime,
  getPaymentMethodLabel,
} from "@/modules/caja/utils/caja-formatters";

import { formatHnl } from "../utils/operacion-guiada-formatters";

import styles from "./guided-receipt-print.module.css";

export interface GuidedReceiptPrintService {
  code: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface GuidedReceiptPrintData {
  receiptId: string;
  receiptNumber: string;
  attentionId: string;
  attentionNumber: string;
  issuedAt: string;
  patientName: string;
  patientDocument: string;
  tariffCategory: string;
  services: readonly GuidedReceiptPrintService[];
  totalCents: number;
  paymentMethod: PaymentMethod;
  cashReceivedCents: number | null;
  changeCents: number | null;
  bank: string | null;
  transferReference: string | null;
}

interface GuidedReceiptPrintProps {
  receipt: GuidedReceiptPrintData | null;
}

interface ReceiptCopyProps {
  copyLabel: "PACIENTE · ORIGINAL" | "CLÍNICA · COPIA";
  receipt: GuidedReceiptPrintData;
}

function formatReceiptNumber(value: string): string {
  return /^\d+$/.test(value)
    ? `REC-${value.padStart(6, "0")}`
    : value;
}

function paymentDetail(receipt: GuidedReceiptPrintData): string {
  if (receipt.paymentMethod === "efectivo") {
    return getPaymentMethodLabel(receipt.paymentMethod);
  }

  return [
    getPaymentMethodLabel(receipt.paymentMethod),
    receipt.bank,
    receipt.transferReference
      ? `Ref. ${receipt.transferReference}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ReceiptCopy({ copyLabel, receipt }: ReceiptCopyProps) {
  return (
    <section className={styles.copy}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <MunicipalLogo
            alt="Escudo de la Municipalidad de Talanga"
            className={styles.municipalLogo}
            height={46}
            width={44}
          />
          <div>
            <span className={styles.organization}>Clínica Municipal</span>
            <h1>Recibo de pago</h1>
            <small>SIEMC · Comprobante válido</small>
          </div>
        </div>
        <div className={styles.receiptIdentity}>
          <span>{copyLabel}</span>
          <strong>{formatReceiptNumber(receipt.receiptNumber)}</strong>
          <small>{formatDateTime(receipt.issuedAt)}</small>
        </div>
      </header>

      <dl className={styles.identityGrid}>
        <div className={styles.patientIdentity}>
          <dt>Paciente</dt>
          <dd>{receipt.patientName}</dd>
        </div>
        <div>
          <dt>Documento</dt>
          <dd>{receipt.patientDocument}</dd>
        </div>
        <div>
          <dt>Atención</dt>
          <dd>{receipt.attentionNumber}</dd>
        </div>
        <div>
          <dt>Tarifa</dt>
          <dd>{receipt.tariffCategory}</dd>
        </div>
      </dl>

      <table className={styles.servicesTable}>
        <thead>
          <tr>
            <th>Servicio</th>
            <th className={styles.numeric}>Cant.</th>
            <th className={styles.numeric}>Unitario</th>
            <th className={styles.numeric}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {receipt.services.map((service) => (
            <tr key={service.code}>
              <td>
                <strong>{service.name}</strong>
                <small>{service.code}</small>
              </td>
              <td className={styles.numeric}>{service.quantity}</td>
              <td className={styles.numeric}>
                {formatHnl(service.unitPriceCents)}
              </td>
              <td className={styles.numeric}>
                {formatHnl(service.subtotalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.paymentSummary}>
        <dl>
          <div>
            <dt>Forma de pago</dt>
            <dd>{paymentDetail(receipt)}</dd>
          </div>
          {receipt.paymentMethod === "efectivo" ? (
            <>
              <div>
                <dt>Recibido</dt>
                <dd>{formatHnl(receipt.cashReceivedCents ?? 0)}</dd>
              </div>
              <div>
                <dt>Cambio</dt>
                <dd>{formatHnl(receipt.changeCents ?? 0)}</dd>
              </div>
            </>
          ) : null}
        </dl>
        <div className={styles.total}>
          <span>Total pagado</span>
          <strong>{formatHnl(receipt.totalCents)}</strong>
        </div>
      </div>

      <footer className={styles.footer}>
        <div>
          <span className={styles.signatureLine} />
          <strong>Recibido por</strong>
        </div>
        <p>
          Conserve este recibo como respaldo del pago. Código de control: {" "}
          <strong>{receipt.receiptId.slice(0, 8).toUpperCase()}</strong>
        </p>
      </footer>
    </section>
  );
}

export function GuidedReceiptPrint({ receipt }: GuidedReceiptPrintProps) {
  if (!receipt) {
    return null;
  }

  return (
    <article
      aria-label="Recibo doble para impresión"
      className={styles.printRoot}
    >
      <ReceiptCopy copyLabel="PACIENTE · ORIGINAL" receipt={receipt} />
      <ReceiptCopy copyLabel="CLÍNICA · COPIA" receipt={receipt} />
    </article>
  );
}
