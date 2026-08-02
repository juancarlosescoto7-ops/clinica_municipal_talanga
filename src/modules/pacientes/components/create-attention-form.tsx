"use client";

import { useState, type FormEvent } from "react";

import { validateCreateAttention } from "../schemas/pacientes.schema";
import type {
  CreateAttentionValues,
  PatientRecord,
} from "../types/pacientes.types";
import { formatPatientName } from "../utils/pacientes-formatters";

import styles from "./pacientes.module.css";

interface CreateAttentionFormProps {
  onCompleted: () => void;
  onSubmit: (
    values: CreateAttentionValues,
  ) => { success: boolean; message: string };
  patient: PatientRecord;
}

export function CreateAttentionForm({
  onCompleted,
  onSubmit,
  patient,
}: CreateAttentionFormProps) {
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: CreateAttentionValues = {
      patientId: patient.id,
      notes,
    };
    const validation = validateCreateAttention(values);

    setNotesError(validation.errors.notes ?? "");
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
      <div className={styles.selectedEntity}>
        <span className={styles.patientAvatar} aria-hidden="true">
          {patient.firstNames.charAt(0)}
          {patient.lastNames.charAt(0)}
        </span>
        <div>
          <strong>{formatPatientName(patient)}</strong>
          <small>{patient.documentNumber}</small>
        </div>
      </div>

      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <label className={styles.field}>
        <span>Observaciones <em>Opcional</em></span>
        <textarea
          aria-invalid={Boolean(notesError)}
          onChange={(event) => {
            setNotes(event.target.value);
            setNotesError("");
          }}
          placeholder="Información necesaria para recibir al paciente"
          rows={4}
          value={notes}
        />
        {notesError ? (
          <small className={styles.errorText}>{notesError}</small>
        ) : (
          <small className={styles.helpText}>Máximo 500 caracteres.</small>
        )}
      </label>

      <div className={styles.informationBox}>
        <strong>Estado inicial</strong>
        <p>
          La nueva atención quedará pendiente de pago hasta que Caja confirme
          el cobro.
        </p>
      </div>

      <div className={styles.formActions}>
        <button className={styles.primaryButton} type="submit">
          Crear atención
        </button>
      </div>
    </form>
  );
}
