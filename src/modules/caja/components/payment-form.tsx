"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  parseMoneyToCents,
  validatePayment,
} from "../schemas/caja.schema";
import type {
  PayableAttentionItem,
  PaymentMethod,
  PaymentValues,
  ValidationErrors,
} from "../types/caja.types";
import {
  formatHnlFromCents,
} from "../utils/caja-formatters";

import styles from "./caja.module.css";

interface PaymentFormProps {
  attention: PayableAttentionItem;
  onCompleted: () => void;
  onSubmit: (
    values: PaymentValues,
  ) => { success: boolean; message: string };
}

function todayAsLocalIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PaymentForm({
  attention,
  onCompleted,
  onSubmit,
}: PaymentFormProps) {
  const [values, setValues] = useState<PaymentValues>({
    attentionId: attention.id,
    method: "efectivo",
    cashReceived: (attention.totalCents / 100).toFixed(2),
    bank: "",
    transferReference: "",
    transferDate: todayAsLocalIsoDate(),
    notes: "",
  });
  const [errors, setErrors] = useState<ValidationErrors<PaymentValues>>(
    {},
  );
  const [submissionError, setSubmissionError] = useState("");

  const changeCents = useMemo(() => {
    if (values.method !== "efectivo") {
      return 0;
    }
    const receivedCents = parseMoneyToCents(values.cashReceived);
    if (receivedCents === null) {
      return 0;
    }
    return Math.max(receivedCents - attention.totalCents, 0);
  }, [attention.totalCents, values.cashReceived, values.method]);

  function setMethod(method: PaymentMethod) {
    setValues((current) => ({ ...current, method }));
    setErrors({});
    setSubmissionError("");
  }

  function setField<Key extends keyof PaymentValues>(
    field: Key,
    value: PaymentValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validatePayment(values, attention.totalCents);

    setErrors(validation.errors);
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
      <section className={styles.chargeSummary}>
        <div className={styles.chargeIdentity}>
          <span aria-hidden="true">{attention.patientName.charAt(0)}</span>
          <div>
            <strong>{attention.patientName}</strong>
            <small>
              {attention.attentionNumber} · {attention.documentNumber}
            </small>
          </div>
        </div>
        <div className={styles.serviceBreakdown}>
          {attention.services.map((service) => (
            <div key={service.code}>
              <span>
                {service.name}
                {service.quantity > 1 ? ` × ${service.quantity}` : ""}
              </span>
              <strong>{formatHnlFromCents(service.subtotalCents)}</strong>
            </div>
          ))}
        </div>
        <div className={styles.chargeTotal}>
          <span>Total a pagar</span>
          <strong>{formatHnlFromCents(attention.totalCents)}</strong>
        </div>
      </section>

      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <fieldset className={styles.methodFieldset}>
        <legend>Método de pago</legend>
        <div className={styles.methodSelector}>
          <button
            aria-pressed={values.method === "efectivo"}
            className={
              values.method === "efectivo" ? styles.methodActive : ""
            }
            onClick={() => setMethod("efectivo")}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4.5 7h15v10h-15zM8 12h.01M16 12h.01M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            </svg>
            Efectivo
          </button>
          <button
            aria-pressed={values.method === "transferencia"}
            className={
              values.method === "transferencia" ? styles.methodActive : ""
            }
            onClick={() => setMethod("transferencia")}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 9h16M6 9V7l6-3 6 3v2M6 18h12M7.5 9v7M11 9v7M15 9v7M18.5 9v7" />
            </svg>
            Transferencia
          </button>
        </div>
      </fieldset>

      {values.method === "efectivo" ? (
        <div className={styles.cashFields}>
          <label className={styles.field}>
            <span>Efectivo recibido</span>
            <div className={styles.moneyField}>
              <span>L</span>
              <input
                aria-invalid={Boolean(errors.cashReceived)}
                inputMode="decimal"
                onChange={(event) =>
                  setField("cashReceived", event.target.value)
                }
                value={values.cashReceived}
              />
            </div>
            {errors.cashReceived ? (
              <small className={styles.errorText}>
                {errors.cashReceived}
              </small>
            ) : null}
          </label>
          <div className={styles.changeBox}>
            <span>Cambio</span>
            <strong>{formatHnlFromCents(changeCents)}</strong>
          </div>
        </div>
      ) : (
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Banco o institución</span>
            <input
              aria-invalid={Boolean(errors.bank)}
              onChange={(event) => setField("bank", event.target.value)}
              placeholder="Nombre de la institución"
              value={values.bank}
            />
            {errors.bank ? (
              <small className={styles.errorText}>{errors.bank}</small>
            ) : null}
          </label>
          <label className={styles.field}>
            <span>Referencia</span>
            <input
              aria-invalid={Boolean(errors.transferReference)}
              onChange={(event) =>
                setField("transferReference", event.target.value)
              }
              placeholder="Número o código"
              value={values.transferReference}
            />
            {errors.transferReference ? (
              <small className={styles.errorText}>
                {errors.transferReference}
              </small>
            ) : null}
          </label>
          <label className={styles.field}>
            <span>Fecha de transferencia</span>
            <input
              aria-invalid={Boolean(errors.transferDate)}
              onChange={(event) =>
                setField("transferDate", event.target.value)
              }
              type="date"
              value={values.transferDate}
            />
            {errors.transferDate ? (
              <small className={styles.errorText}>
                {errors.transferDate}
              </small>
            ) : null}
          </label>
        </div>
      )}

      <label className={styles.field}>
        <span>Observaciones <em>Opcional</em></span>
        <textarea
          aria-invalid={Boolean(errors.notes)}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="Comentario relacionado con el pago"
          rows={3}
          value={values.notes}
        />
        {errors.notes ? (
          <small className={styles.errorText}>{errors.notes}</small>
        ) : null}
      </label>

      <div className={styles.formActions}>
        <button className={styles.primaryButton} type="submit">
          Confirmar pago y emitir recibo
        </button>
      </div>
    </form>
  );
}
