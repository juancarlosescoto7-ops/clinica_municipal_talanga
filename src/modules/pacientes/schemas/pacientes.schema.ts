import type {
  AbandonAttentionValues,
  CreateAttentionValues,
  PatientRegistrationValues,
  ValidationErrors,
  ValidationResult,
} from "../types/pacientes.types";
import { parsePatientBirthDate } from "../utils/patient-input";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERAL_DOCUMENT_PATTERN = /^[A-Z0-9-]{4,30}$/;
const HONDURAN_ID_PATTERN = /^\d{13}$/;
const PHONE_PATTERN = /^[0-9+()\s-]{8,20}$/;

function resultFor<T>(errors: ValidationErrors<T>): ValidationResult<T> {
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

function todayAsLocalIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function normalizeDocumentNumber(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function normalizePatientValues(
  values: PatientRegistrationValues,
): PatientRegistrationValues {
  const normalizedBirthDate = parsePatientBirthDate(values.birthDate);

  return {
    ...values,
    documentNumber: normalizeDocumentNumber(values.documentNumber),
    firstNames: values.firstNames.trim().replace(/\s+/g, " "),
    lastNames: values.lastNames.trim().replace(/\s+/g, " "),
    birthDate: normalizedBirthDate ?? values.birthDate.trim(),
    phone: values.phone.trim(),
    email: values.email.trim().toLowerCase(),
    address: values.address.trim().replace(/\s+/g, " "),
  };
}

export function validatePatientRegistration(
  rawValues: PatientRegistrationValues,
): ValidationResult<PatientRegistrationValues> {
  const values = normalizePatientValues(rawValues);
  const parsedBirthDate = parsePatientBirthDate(rawValues.birthDate);
  const errors: ValidationErrors<PatientRegistrationValues> = {};

  if (values.documentType === "identidad") {
    if (!HONDURAN_ID_PATTERN.test(values.documentNumber)) {
      errors.documentNumber = "La identidad debe contener exactamente 13 dígitos.";
    }
  } else if (!GENERAL_DOCUMENT_PATTERN.test(values.documentNumber)) {
    errors.documentNumber =
      "El documento debe tener entre 4 y 30 letras, números o guiones.";
  }

  if (values.firstNames.length < 2 || values.firstNames.length > 100) {
    errors.firstNames = "Ingresa nombres de entre 2 y 100 caracteres.";
  }

  if (values.lastNames.length < 2 || values.lastNames.length > 100) {
    errors.lastNames = "Ingresa apellidos de entre 2 y 100 caracteres.";
  }

  if (!rawValues.birthDate.trim()) {
    errors.birthDate = "La fecha de nacimiento es obligatoria.";
  } else if (!parsedBirthDate) {
    errors.birthDate = "Escribe una fecha válida con el formato DD/MM/AAAA.";
  } else if (parsedBirthDate > todayAsLocalIsoDate()) {
    errors.birthDate = "La fecha de nacimiento no puede estar en el futuro.";
  }

  if (values.phone) {
    const digits = values.phone.replace(/\D/g, "");
    if (!PHONE_PATTERN.test(values.phone) || digits.length < 8) {
      errors.phone = "Ingresa un teléfono válido de al menos 8 dígitos.";
    }
  }

  if (values.email && !EMAIL_PATTERN.test(values.email)) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (values.email.length > 160) {
    errors.email = "El correo no puede superar 160 caracteres.";
  }

  if (values.address.length > 250) {
    errors.address = "La dirección no puede superar 250 caracteres.";
  }

  return resultFor(errors);
}

export function validateCreateAttention(
  values: CreateAttentionValues,
): ValidationResult<CreateAttentionValues> {
  const errors: ValidationErrors<CreateAttentionValues> = {};

  if (!values.patientId.trim()) {
    errors.patientId = "Selecciona un paciente.";
  }

  if (values.notes.trim().length > 500) {
    errors.notes = "Las observaciones no pueden superar 500 caracteres.";
  }

  return resultFor(errors);
}

export function validateAbandonAttention(
  values: AbandonAttentionValues,
): ValidationResult<AbandonAttentionValues> {
  const errors: ValidationErrors<AbandonAttentionValues> = {};
  const reason = values.reason.trim();

  if (!values.attentionId.trim()) {
    errors.attentionId = "Selecciona una atención.";
  }

  if (reason.length < 10 || reason.length > 300) {
    errors.reason =
      "La justificación debe contener entre 10 y 300 caracteres.";
  }

  return resultFor(errors);
}
