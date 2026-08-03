"use client";

import { useState, type FormEvent } from "react";

import type { GuidedCase } from "../types/operacion-guiada.types";
import { formatHnl } from "../utils/operacion-guiada-formatters";

import styles from "./guided-operations.module.css";

interface ProcedureAnnulmentFormProps {
  procedure: GuidedCase;
  onCancel: () => void;
  onSubmit: (
    reason: string,
    adminKey: string,
  ) => Promise<{ success: boolean; message: string }>;
}

export function ProcedureAnnulmentForm({
  procedure,
  onCancel,
  onSubmit,
}: ProcedureAnnulmentFormProps) {
  const [reason, setReason] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedReason = reason.trim().replace(/\s+/g, " ");

    if (adminKey.length < 12 || adminKey.length > 128) {
      setError("La clave administrativa debe tener entre 12 y 128 caracteres.");
      return;
    }

    if (normalizedReason.length < 10 || normalizedReason.length > 300) {
      setError("La justificación debe tener entre 10 y 300 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const result = await onSubmit(normalizedReason, adminKey);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message);
    }
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <dl className={styles.annulmentSummary}>
        <div>
          <dt>Recibo</dt>
          <dd>{procedure.receiptNumber ?? "—"}</dd>
        </div>
        <div>
          <dt>Paciente</dt>
          <dd>
            {`${procedure.patient.firstNames} ${procedure.patient.lastNames}`.trim()}
          </dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatHnl(procedure.totalCents)}</dd>
        </div>
      </dl>

      <div className={styles.annulmentWarning}>
        <strong>Se anulará el procedimiento financiero completo</strong>
        <p>
          El recibo y el pago dejarán de contar en caja. La atención quedará
          anulada, pero el paciente se conservará para registrarlo nuevamente
          con la tarifa correcta.
        </p>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <label className={styles.field}>
        <span>Clave administrativa</span>
        <input
          autoComplete="off"
          autoFocus
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
        <small>No se guarda en el navegador ni en el código.</small>
      </label>

      <label className={styles.field}>
        <span>Justificación de la anulación</span>
        <textarea
          maxLength={300}
          onChange={(event) => {
            setReason(event.target.value);
            setError("");
          }}
          placeholder="Ejemplo: se aplicó una tarifa que no correspondía"
          rows={4}
          value={reason}
        />
        <small>Entre 10 y 300 caracteres.</small>
      </label>

      <div className={styles.actions}>
        <button
          className={styles.secondaryButton}
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className={styles.dangerButton}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Anulando…" : "Anular procedimiento"}
        </button>
      </div>
    </form>
  );
}
