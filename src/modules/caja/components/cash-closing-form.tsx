"use client";

import { useMemo, useState, type FormEvent } from "react";

import { validateCashClosing } from "../schemas/caja.schema";
import {
  CASH_DENOMINATIONS,
  type CashClosingValues,
} from "../types/caja.types";
import {
  formatHnlFromCents,
} from "../utils/caja-formatters";

import styles from "./caja.module.css";

interface CashClosingFormProps {
  expectedCashCents: number;
  onCompleted: () => void;
  onSubmit: (
    values: CashClosingValues,
  ) => { success: boolean; message: string };
}

export function CashClosingForm({
  expectedCashCents,
  onCompleted,
  onSubmit,
}: CashClosingFormProps) {
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CASH_DENOMINATIONS.map((denomination) => [denomination.id, ""]),
    ),
  );
  const [notes, setNotes] = useState("");
  const [countError, setCountError] = useState("");
  const [notesError, setNotesError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  const declaredCashCents = useMemo(
    () =>
      CASH_DENOMINATIONS.reduce((total, denomination) => {
        const quantity = Number(counts[denomination.id] || "0");
        if (!Number.isInteger(quantity) || quantity < 0) {
          return total;
        }
        return total + denomination.valueCents * quantity;
      }, 0),
    [counts],
  );
  const differenceCents = declaredCashCents - expectedCashCents;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: CashClosingValues = {
      denominationCounts: CASH_DENOMINATIONS.map((denomination) => ({
        denominationId: denomination.id,
        quantity: counts[denomination.id] ?? "",
      })),
      notes,
    };
    const validation = validateCashClosing(values);

    setCountError(validation.errors.denominationCounts ?? "");
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

  const bills = CASH_DENOMINATIONS.filter(
    (denomination) => denomination.type === "billete",
  );
  const coins = CASH_DENOMINATIONS.filter(
    (denomination) => denomination.type === "moneda",
  );

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <div className={styles.closingSummary}>
        <div>
          <span>Efectivo esperado</span>
          <strong>{formatHnlFromCents(expectedCashCents)}</strong>
        </div>
        <div>
          <span>Efectivo contado</span>
          <strong>{formatHnlFromCents(declaredCashCents)}</strong>
        </div>
        <div
          className={
            differenceCents === 0
              ? styles.differenceExact
              : styles.differenceAlert
          }
        >
          <span>Diferencia</span>
          <strong>
            {differenceCents > 0 ? "+" : ""}
            {formatHnlFromCents(differenceCents)}
          </strong>
        </div>
      </div>

      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <fieldset className={styles.denominationFieldset}>
        <legend>Conteo por denominación</legend>

        <p className={styles.denominationLabel}>Billetes</p>
        <div className={styles.denominationGrid}>
          {bills.map((denomination) => (
            <label
              className={styles.denominationField}
              key={denomination.id}
            >
              <span>{denomination.label}</span>
              <input
                inputMode="numeric"
                min="0"
                onChange={(event) => {
                  setCounts((current) => ({
                    ...current,
                    [denomination.id]: event.target.value,
                  }));
                  setCountError("");
                }}
                placeholder="0"
                type="number"
                value={counts[denomination.id]}
              />
            </label>
          ))}
        </div>

        <p className={styles.denominationLabel}>Monedas</p>
        <div className={styles.denominationGrid}>
          {coins.map((denomination) => (
            <label
              className={styles.denominationField}
              key={denomination.id}
            >
              <span>{denomination.label}</span>
              <input
                inputMode="numeric"
                min="0"
                onChange={(event) => {
                  setCounts((current) => ({
                    ...current,
                    [denomination.id]: event.target.value,
                  }));
                  setCountError("");
                }}
                placeholder="0"
                type="number"
                value={counts[denomination.id]}
              />
            </label>
          ))}
        </div>

        {countError ? (
          <small className={styles.errorText}>{countError}</small>
        ) : null}
      </fieldset>

      <label className={styles.field}>
        <span>Observaciones de cierre <em>Opcional</em></span>
        <textarea
          aria-invalid={Boolean(notesError)}
          onChange={(event) => {
            setNotes(event.target.value);
            setNotesError("");
          }}
          placeholder="Explica cualquier diferencia o condición del cierre"
          rows={3}
          value={notes}
        />
        {notesError ? (
          <small className={styles.errorText}>{notesError}</small>
        ) : null}
      </label>

      <div className={styles.formActions}>
        <button className={styles.dangerButton} type="submit">
          Confirmar cierre de caja
        </button>
      </div>
    </form>
  );
}

