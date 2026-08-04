"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  TARIFF_CATEGORY_LABELS,
} from "@/modules/pacientes/types/pacientes.types";
import {
  GuidedReceiptPrint,
  type GuidedReceiptPrintData,
} from "@/modules/operacion-guiada";
import { getSupabaseBrowserRpcExecutor } from "@/services";

import { createReceiptReprintService } from "../services/reimpresion.service";
import type { ReceiptReprintRpcRow } from "../types/reimpresion.types";

import styles from "./receipt-reprint.module.css";

interface PrintJob {
  id: number;
  receipt: GuidedReceiptPrintData;
}

function moneyToCents(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function mapReceiptToPrint(row: ReceiptReprintRpcRow): GuidedReceiptPrintData {
  return {
    receiptId: row.recibo_id,
    receiptNumber: String(row.numero_recibo),
    attentionId: row.atencion_id,
    attentionNumber: String(row.numero_atencion),
    issuedAt: row.emitido_en,
    patientName: row.paciente_nombre,
    patientDocument: row.numero_documento,
    tariffCategory:
      TARIFF_CATEGORY_LABELS[row.categoria_tarifaria] ??
      row.categoria_tarifaria,
    services: row.servicios.map((service) => ({
      code: service.codigo,
      name: service.nombre,
      quantity: service.cantidad,
      unitPriceCents: moneyToCents(service.monto_unitario) ?? 0,
      subtotalCents: moneyToCents(service.subtotal) ?? 0,
    })),
    totalCents: moneyToCents(row.total) ?? 0,
    paymentMethod: row.metodo,
    cashReceivedCents: moneyToCents(row.monto_recibido),
    changeCents: moneyToCents(row.cambio),
    bank: row.banco,
    transferReference: row.referencia_transferencia,
  };
}

export function ReceiptReprintWorkspace() {
  const service = useMemo(
    () => createReceiptReprintService(getSupabaseBrowserRpcExecutor()),
    [],
  );
  const [receiptNumber, setReceiptNumber] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const nextPrintJobId = useRef(0);
  const printedJobId = useRef<number | null>(null);

  useEffect(() => {
    if (!printJob) {
      return;
    }

    const jobId = printJob.id;
    const handleAfterPrint = () => {
      setPrintJob((current) => (current?.id === jobId ? null : current));
      setFeedback(
        `Reimpresión del recibo ${printJob.receipt.receiptNumber} enviada a la impresora.`,
      );
    };

    window.addEventListener("afterprint", handleAfterPrint);
    const timer = window.setTimeout(() => {
      if (printedJobId.current === jobId) {
        return;
      }

      printedJobId.current = jobId;
      window.print();
    }, 180);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [printJob]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedNumber = receiptNumber.trim();

    const numericReceiptNumber = Number(normalizedNumber);

    if (
      !/^\d{1,18}$/.test(normalizedNumber) ||
      !Number.isSafeInteger(numericReceiptNumber) ||
      numericReceiptNumber <= 0
    ) {
      setError("Ingrese un número de recibo válido.");
      return;
    }

    if (adminKey.length < 12 || adminKey.length > 128) {
      setError("La clave administrativa debe tener entre 12 y 128 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setFeedback("");

    try {
      const receipt = await service.authorizeReprint(
        numericReceiptNumber,
        adminKey,
      );
      nextPrintJobId.current += 1;
      setAdminKey("");
      setPrintJob({
        id: nextPrintJobId.current,
        receipt: mapReceiptToPrint(receipt),
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible autorizar la reimpresión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Control de comprobantes</p>
          <h1>Reimpresión de recibos</h1>
          <p>
            Recupere un recibo vigente por su número. Cada reimpresión queda
            identificada en el documento y registrada en Supabase.
          </p>
        </div>
      </header>

      {feedback ? (
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
      ) : null}

      <div className={styles.contentGrid}>
        <form className={styles.formCard} noValidate onSubmit={handleSubmit}>
          <div className={styles.cardHeading}>
            <span aria-hidden="true">↻</span>
            <div>
              <h2>Autorizar reimpresión</h2>
              <p>La impresión comenzará al confirmar los datos.</p>
            </div>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <label className={styles.field}>
            <span>Número de recibo</span>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={18}
              onChange={(event) => {
                setReceiptNumber(event.target.value.replace(/\D/g, ""));
                setError("");
              }}
              placeholder="Ejemplo: 125"
              value={receiptNumber}
            />
            <small>Escriba únicamente el correlativo impreso.</small>
          </label>

          <label className={styles.field}>
            <span>Clave administrativa</span>
            <input
              autoComplete="off"
              maxLength={128}
              onChange={(event) => {
                setAdminKey(event.target.value);
                setError("");
              }}
              placeholder="Clave privada de anulación"
              spellCheck={false}
              type="password"
              value={adminKey}
            />
            <small>Es la misma clave requerida para anular un recibo.</small>
          </label>

          <button
            className={styles.primaryButton}
            disabled={isSubmitting || Boolean(printJob)}
            type="submit"
          >
            {isSubmitting ? "Verificando…" : "Autorizar e imprimir"}
          </button>
        </form>

        <aside className={styles.securityCard}>
          <span className={styles.securityIcon} aria-hidden="true">✓</span>
          <h2>Controles de seguridad</h2>
          <ul>
            <li>Solo se reimprimen recibos que continúan válidos.</li>
            <li>La clave se verifica dentro de Supabase Vault.</li>
            <li>La clave no se guarda en el navegador ni en la bitácora.</li>
            <li>El documento lleva una marca visible de REIMPRESIÓN.</li>
            <li>Su QR apunta a la validación única del ID del recibo.</li>
          </ul>
        </aside>
      </div>

      <GuidedReceiptPrint isReprint receipt={printJob?.receipt ?? null} />
    </div>
  );
}
