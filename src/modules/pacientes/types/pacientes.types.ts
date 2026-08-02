export const DOCUMENT_TYPE_OPTIONS = [
  { value: "identidad", label: "Identidad hondureña" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "residencia", label: "Carné de residencia" },
  { value: "otro", label: "Otro documento" },
] as const;

export type PatientDocumentType =
  (typeof DOCUMENT_TYPE_OPTIONS)[number]["value"];

export const ATTENTION_STATUS_LABELS = {
  registrada: "Registrada",
  pendiente_pago: "Pendiente de pago",
  pagada: "Pagada",
  no_cobrada: "No cobrada",
  abandonada: "Abandonada",
  anulada: "Anulada",
} as const;

export type AttentionStatus = keyof typeof ATTENTION_STATUS_LABELS;

export const TARIFF_CATEGORY_LABELS = {
  general: "Tarifa general",
  tercera_edad: "Tercera edad",
  policia: "Policía",
} as const;

export type TariffCategory = keyof typeof TARIFF_CATEGORY_LABELS;

export interface PatientRegistrationValues {
  documentType: PatientDocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
}

export interface CreateAttentionValues {
  patientId: string;
  notes: string;
}

export interface AbandonAttentionValues {
  attentionId: string;
  reason: string;
}

export interface PatientRecord {
  id: string;
  documentType: PatientDocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AttentionEventType =
  | "atencion_creada"
  | "no_cobro_registrado"
  | "abandono_registrado";

export interface AttentionRecord {
  id: string;
  localNumber: string;
  patientId: string;
  status: AttentionStatus;
  notes: string | null;
  abandonmentReason: string | null;
  abandonedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttentionEventRecord {
  id: string;
  attentionId: string;
  eventType: AttentionEventType;
  previousStatus: AttentionStatus | null;
  newStatus: AttentionStatus;
  detail: string;
  createdAt: string;
}

export interface PatientsSessionState {
  patients: readonly PatientRecord[];
  attentions: readonly AttentionRecord[];
  events: readonly AttentionEventRecord[];
  nextLocalAttentionNumber: number;
}

export interface SessionOperationResult {
  state: PatientsSessionState;
  success: boolean;
  message: string;
  patientId?: string;
  attentionId?: string;
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export interface ValidationResult<T> {
  isValid: boolean;
  errors: ValidationErrors<T>;
}

export interface RegisteredPatientRpcRow {
  paciente_id: string;
  atencion_id: string | null;
  numero_atencion: string | null;
  estado: AttentionStatus | null;
}

export interface SearchedPatientRpcRow {
  paciente_id: string;
  tipo_documento: PatientDocumentType;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string | null;
  ultima_atencion_id: string | null;
  ultimo_numero_atencion: string | null;
  ultimo_estado: AttentionStatus | null;
  ultima_atencion_en: string | null;
  total_resultados: string;
}

export interface AttentionHistoryRpcRow {
  atencion_id: string;
  numero_atencion: string;
  estado: AttentionStatus;
  observaciones: string | null;
  motivo_abandono: string | null;
  abandonada_en: string | null;
  creada_en: string;
  total_eventos: string;
}
