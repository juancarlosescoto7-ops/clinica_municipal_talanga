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
  const [adminKey, setAdminKey] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [adminKeyError, setAdminKeyError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: ReceiptAnnulmentValues = {
      receiptId: receipt.id,
      reason,
      adminKey,
    };
    const validation = validateReceiptAnnulment(values);

    setReasonError(validation.errors.reason ?? "");
    setAdminKeyError(validation.errors.adminKey ?? "");
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
          El recibo y el pago quedarán anulados, la atención se marcará como
          anulada y la ficha del paciente se conservará.
        </p>
      </div>

      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <label className={styles.field}>
        <span>Clave administrativa</span>
        <input
          aria-invalid={Boolean(adminKeyError)}
          autoComplete="off"
          autoFocus
          maxLength={128}
          onChange={(event) => {
            setAdminKey(event.target.value);
            setAdminKeyError("");
          }}
          placeholder="Clave privada de anulación"
          spellCheck={false}
          type="password"
          value={adminKey}
        />
        {adminKeyError ? (
          <small className={styles.errorText}>{adminKeyError}</small>
        ) : (
          <small className={styles.helpText}>
            Esta clave no se guarda en el navegador.
          </small>
        )}
      </label>

      <label className={styles.field}>
        <span>Justificación de la anulación</span>
        <textarea
          aria-invalid={Boolean(reasonError)}
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
