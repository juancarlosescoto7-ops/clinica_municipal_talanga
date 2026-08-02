"use client";

import { useState, type FormEvent } from "react";

import { validateAbandonAttention } from "../schemas/pacientes.schema";
import type {
  AbandonAttentionValues,
  AttentionRecord,
  PatientRecord,
} from "../types/pacientes.types";
import { formatPatientName } from "../utils/pacientes-formatters";

import styles from "./pacientes.module.css";

interface AbandonmentFormProps {
  attention: AttentionRecord;
  onCompleted: () => void;
  onSubmit: (
    values: AbandonAttentionValues,
  ) => { success: boolean; message: string };
  patient: PatientRecord;
}

export function AbandonmentForm({
  attention,
  onCompleted,
  onSubmit,
  patient,
}: AbandonmentFormProps) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: AbandonAttentionValues = {
      attentionId: attention.id,
      reason,
    };
    const validation = validateAbandonAttention(values);

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
      <div className={styles.warningBox}>
        <strong>Atención {attention.localNumber}</strong>
        <p>
          {formatPatientName(patient)} · Esta acción cambia el estado a
          abandonada y conserva la justificación en el historial.
        </p>
      </div>

      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <label className={styles.field}>
        <span>Justificación del abandono</span>
        <textarea
          aria-invalid={Boolean(reasonError)}
          autoFocus
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError("");
          }}
          placeholder="Describe por qué el paciente no continuará el proceso"
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
          Confirmar abandono
        </button>
      </div>
    </form>
  );
}

