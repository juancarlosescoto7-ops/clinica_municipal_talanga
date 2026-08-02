import type { RpcExecutor } from "@/types/rpc";

import type {
  AssignedCommissionRpcRow,
  CommissionSettlementDetailRpcRow,
  CommissionSettlementSummaryRpcRow,
  ProviderCommissionRateRpcRow,
  ProviderCommissionRateValues,
  ProviderRpcRow,
  ProviderSpecialty,
  ProviderStatus,
  ProviderValues,
} from "../types/comisiones.types";

export interface ListProvidersInput {
  query: string;
  specialty: "todas" | ProviderSpecialty;
  status: "todos" | ProviderStatus;
  page: number;
  pageSize: number;
}

export interface CommissionsService {
  createProvider(values: Omit<ProviderValues, "status">): Promise<ProviderRpcRow>;
  updateProvider(id: string, values: ProviderValues): Promise<ProviderRpcRow>;
  scheduleRate(
    values: ProviderCommissionRateValues,
  ): Promise<ProviderCommissionRateRpcRow>;
  assignProvider(
    attentionServiceId: string,
    providerId: string,
  ): Promise<AssignedCommissionRpcRow>;
  listProviders(input: ListProvidersInput): Promise<readonly ProviderRpcRow[]>;
  generateSettlement(period: string): Promise<CommissionSettlementSummaryRpcRow>;
  getSettlement(
    period: string,
  ): Promise<readonly CommissionSettlementDetailRpcRow[]>;
  adjustSettlement(
    settlementId: string,
    providerId: string,
    adjustment: number,
    notes: string,
  ): Promise<unknown>;
  settle(settlementId: string, notes: string): Promise<CommissionSettlementSummaryRpcRow>;
}

export class CommissionsServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "CommissionsServiceError";
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
    throw new CommissionsServiceError(response.error.message, response.error.code);
  }
  if (response.data === null) {
    throw new CommissionsServiceError(`La RPC ${name} no retornó datos.`);
  }
  return response.data;
}

function firstRow<TResult>(rows: readonly TResult[], message: string): TResult {
  const row = rows[0];
  if (!row) throw new CommissionsServiceError(message);
  return row;
}

export function createCommissionsService(
  executor: RpcExecutor,
): CommissionsService {
  return {
    async createProvider(values) {
      return firstRow(
        await executeRpc<ProviderRpcRow[]>(executor, "crear_proveedor", {
          p_codigo: values.code,
          p_nombre_completo: values.fullName,
          p_especialidad: values.specialty,
        }),
        "La RPC no retornó el proveedor creado.",
      );
    },

    async updateProvider(id, values) {
      return firstRow(
        await executeRpc<ProviderRpcRow[]>(executor, "actualizar_proveedor", {
          p_proveedor_id: id,
          p_codigo: values.code,
          p_nombre_completo: values.fullName,
          p_especialidad: values.specialty,
          p_estado: values.status,
        }),
        "La RPC no retornó el proveedor actualizado.",
      );
    },

    async scheduleRate(values) {
      return firstRow(
        await executeRpc<ProviderCommissionRateRpcRow[]>(
          executor,
          "programar_tarifa_comision_proveedor",
          {
            p_proveedor_id: values.providerId,
            p_servicio_id: values.serviceId,
            p_monto_unitario: Number(values.unitAmount),
            p_vigente_desde: values.validFrom,
            p_vigente_hasta: values.validUntil || null,
          },
        ),
        "La RPC no retornó la tarifa de comisión.",
      );
    },

    async assignProvider(attentionServiceId, providerId) {
      return firstRow(
        await executeRpc<AssignedCommissionRpcRow[]>(
          executor,
          "asignar_proveedor_atencion_servicio",
          {
            p_atencion_servicio_id: attentionServiceId,
            p_proveedor_id: providerId,
          },
        ),
        "La RPC no retornó la comisión asignada.",
      );
    },

    listProviders(input) {
      return executeRpc<ProviderRpcRow[]>(executor, "listar_proveedores", {
        p_busqueda: input.query || null,
        p_especialidad: input.specialty === "todas" ? null : input.specialty,
        p_estado: input.status === "todos" ? null : input.status,
        p_limite: input.pageSize,
        p_desplazamiento: (input.page - 1) * input.pageSize,
      });
    },

    async generateSettlement(period) {
      return firstRow(
        await executeRpc<CommissionSettlementSummaryRpcRow[]>(
          executor,
          "generar_liquidacion_comisiones",
          { p_periodo: period },
        ),
        "La RPC no retornó la liquidación.",
      );
    },

    getSettlement(period) {
      return executeRpc<CommissionSettlementDetailRpcRow[]>(
        executor,
        "obtener_liquidacion_comisiones",
        { p_periodo: period },
      );
    },

    async adjustSettlement(settlementId, providerId, adjustment, notes) {
      return firstRow(
        await executeRpc<unknown[]>(executor, "ajustar_comision_liquidacion", {
          p_liquidacion_id: settlementId,
          p_proveedor_id: providerId,
          p_ajuste: adjustment,
          p_observaciones: notes || null,
        }),
        "La RPC no retornó el ajuste.",
      );
    },

    async settle(settlementId, notes) {
      return firstRow(
        await executeRpc<CommissionSettlementSummaryRpcRow[]>(
          executor,
          "liquidar_comisiones",
          {
            p_liquidacion_id: settlementId,
            p_observaciones: notes || null,
          },
        ),
        "La RPC no retornó la liquidación cerrada.",
      );
    },
  };
}
