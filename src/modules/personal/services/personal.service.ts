import type { RpcExecutor } from "@/types/rpc";

import type {
  ListStaffInput,
  StaffRpcRow,
  StaffSalaryRpcRow,
  StaffSalaryValues,
  StaffValues,
  StaffWithSalaryRpcRow,
} from "../types/personal.types";

export interface StaffService {
  createStaff(values: Omit<StaffValues, "status">): Promise<StaffRpcRow>;
  updateStaff(id: string, values: StaffValues): Promise<StaffRpcRow>;
  scheduleSalary(values: StaffSalaryValues): Promise<StaffSalaryRpcRow>;
  listStaff(input: ListStaffInput): Promise<readonly StaffWithSalaryRpcRow[]>;
  getSalaryHistory(staffId: string): Promise<readonly StaffSalaryRpcRow[]>;
}

export class StaffServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "StaffServiceError";
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
    throw new StaffServiceError(response.error.message, response.error.code);
  }
  if (response.data === null) {
    throw new StaffServiceError(`La RPC ${functionName} no retornó datos.`);
  }
  return response.data;
}

function firstRow<TResult>(rows: readonly TResult[], message: string): TResult {
  const row = rows[0];
  if (!row) throw new StaffServiceError(message);
  return row;
}

export function createStaffService(executor: RpcExecutor): StaffService {
  return {
    async createStaff(values) {
      return firstRow(
        await executeRpc<StaffRpcRow[]>(executor, "crear_personal", {
          p_codigo: values.code,
          p_nombre_completo: values.fullName,
          p_cargo: values.role,
        }),
        "La RPC no retornó el personal creado.",
      );
    },

    async updateStaff(id, values) {
      return firstRow(
        await executeRpc<StaffRpcRow[]>(executor, "actualizar_personal", {
          p_personal_id: id,
          p_codigo: values.code,
          p_nombre_completo: values.fullName,
          p_cargo: values.role,
          p_estado: values.status,
        }),
        "La RPC no retornó el personal actualizado.",
      );
    },

    async scheduleSalary(values) {
      return firstRow(
        await executeRpc<StaffSalaryRpcRow[]>(
          executor,
          "programar_salario_personal",
          {
            p_personal_id: values.staffId,
            p_monto: Number(values.amount),
            p_vigente_desde: values.validFrom,
            p_vigente_hasta: values.validUntil || null,
          },
        ),
        "La RPC no retornó el salario programado.",
      );
    },

    listStaff(input) {
      return executeRpc<StaffWithSalaryRpcRow[]>(
        executor,
        "listar_personal_salarios",
        {
          p_busqueda: input.query || null,
          p_estado: input.status === "todos" ? null : input.status,
          p_fecha_referencia: input.referenceDate,
          p_limite: input.pageSize,
          p_desplazamiento: (input.page - 1) * input.pageSize,
        },
      );
    },

    getSalaryHistory(staffId) {
      return executeRpc<StaffSalaryRpcRow[]>(
        executor,
        "obtener_historial_salarios_personal",
        { p_personal_id: staffId },
      );
    },
  };
}
