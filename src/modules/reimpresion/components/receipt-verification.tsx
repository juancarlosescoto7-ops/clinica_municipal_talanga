"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserRpcExecutor } from "@/services";

import { createReceiptReprintService } from "../services/reimpresion.service";
import type { PublicReceiptVerificationRpcRow } from "../types/reimpresion.types";

import styles from "./receipt-verification.module.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VerificationState =
  | { status: "loading" }
  | { status: "found"; receipt: PublicReceiptVerificationRpcRow }
  | { status: "missing" }
  | { status: "error"; message: string };

function formatReceiptNumber(value: string | number): string {
  const normalized = String(value);
  return /^\d+$/.test(normalized)
    ? `REC-${normalized.padStart(6, "0")}`
    : normalized;
}

function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function ReceiptVerification({ receiptId }: { receiptId: string }) {
  const hasValidReceiptId = UUID_PATTERN.test(receiptId);
  const service = useMemo(
    () => createReceiptReprintService(getSupabaseBrowserRpcExecutor()),
    [],
  );
  const [state, setState] = useState<VerificationState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    if (!hasValidReceiptId) {
      return () => {
        active = false;
      };
    }

    async function verify() {
      try {
        const receipt = await service.verifyReceipt(receiptId);

        if (active) {
          setState(receipt ? { status: "found", receipt } : { status: "missing" });
        }
      } catch {
        if (active) {
          setState({
            status: "error",
            message:
              "No fue posible consultar el recibo. Verifique su conexión e inténtelo nuevamente.",
          });
        }
      }
    }

    void verify();
    return () => {
      active = false;
    };
  }, [hasValidReceiptId, receiptId, service]);

  const verificationState: VerificationState = hasValidReceiptId
    ? state
    : { status: "missing" };
  const receipt =
    verificationState.status === "found" ? verificationState.receipt : null;
  const isValid = receipt?.es_valido === true && receipt.estado === "valido";

  return (
    <main className={styles.page} id="contenido-principal">
      <article className={styles.card} aria-live="polite">
        <header className={styles.brand}>
          <span className={styles.logoFrame}>
            <Image
              alt="Municipalidad"
              height={52}
              src="/brand/logo-municipalidad.svg"
              width={50}
            />
          </span>
          <div>
            <strong>SIEMC</strong>
            <span>Clínica Municipal</span>
          </div>
        </header>

        {verificationState.status === "loading" ? (
          <section className={styles.result}>
            <span className={styles.spinner} aria-hidden="true" />
            <h1>Verificando recibo…</h1>
            <p>Estamos consultando el comprobante directamente en SIEMC.</p>
          </section>
        ) : null}

        {receipt ? (
          <section
            className={`${styles.result} ${
              isValid ? styles.valid : styles.invalid
            }`}
          >
            <span className={styles.statusIcon} aria-hidden="true">
              {isValid ? "✓" : "!"}
            </span>
            <p className={styles.statusLabel}>
              {isValid ? "VALIDACIÓN CONFIRMADA" : "RECIBO SIN VIGENCIA"}
            </p>
            <h1>{isValid ? "Este recibo sí es válido" : "Este recibo no es válido"}</h1>
            <p>
              {isValid
                ? "El identificador del QR coincide con un recibo vigente registrado en la Clínica Municipal."
                : "El recibo existe, pero fue anulado y ya no constituye un comprobante vigente."}
            </p>

            <dl className={styles.details}>
              <div>
                <dt>Recibo</dt>
                <dd>{formatReceiptNumber(receipt.numero_recibo)}</dd>
              </div>
              <div>
                <dt>Emitido</dt>
                <dd>{formatDateTime(receipt.emitido_en)}</dd>
              </div>
              <div>
                <dt>Monto</dt>
                <dd>{formatMoney(receipt.total)}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{isValid ? "Válido" : "Anulado"}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {verificationState.status === "missing" ? (
          <section className={`${styles.result} ${styles.invalid}`}>
            <span className={styles.statusIcon} aria-hidden="true">×</span>
            <p className={styles.statusLabel}>IDENTIFICADOR NO RECONOCIDO</p>
            <h1>No se encontró este recibo</h1>
            <p>
              El código escaneado no corresponde a un recibo registrado en
              SIEMC. Revise que el QR pertenezca al documento original.
            </p>
          </section>
        ) : null}

        {verificationState.status === "error" ? (
          <section className={`${styles.result} ${styles.invalid}`}>
            <span className={styles.statusIcon} aria-hidden="true">!</span>
            <p className={styles.statusLabel}>CONSULTA NO DISPONIBLE</p>
            <h1>No se pudo completar la validación</h1>
            <p>{verificationState.message}</p>
            <button onClick={() => window.location.reload()} type="button">
              Intentar nuevamente
            </button>
          </section>
        ) : null}

        <footer>
          La comprobación se realiza mediante el ID único del recibo y no
          muestra información personal del paciente.
        </footer>
      </article>
    </main>
  );
}
