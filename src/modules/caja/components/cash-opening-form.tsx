"use client";

import { useState, type FormEvent } from "react";

import { validateCashOpening } from "../schemas/caja.schema";
import type {
  CashOpeningValues,
  ValidationErrors,
} from "../types/caja.types";

import styles from "./caja.module.css";

interface CashOpeningFormProps {
  onSubmit: (
    values: CashOpeningValues,
  ) =>
    | { success: boolean; message: string }
    | Promise<{ success: boolean; message: string }>;
}

export function CashOpeningForm({ onSubmit }: CashOpeningFormProps) {
  const [values, setValues] = useState<CashOpeningValues>({
    openingAmount: "0.00",
    notes: "",
  });
  const [errors, setErrors] = useState<
    ValidationErrors<CashOpeningValues>
  >({});
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCashOpening(values);

    setErrors(validation.errors);
    setSubmissionError("");

    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (!result.success) {
        setSubmissionError(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <label className={styles.field}>
        <span>Fondo inicial</span>
        <div className={styles.moneyField}>
          <span>L</span>
          <input
            aria-invalid={Boolean(errors.openingAmount)}
            autoFocus
            inputMode="decimal"
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                openingAmount: event.target.value,
              }));
              setErrors((current) => ({
                ...current,
                openingAmount: undefined,
              }));
            }}
            placeholder="0.00"
            value={values.openingAmount}
          />
        </div>
        {errors.openingAmount ? (
          <small className={styles.errorText}>{errors.openingAmount}</small>
        ) : (
          <small className={styles.helpText}>
            Efectivo disponible antes del primer cobro.
          </small>
        )}
      </label>

      <label className={styles.field}>
        <span>Observaciones <em>Opcional</em></span>
        <textarea
          aria-invalid={Boolean(errors.notes)}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              notes: event.target.value,
            }));
            setErrors((current) => ({
              ...current,
              notes: undefined,
            }));
          }}
          placeholder="Condición inicial o comentario de apertura"
          rows={3}
          value={values.notes}
        />
        {errors.notes ? (
          <small className={styles.errorText}>{errors.notes}</small>
        ) : null}
      </label>

      <div className={styles.openingRule}>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 8v4l2.5 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
        <p>
          Solo puede existir una caja principal abierta. Los cobros y
          anulaciones se asociarán a esta sesión.
        </p>
      </div>

      <button
        className={styles.primaryButton}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Abriendo caja…" : "Abrir caja principal"}
      </button>
    </form>
  );
}
