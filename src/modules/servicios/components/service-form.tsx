"use client";

import { useState, type FormEvent } from "react";

import {
  normalizeServiceValues,
  validateService,
} from "../schemas/servicios.schema";
import type {
  ServiceFormValues,
  ServiceRecord,
  ServiceStatus,
  ValidationErrors,
} from "../types/servicios.types";

import styles from "./servicios.module.css";

interface ServiceFormProps {
  onCompleted: () => void;
  onSubmit: (
    values: ServiceFormValues,
  ) => Promise<{ success: boolean; message: string }>;
  service?: ServiceRecord;
}

function initialValuesFor(service?: ServiceRecord): ServiceFormValues {
  return {
    code: service?.code ?? "",
    name: service?.name ?? "",
    description: service?.description ?? "",
    status: service?.status ?? "activo",
  };
}

export function ServiceForm({
  onCompleted,
  onSubmit,
  service,
}: ServiceFormProps) {
  const [values, setValues] = useState<ServiceFormValues>(() =>
    initialValuesFor(service),
  );
  const [errors, setErrors] = useState<
    ValidationErrors<ServiceFormValues>
  >({});
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<Key extends keyof ServiceFormValues>(
    field: Key,
    value: ServiceFormValues[Key],
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
    const validation = validateService(values);

    setErrors(validation.errors);
    setSubmissionError("");

    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit(normalizeServiceValues(values));
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
      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Código</span>
          <input
            aria-invalid={Boolean(errors.code)}
            autoComplete="off"
            onChange={(event) => setField("code", event.target.value)}
            placeholder="EVAL-MED"
            value={values.code}
          />
          {errors.code ? (
            <small className={styles.errorText}>{errors.code}</small>
          ) : (
            <small className={styles.helpText}>
              Se guardará en mayúsculas.
            </small>
          )}
        </label>

        <label className={styles.field}>
          <span>Estado</span>
          <select
            onChange={(event) =>
              setField("status", event.target.value as ServiceStatus)
            }
            value={values.status}
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </label>

        <label className={`${styles.field} ${styles.fieldFull}`}>
          <span>Nombre del servicio</span>
          <input
            aria-invalid={Boolean(errors.name)}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="Nombre visible para el personal"
            value={values.name}
          />
          {errors.name ? (
            <small className={styles.errorText}>{errors.name}</small>
          ) : null}
        </label>

        <label className={`${styles.field} ${styles.fieldFull}`}>
          <span>Descripción <em>Opcional</em></span>
          <textarea
            aria-invalid={Boolean(errors.description)}
            onChange={(event) =>
              setField("description", event.target.value)
            }
            placeholder="Descripción breve del alcance del servicio"
            rows={4}
            value={values.description}
          />
          {errors.description ? (
            <small className={styles.errorText}>
              {errors.description}
            </small>
          ) : (
            <small className={styles.helpText}>
              Máximo 500 caracteres.
            </small>
          )}
        </label>
      </div>

      <div className={styles.informationBox}>
        <strong>Control de disponibilidad</strong>
        <p>
          Los servicios inactivos conservan su historial, pero no podrán
          asignarse a nuevas atenciones.
        </p>
      </div>

      <div className={styles.formActions}>
        <button
          className={styles.primaryButton}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Guardando…"
            : service
              ? "Guardar cambios"
              : "Crear servicio"}
        </button>
      </div>
    </form>
  );
}
