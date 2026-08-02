import type { RpcExecutor } from "@/types/rpc";

import type {
  AssignServiceValues,
  AttentionServiceRpcRow,
  RateFormValues,
  ServiceCatalogRpcRow,
  ServiceFormValues,
  ServiceRateRpcRow,
  ServiceRpcRow,
} from "../types/servicios.types";

interface ListServicesInput {
  query: string;
  status: "todos" | "activo" | "inactivo";
  page: number;
  pageSize: number;
  referenceDate: string;
  tariffCategory?: "general" | "tercera_edad" | "policia";
}

export interface ServicesService {
  createService(values: ServiceFormValues): Promise<ServiceRpcRow>;
  updateService(
    serviceId: string,
    values: ServiceFormValues,
  ): Promise<ServiceRpcRow>;
  scheduleRate(values: RateFormValues): Promise<ServiceRateRpcRow>;
  listServices(
    input: ListServicesInput,
  ): Promise<readonly ServiceCatalogRpcRow[]>;
  getServiceRates(
    serviceId: string,
    referenceDate: string,
  ): Promise<readonly ServiceRateRpcRow[]>;
  assignServiceToAttention(
    values: AssignServiceValues,
  ): Promise<AttentionServiceRpcRow>;
}

export class ServicesServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ServicesServiceError";
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
    throw new ServicesServiceError(
      response.error.message,
      response.error.code,
    );
  }

  if (response.data === null) {
    throw new ServicesServiceError(
      `La RPC ${functionName} no retornó datos.`,
    );
  }

  return response.data;
}

function firstRowOrThrow<TResult>(
  rows: readonly TResult[],
  message: string,
): TResult {
  const row = rows[0];
  if (!row) {
    throw new ServicesServiceError(message);
  }

  return row;
}

export function createServicesService(
  executor: RpcExecutor,
): ServicesService {
  return {
    async createService(values) {
      const rows = await executeRpc<ServiceRpcRow[]>(
        executor,
        "crear_servicio",
        {
          p_codigo: values.code,
          p_nombre: values.name,
          p_descripcion: values.description || null,
        },
      );

      return firstRowOrThrow(
        rows,
        "La RPC no retornó el servicio creado.",
      );
    },

    async updateService(serviceId, values) {
      const rows = await executeRpc<ServiceRpcRow[]>(
        executor,
        "actualizar_servicio",
        {
          p_servicio_id: serviceId,
          p_codigo: values.code,
          p_nombre: values.name,
          p_descripcion: values.description || null,
          p_estado: values.status,
        },
      );

      return firstRowOrThrow(
        rows,
        "La RPC no retornó el servicio actualizado.",
      );
    },

    async scheduleRate(values) {
      const rows = await executeRpc<ServiceRateRpcRow[]>(
        executor,
        "programar_tarifa_servicio",
        {
          p_servicio_id: values.serviceId,
          p_monto: Number(values.amount),
          p_vigente_desde: values.validFrom,
          p_vigente_hasta: values.validUntil || null,
          p_categoria_tarifaria: values.tariffCategory ?? "general",
        },
      );

      return firstRowOrThrow(
        rows,
        "La RPC no retornó la tarifa creada.",
      );
    },

    async listServices(input) {
      return executeRpc<ServiceCatalogRpcRow[]>(
        executor,
        "listar_catalogo_servicios",
        {
          p_busqueda: input.query || null,
          p_estado: input.status === "todos" ? null : input.status,
          p_fecha_referencia: input.referenceDate,
          p_limite: input.pageSize,
          p_desplazamiento: (input.page - 1) * input.pageSize,
          p_categoria_tarifaria: input.tariffCategory ?? "general",
        },
      );
    },

    getServiceRates(serviceId, referenceDate) {
      const parameters = {
        p_servicio_id: serviceId,
        p_fecha_referencia: referenceDate,
      };

      return executeRpc<ServiceRateRpcRow[]>(
        executor,
        "obtener_tarifas_servicio",
        parameters,
      );
    },

    async assignServiceToAttention(values) {
      const rows = await executeRpc<AttentionServiceRpcRow[]>(
        executor,
        "asignar_servicio_atencion",
        {
          p_atencion_id: values.attentionId,
          p_servicio_id: values.serviceId,
          p_cantidad: values.quantity,
        },
      );

      return firstRowOrThrow(
        rows,
        "La RPC no retornó el servicio asignado.",
      );
    },
  };
}
