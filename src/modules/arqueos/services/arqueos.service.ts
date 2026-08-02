import type { RpcExecutor } from "@/types/rpc";

import type {
  ReconciliationRpcRow,
  ReconciliationStatus,
} from "../types/arqueos.types";

export interface ReconciliationsService {
  generate(cashSessionId: string): Promise<ReconciliationRpcRow>;
  confirm(id: string, justification: string): Promise<ReconciliationRpcRow>;
  get(id: string): Promise<ReconciliationRpcRow | null>;
  list(input: {
    from: string;
    until: string;
    status: "todos" | ReconciliationStatus;
  }): Promise<readonly ReconciliationRpcRow[]>;
}

export class ReconciliationsServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ReconciliationsServiceError";
    this.code = code;
  }
}

async function executeRpc<TResult>(
  executor: RpcExecutor,
  name: string,
  parameters: Record<string, unknown>,
): Promise<TResult> {
  const response = await executor.rpc<TResult>(name, parameters);
  if (response.error) {
    throw new ReconciliationsServiceError(
      response.error.message,
      response.error.code,
    );
  }
  if (response.data === null) {
    throw new ReconciliationsServiceError(`La RPC ${name} no retornó datos.`);
  }
  return response.data;
}

function firstRow<TResult>(rows: readonly TResult[], message: string): TResult {
  const row = rows[0];
  if (!row) throw new ReconciliationsServiceError(message);
  return row;
}

export function createReconciliationsService(
  executor: RpcExecutor,
): ReconciliationsService {
  return {
    async generate(cashSessionId) {
      return firstRow(
        await executeRpc<ReconciliationRpcRow[]>(
          executor,
          "generar_arqueo_caja",
          { p_caja_sesion_id: cashSessionId },
        ),
        "La RPC no retornó el arqueo.",
      );
    },

    async confirm(id, justification) {
      return firstRow(
        await executeRpc<ReconciliationRpcRow[]>(
          executor,
          "confirmar_arqueo",
          {
            p_arqueo_id: id,
            p_justificacion: justification || null,
          },
        ),
        "La RPC no retornó el arqueo confirmado.",
      );
    },

    async get(id) {
      const rows = await executeRpc<ReconciliationRpcRow[]>(
        executor,
        "obtener_arqueo",
        { p_arqueo_id: id },
      );
      return rows[0] ?? null;
    },

    list(input) {
      return executeRpc<ReconciliationRpcRow[]>(
        executor,
        "listar_arqueos",
        {
          p_desde: input.from || null,
          p_hasta: input.until || null,
          p_estado: input.status === "todos" ? null : input.status,
        },
      );
    },
  };
}
