"use client";

import { useState, type FormEvent } from "react";

import { validateReceiptAnnulment } from "../schemas/caja.schema";
import type {
  ReceiptAnnulmentValues,
  ReceiptRecord,
} from "../types/caja.types";
import {
  formatHnlFromCents,
} from "../utils/caja-formatters";

import styles from "./caja.module.css";

interface ReceiptAnnulmentFormProps {
  onCompleted: () => void;
  onSubmit: (
    values: ReceiptAnnulmentValues,
  ) => { success: boolean; message: string };
  receipt: ReceiptRecord;
}

export function ReceiptAnnulmentForm({
  onCompleted,
  onSubmit,
  receipt,
}: ReceiptAnnulmentFormProps) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: ReceiptAnnulmentValues = {
      receiptId: receipt.id,
      reason,
    };
    const validation = validateReceiptAnnulment(values);

    setReasonError(validation.errors.reason ?? "");
    setSubmissionError("");

    if (!validation.isValid) {
      return;
    }

    const result = onSubmit(values);
    if (!result.success) {
      setSubmissionError(result.message);
      return;
    }

    onCompleted();
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <div className={styles.annulmentSummary}>
        <div>
          <span>Recibo</span>
          <strong>{receipt.localNumber}</strong>
        </div>
        <div>
          <span>Paciente</span>
          <strong>{receipt.patientName}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatHnlFromCents(receipt.totalCents)}</strong>
        </div>
      </div>

      <div className={styles.warningBox}>
        <strong>El registro financiero no se eliminará</strong>
        <p>
          El recibo quedará anulado y la atención volverá a pendiente de pago.
        </p>
      </div>

      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <label className={styles.field}>
        <span>Justificación de la anulación</span>
        <textarea
          aria-invalid={Boolean(reasonError)}
          autoFocus
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError("");
          }}
          placeholder="Describe el motivo de la anulación"
          rows={5}
          value={reason}
        />
        {reasonError ? (
          <small className={styles.errorText}>{reasonError}</small>
        ) : (
          <small className={styles.helpText}>
            Entre 10 y 300 caracteres.
          </small>
        )}
      </label>

      <div className={styles.formActions}>
        <button className={styles.dangerButton} type="submit">
          Confirmar anulación
        </button>
      </div>
    </form>
  );
}

