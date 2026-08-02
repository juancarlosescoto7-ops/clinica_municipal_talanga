"use client";

import { useState, type FormEvent } from "react";

import {
  normalizePatientValues,
  validateCreateAttention,
  validatePatientRegistration,
} from "../schemas/pacientes.schema";
import {
  DOCUMENT_TYPE_OPTIONS,
  type PatientDocumentType,
  type PatientRegistrationValues,
  type ValidationErrors,
} from "../types/pacientes.types";
import {
  formatPatientBirthDateInput,
  splitPatientFullName,
} from "../utils/patient-input";

import styles from "./pacientes.module.css";

const initialValues: PatientRegistrationValues = {
  documentType: "identidad",
  documentNumber: "",
  firstNames: "",
  lastNames: "",
  birthDate: "",
  phone: "",
  email: "",
  address: "",
};

interface PatientRegistrationFormProps {
  onCompleted: () => void;
  onSubmit: (
    values: PatientRegistrationValues,
    createAttention: boolean,
    attentionNotes: string,
  ) => { success: boolean; message: string };
}

export function PatientRegistrationForm({
  onCompleted,
  onSubmit,
}: PatientRegistrationFormProps) {
  const [values, setValues] =
    useState<PatientRegistrationValues>(initialValues);
  const [fullName, setFullName] = useState("");
  const [createAttention, setCreateAttention] = useState(true);
  const [attentionNotes, setAttentionNotes] = useState("");
  const [errors, setErrors] = useState<
    ValidationErrors<PatientRegistrationValues>
  >({});
  const [attentionError, setAttentionError] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  function setField<Key extends keyof PatientRegistrationValues>(
    field: Key,
    value: PatientRegistrationValues[Key],
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError("");

    const nameParts = splitPatientFullName(fullName);
    const submissionValues: PatientRegistrationValues = {
      ...values,
      firstNames: nameParts?.firstNames ?? "",
      lastNames: nameParts?.lastNames ?? "",
    };
    const validation = validatePatientRegistration(submissionValues);
    const attentionValidation = validateCreateAttention({
      patientId: "new-patient",
      notes: attentionNotes,
    });

    setErrors(validation.errors);
    setAttentionError(attentionValidation.errors.notes ?? "");

    if (
      !validation.isValid ||
      (createAttention && !attentionValidation.isValid)
    ) {
      return;
    }

    const result = onSubmit(
      normalizePatientValues(submissionValues),
      createAttention,
      attentionNotes,
    );
    if (!result.success) {
      setSubmissionError(result.message);
      return;
    }

    onCompleted();
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      {submissionError ? (
        <div className={styles.formAlert} role="alert">
          {submissionError}
        </div>
      ) : null}

      <fieldset className={styles.fieldset}>
        <legend>Identificación</legend>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Tipo de documento</span>
            <select
              onChange={(event) =>
                setField(
                  "documentType",
                  event.target.value as PatientDocumentType,
                )
              }
              value={values.documentType}
            >
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Número de documento</span>
            <input
              aria-invalid={Boolean(errors.documentNumber)}
              autoComplete="off"
              onChange={(event) =>
                setField("documentNumber", event.target.value)
              }
              placeholder={
                values.documentType === "identidad"
                  ? "0801199012345"
                  : "Documento"
              }
              value={values.documentNumber}
            />
            {errors.documentNumber ? (
              <small className={styles.errorText}>
                {errors.documentNumber}
              </small>
            ) : null}
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span>Nombre completo</span>
            <input
              aria-invalid={Boolean(errors.firstNames || errors.lastNames)}
              autoComplete="name"
              maxLength={201}
              onChange={(event) => {
                setFullName(event.target.value);
                setErrors((currentErrors) => ({
                  ...currentErrors,
                  firstNames: undefined,
                  lastNames: undefined,
                }));
              }}
              placeholder="Nombre completo del paciente"
              value={fullName}
            />
            {errors.firstNames || errors.lastNames ? (
              <small className={styles.errorText}>
                Ingresa al menos un nombre y un apellido.
              </small>
            ) : null}
          </label>

          <label className={styles.field}>
            <span>Fecha de nacimiento</span>
            <input
              aria-invalid={Boolean(errors.birthDate)}
              autoComplete="bday"
              inputMode="numeric"
              maxLength={10}
              onChange={(event) =>
                setField(
                  "birthDate",
                  formatPatientBirthDateInput(event.target.value),
                )
              }
              placeholder="DD/MM/AAAA"
              type="text"
              value={values.birthDate}
            />
            {errors.birthDate ? (
              <small className={styles.errorText}>{errors.birthDate}</small>
            ) : null}
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Contacto</legend>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Teléfono <em>Opcional</em></span>
            <input
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              onChange={(event) => setField("phone", event.target.value)}
              placeholder="9999-9999"
              value={values.phone}
            />
            {errors.phone ? (
              <small className={styles.errorText}>{errors.phone}</small>
            ) : null}
          </label>

          <label className={styles.field}>
            <span>Correo <em>Opcional</em></span>
            <input
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              onChange={(event) => setField("email", event.target.value)}
              placeholder="persona@correo.com"
              type="email"
              value={values.email}
            />
            {errors.email ? (
              <small className={styles.errorText}>{errors.email}</small>
            ) : null}
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span>Dirección <em>Opcional</em></span>
            <textarea
              aria-invalid={Boolean(errors.address)}
              onChange={(event) => setField("address", event.target.value)}
              placeholder="Dirección de residencia"
              rows={2}
              value={values.address}
            />
            {errors.address ? (
              <small className={styles.errorText}>{errors.address}</small>
            ) : null}
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Atención inicial</legend>
        <label className={styles.checkboxField}>
          <input
            checked={createAttention}
            onChange={(event) => setCreateAttention(event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>Crear atención al registrar</strong>
            <small>
              La atención se agregará con estado pendiente de pago.
            </small>
          </span>
        </label>

        {createAttention ? (
          <label className={styles.field}>
            <span>Observaciones <em>Opcional</em></span>
            <textarea
              aria-invalid={Boolean(attentionError)}
              onChange={(event) => {
                setAttentionNotes(event.target.value);
                setAttentionError("");
              }}
              placeholder="Información necesaria para recibir al paciente"
              rows={3}
              value={attentionNotes}
            />
            {attentionError ? (
              <small className={styles.errorText}>{attentionError}</small>
            ) : (
              <small className={styles.helpText}>
                Máximo 500 caracteres.
              </small>
            )}
          </label>
        ) : null}
      </fieldset>

      <div className={styles.formActions}>
        <button className={styles.primaryButton} type="submit">
          Registrar paciente
        </button>
      </div>
    </form>
  );
}
