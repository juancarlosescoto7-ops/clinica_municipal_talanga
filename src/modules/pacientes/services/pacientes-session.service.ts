import {
  normalizeDocumentNumber,
  normalizePatientValues,
} from "../schemas/pacientes.schema";
import type {
  AbandonAttentionValues,
  AttentionEventRecord,
  AttentionRecord,
  CreateAttentionValues,
  PatientRecord,
  PatientRegistrationValues,
  PatientsSessionState,
  SessionOperationResult,
} from "../types/pacientes.types";

export function createEmptyPatientsSession(): PatientsSessionState {
  return {
    patients: [],
    attentions: [],
    events: [],
    nextLocalAttentionNumber: 1,
  };
}

function createIdentifier(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatLocalAttentionNumber(sequence: number): string {
  return `AT-${String(sequence).padStart(5, "0")}`;
}

function buildAttention(
  state: PatientsSessionState,
  values: CreateAttentionValues,
): {
  attention: AttentionRecord;
  event: AttentionEventRecord;
} {
  const timestamp = nowIso();
  const attention: AttentionRecord = {
    id: createIdentifier(),
    localNumber: formatLocalAttentionNumber(
      state.nextLocalAttentionNumber,
    ),
    patientId: values.patientId,
    status: "pendiente_pago",
    notes: values.notes.trim() || null,
    abandonmentReason: null,
    abandonedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    attention,
    event: {
      id: createIdentifier(),
      attentionId: attention.id,
      eventType: "atencion_creada",
      previousStatus: null,
      newStatus: "pendiente_pago",
      detail: "Atención registrada correctamente.",
      createdAt: timestamp,
    },
  };
}

export function registerPatientInSession(
  state: PatientsSessionState,
  rawValues: PatientRegistrationValues,
  createInitialAttention: boolean,
  attentionNotes: string,
): SessionOperationResult {
  const values = normalizePatientValues(rawValues);
  const duplicate = state.patients.some(
    (patient) =>
      patient.documentType === values.documentType &&
      normalizeDocumentNumber(patient.documentNumber) ===
        values.documentNumber,
  );

  if (duplicate) {
    return {
      state,
      success: false,
      message: "Ya existe un paciente con ese tipo y número de documento.",
    };
  }

  const timestamp = nowIso();
  const patient: PatientRecord = {
    id: createIdentifier(),
    documentType: values.documentType,
    documentNumber: values.documentNumber,
    firstNames: values.firstNames,
    lastNames: values.lastNames,
    birthDate: values.birthDate,
    phone: values.phone || null,
    email: values.email || null,
    address: values.address || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const stateWithPatient: PatientsSessionState = {
    ...state,
    patients: [...state.patients, patient],
  };

  if (!createInitialAttention) {
    return {
      state: stateWithPatient,
      success: true,
      message: "Paciente agregado a la sesión actual.",
      patientId: patient.id,
    };
  }

  const { attention, event } = buildAttention(stateWithPatient, {
    patientId: patient.id,
    notes: attentionNotes,
  });

  return {
    state: {
      ...stateWithPatient,
      attentions: [...stateWithPatient.attentions, attention],
      events: [...stateWithPatient.events, event],
      nextLocalAttentionNumber:
        stateWithPatient.nextLocalAttentionNumber + 1,
    },
    success: true,
    message: "Paciente y atención agregados a la sesión actual.",
    patientId: patient.id,
    attentionId: attention.id,
  };
}

export function createAttentionInSession(
  state: PatientsSessionState,
  values: CreateAttentionValues,
): SessionOperationResult {
  const patientExists = state.patients.some(
    (patient) => patient.id === values.patientId,
  );

  if (!patientExists) {
    return {
      state,
      success: false,
      message: "El paciente seleccionado ya no está disponible.",
    };
  }

  const { attention, event } = buildAttention(state, values);

  return {
    state: {
      ...state,
      attentions: [...state.attentions, attention],
      events: [...state.events, event],
      nextLocalAttentionNumber: state.nextLocalAttentionNumber + 1,
    },
    success: true,
    message: "Atención agregada a la sesión actual.",
    patientId: values.patientId,
    attentionId: attention.id,
  };
}

export function abandonAttentionInSession(
  state: PatientsSessionState,
  values: AbandonAttentionValues,
): SessionOperationResult {
  const attention = state.attentions.find(
    (currentAttention) => currentAttention.id === values.attentionId,
  );

  if (!attention) {
    return {
      state,
      success: false,
      message: "La atención seleccionada ya no está disponible.",
    };
  }

  if (
    attention.status !== "registrada" &&
    attention.status !== "pendiente_pago"
  ) {
    return {
      state,
      success: false,
      message: "El estado actual de la atención no permite abandonarla.",
    };
  }

  const timestamp = nowIso();
  const updatedAttention: AttentionRecord = {
    ...attention,
    status: "abandonada",
    abandonmentReason: values.reason.trim(),
    abandonedAt: timestamp,
    updatedAt: timestamp,
  };

  const event: AttentionEventRecord = {
    id: createIdentifier(),
    attentionId: attention.id,
    eventType: "abandono_registrado",
    previousStatus: attention.status,
    newStatus: "abandonada",
    detail: values.reason.trim(),
    createdAt: timestamp,
  };

  return {
    state: {
      ...state,
      attentions: state.attentions.map((currentAttention) =>
        currentAttention.id === attention.id
          ? updatedAttention
          : currentAttention,
      ),
      events: [...state.events, event],
    },
    success: true,
    message: "Abandono registrado en la sesión actual.",
    patientId: attention.patientId,
    attentionId: attention.id,
  };
}

export function filterPatients(
  patients: readonly PatientRecord[],
  searchTerm: string,
): readonly PatientRecord[] {
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase("es");

  if (!normalizedTerm) {
    return patients;
  }

  return patients.filter((patient) => {
    const searchableValue =
      `${patient.firstNames} ${patient.lastNames} ${patient.documentNumber}`.toLocaleLowerCase(
        "es",
      );

    return searchableValue.includes(normalizedTerm);
  });
}
