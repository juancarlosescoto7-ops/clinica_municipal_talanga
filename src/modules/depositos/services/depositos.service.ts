import type { RpcExecutor } from "@/types/rpc";

import type {
  DepositDetailRpcRow,
  DepositRpcRow,
  DepositValues,
  PendingDepositReconciliationRpcRow,
  PersistedDepositStatus,
} from "../types/depositos.types";

export interface DepositsService {
  listPendingReconciliations(): Promise<
    readonly PendingDepositReconciliationRpcRow[]
  >;
  register(values: DepositValues): Promise<DepositRpcRow>;
  get(id: string): Promise<DepositDetailRpcRow | null>;
  list(input: {
    from: string;
    until: string;
    status: "todos" | PersistedDepositStatus;
  }): Promise<readonly DepositRpcRow[]>;
  annul(id: string, reason: string): Promise<DepositRpcRow>;
}

export class DepositsServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "DepositsServiceError";
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
    throw new DepositsServiceError(response.error.message, response.error.code);
  }
  if (response.data === null) {
    throw new DepositsServiceError(`La RPC ${name} no retornó datos.`);
  }
  return response.data;
}

function firstRow<TResult>(rows: readonly TResult[], message: string): TResult {
  const row = rows[0];
  if (!row) throw new DepositsServiceError(message);
  return row;
}

export function createDepositsService(executor: RpcExecutor): DepositsService {
  return {
    listPendingReconciliations() {
      return executeRpc<PendingDepositReconciliationRpcRow[]>(
        executor,
        "listar_arqueos_pendientes_deposito",
        {},
      );
    },

    async register(values) {
      return firstRow(
        await executeRpc<DepositRpcRow[]>(executor, "registrar_deposito", {
          p_fecha_deposito: values.depositDate,
          p_banco: values.bank,
          p_referencia: values.reference,
          p_monto_depositado: values.depositedAmount,
          p_asignaciones: values.assignments.map((assignment) => ({
            arqueo_id: assignment.reconciliationId,
            monto: assignment.amount,
          })),
          p_evidencia_url: values.evidenceUrl || null,
          p_observaciones: values.notes || null,
        }),
        "La RPC no retornó el depósito.",
      );
    },

    async get(id) {
      const rows = await executeRpc<DepositDetailRpcRow[]>(
        executor,
        "obtener_deposito",
        { p_deposito_id: id },
      );
      return rows[0] ?? null;
    },

    list(input) {
      return executeRpc<DepositRpcRow[]>(executor, "listar_depositos", {
        p_desde: input.from || null,
        p_hasta: input.until || null,
        p_estado: input.status === "todos" ? null : input.status,
      });
    },

    async annul(id, reason) {
      return firstRow(
        await executeRpc<DepositRpcRow[]>(executor, "anular_deposito", {
          p_deposito_id: id,
          p_motivo: reason,
        }),
        "La RPC no retornó el depósito anulado.",
      );
    },
  };
}
