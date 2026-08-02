import type {
  AbandonAttentionValues,
  AttentionHistoryRpcRow,
  CreateAttentionValues,
  PatientRegistrationValues,
  RegisteredPatientRpcRow,
  SearchedPatientRpcRow,
  TariffCategory,
} from "../types/pacientes.types";
import type { RpcExecutor } from "@/types/rpc";

interface SearchPatientsInput {
  query: string;
  page: number;
  pageSize: number;
}

export interface PatientsService {
  registerPatient(
    values: PatientRegistrationValues,
    createAttention: boolean,
    attentionNotes: string,
    tariffCategory?: TariffCategory,
  ): Promise<RegisteredPatientRpcRow>;
  createAttention(
    values: CreateAttentionValues,
    tariffCategory?: TariffCategory,
  ): Promise<RegisteredPatientRpcRow>;
  abandonAttention(
    values: AbandonAttentionValues,
  ): Promise<RegisteredPatientRpcRow>;
  searchPatients(
    input: SearchPatientsInput,
  ): Promise<readonly SearchedPatientRpcRow[]>;
  getPatientHistory(
    patientId: string,
  ): Promise<readonly AttentionHistoryRpcRow[]>;
}

export class PatientsServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "PatientsServiceError";
    this.code = code;
  }
}

async function executeRpc<TResult>(
  executor: RpcExecutor,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<TResult> {
  const response = await executor.rpc<TResult>(functionName, parameters);

  if (response.error) {
    throw new PatientsServiceError(
      response.error.message,
      response.error.code,
    );
  }

  if (response.data === null) {
    throw new PatientsServiceError(
      `La RPC ${functionName} no retornó datos.`,
    );
  }

  return response.data;
}

export function createPatientsService(
  executor: RpcExecutor,
): PatientsService {
  return {
    async registerPatient(
      values,
      createAttention,
      attentionNotes,
      tariffCategory = "general",
    ) {
      const rows = await executeRpc<RegisteredPatientRpcRow[]>(
        executor,
        "registrar_paciente_atencion",
        {
          p_tipo_documento: values.documentType,
          p_numero_documento: values.documentNumber,
          p_nombres: values.firstNames,
          p_apellidos: values.lastNames,
          p_fecha_nacimiento: values.birthDate,
          p_telefono: values.phone || null,
          p_correo: values.email || null,
          p_direccion: values.address || null,
          p_crear_atencion: createAttention,
          p_observaciones_atencion: attentionNotes || null,
          p_categoria_tarifaria: tariffCategory,
        },
      );

      const row = rows[0];
      if (!row) {
        throw new PatientsServiceError(
          "La RPC no retornó el paciente registrado.",
        );
      }

      return row;
    },

    async createAttention(values, tariffCategory = "general") {
      const rows = await executeRpc<RegisteredPatientRpcRow[]>(
        executor,
        "crear_atencion_paciente",
        {
          p_paciente_id: values.patientId,
          p_observaciones: values.notes || null,
          p_categoria_tarifaria: tariffCategory,
        },
      );

      const row = rows[0];
      if (!row) {
        throw new PatientsServiceError(
          "La RPC no retornó la atención creada.",
        );
      }

      return row;
    },

    async abandonAttention(values) {
      const rows = await executeRpc<RegisteredPatientRpcRow[]>(
        executor,
        "registrar_abandono_atencion",
        {
          p_atencion_id: values.attentionId,
          p_motivo: values.reason,
        },
      );

      const row = rows[0];
      if (!row) {
        throw new PatientsServiceError(
          "La RPC no retornó la atención actualizada.",
        );
      }

      return row;
    },

    searchPatients(input) {
      return executeRpc<SearchedPatientRpcRow[]>(
        executor,
        "buscar_pacientes",
        {
          p_busqueda: input.query || null,
          p_limite: input.pageSize,
          p_desplazamiento: (input.page - 1) * input.pageSize,
        },
      );
    },

    getPatientHistory(patientId) {
      return executeRpc<AttentionHistoryRpcRow[]>(
        executor,
        "obtener_historial_paciente",
        {
          p_paciente_id: patientId,
        },
      );
    },
  };
}
