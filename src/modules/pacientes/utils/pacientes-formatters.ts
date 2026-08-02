import {
  ATTENTION_STATUS_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  type AttentionStatus,
  type PatientDocumentType,
  type PatientRecord,
} from "../types/pacientes.types";

const dateFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatPatientName(patient: PatientRecord): string {
  return `${patient.firstNames} ${patient.lastNames}`;
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function getDocumentTypeLabel(type: PatientDocumentType): string {
  return (
    DOCUMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

export function getAttentionStatusLabel(status: AttentionStatus): string {
  return ATTENTION_STATUS_LABELS[status];
}

