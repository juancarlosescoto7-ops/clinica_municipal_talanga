"use client";

import { useState, type FormEvent } from "react";

import {
  TARIFF_CATEGORY_LABELS,
  type TariffCategory,
} from "@/modules/pacientes/types/pacientes.types";

import { validateRate } from "../schemas/servicios.schema";
import { todayAsLocalIsoDate } from "../services/servicios-session.service";
import type {
  RateFormValues,
  ServiceRecord,
  ValidationErrors,
} from "../types/servicios.types";

import styles from "./servicios.module.css";

interface RateFormProps {
  onCompleted: () => void;
  onSubmit: (
    values: RateFormValues,
  ) => Promise<{ success: boolean; message: string }>;
  service: ServiceRecord;
}

export function RateForm({
  onCompleted,
  onSubmit,
  service,
}: RateFormProps) {
  const [values, setValues] = useState<RateFormValues>({
    serviceId: service.id,
    amount: "",
    validFrom: todayAsLocalIsoDate(),
    validUntil: "",
    tariffCategory: "general",
  });
  const [errors, setErrors] = useState<ValidationErrors<RateFormValues>>(
    {},
  );
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<Key extends keyof RateFormValues>(
    field: Key,
    value: RateFormValues[Key],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateRate(values);

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
        return;
      }

      onCompleted();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <div className={styles.selectedService}>
        <span aria-hidden="true">{service.code.slice(0, 2)}</span>
        <div>
          <strong>{service.name}</strong>
          <small>{service.code}</small>
        </div>
      </div>

      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <div className={styles.formGrid}>
        <label className={`${styles.field} ${styles.fieldFull}`}>
          <span>Categoría tarifaria</span>
          <select
            onChange={(event) =>
              setField(
                "tariffCategory",
                event.target.value as TariffCategory,
              )
            }
            value={values.tariffCategory}
          >
            {Object.entries(TARIFF_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={`${styles.field} ${styles.fieldFull}`}>
          <span>Monto en lempiras</span>
          <div className={styles.moneyField}>
            <span>L</span>
            <input
              aria-invalid={Boolean(errors.amount)}
              inputMode="decimal"
              onChange={(event) => setField("amount", event.target.value)}
              placeholder="0.00"
              value={values.amount}
            />
          </div>
          {errors.amount ? (
            <small className={styles.errorText}>{errors.amount}</small>
          ) : (
            <small className={styles.helpText}>
              Se conservarán dos decimales.
            </small>
          )}
        </label>

        <label className={styles.field}>
          <span>Vigente desde</span>
          <input
            aria-invalid={Boolean(errors.validFrom)}
            onChange={(event) =>
              setField("validFrom", event.target.value)
            }
            type="date"
            value={values.validFrom}
          />
          {errors.validFrom ? (
            <small className={styles.errorText}>{errors.validFrom}</small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Vigente hasta <em>Opcional</em></span>
          <input
            aria-invalid={Boolean(errors.validUntil)}
            min={values.validFrom || undefined}
            onChange={(event) =>
              setField("validUntil", event.target.value)
            }
            type="date"
            value={values.validUntil}
          />
          {errors.validUntil ? (
            <small className={styles.errorText}>{errors.validUntil}</small>
          ) : (
            <small className={styles.helpText}>
              Vacía significa vigencia indefinida.
            </small>
          )}
        </label>
      </div>

      <div className={styles.informationBox}>
        <strong>Historial protegido</strong>
        <p>
          Una tarifa nueva crea una vigencia independiente. No reemplaza ni
          elimina los períodos anteriores.
        </p>
      </div>

      <div className={styles.formActions}>
        <button
          className={styles.primaryButton}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Guardando…" : "Programar tarifa"}
        </button>
      </div>
    </form>
  );
}
