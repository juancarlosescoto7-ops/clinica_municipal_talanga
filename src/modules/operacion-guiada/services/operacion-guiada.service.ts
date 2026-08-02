import type { ProviderRpcRow } from "@/modules/comisiones";
import type {
  CashSessionRpcRow,
  ReceiptRpcRow,
} from "@/modules/caja/types/caja.types";
import type {
  RegisteredPatientRpcRow,
  TariffCategory,
} from "@/modules/pacientes/types/pacientes.types";
import type { RpcExecutor } from "@/types/rpc";

import type {
  GuidedAssignedServiceRpcRow,
  GuidedAssignServiceValues,
  GuidedCloseDayRpcResult,
  GuidedCloseDayValues,
  GuidedDayRpcState,
  GuidedPaymentValues,
  GuidedRegisterPatientValues,
  GuidedServiceCatalogRpcRow,
  GuidedServiceDefinition,
  GuidedUnpaidRpcRow,
} from "../types/operacion-guiada.types";

interface JsonRpcRow<T> {
  jornada?: T;
  resultado?: T;
}

export interface GuidedOperationService {
  openDay(openingAmount: number, notes?: string): Promise<CashSessionRpcRow>;
  registerPatient(
    values: GuidedRegisterPatientValues,
  ): Promise<RegisteredPatientRpcRow>;
  listAvailableServices(
    referenceDate: string,
    tariffCategory?: TariffCategory,
  ): Promise<readonly GuidedServiceDefinition[]>;
  listAvailableProviders(): Promise<readonly ProviderRpcRow[]>;
  assignService(
    values: GuidedAssignServiceValues,
  ): Promise<GuidedAssignedServiceRpcRow>;
  assignServices(
    values: readonly GuidedAssignServiceValues[],
  ): Promise<readonly GuidedAssignedServiceRpcRow[]>;
  recordAbandonment(
    attentionId: string,
    reason: string,
  ): Promise<RegisteredPatientRpcRow>;
  registerPayment(values: GuidedPaymentValues): Promise<ReceiptRpcRow>;
  markUnpaid(attentionId: string, reason?: string): Promise<GuidedUnpaidRpcRow>;
  getDayState(): Promise<GuidedDayRpcState>;
  closeDay(values: GuidedCloseDayValues): Promise<GuidedCloseDayRpcResult>;
}

export class GuidedOperationServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "GuidedOperationServiceError";
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
    throw new GuidedOperationServiceError(
      response.error.message,
      response.error.code,
    );
  }
  if (response.data === null) {
    throw new GuidedOperationServiceError(`La RPC ${name} no retornó datos.`);
  }
  return response.data;
}

function firstRow<TResult>(rows: readonly TResult[], message: string): TResult {
  const row = rows[0];
  if (!row) throw new GuidedOperationServiceError(message);
  return row;
}

function moneyToCents(value: string | number | null): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

async function assignSingleService(
  executor: RpcExecutor,
  values: GuidedAssignServiceValues,
): Promise<GuidedAssignedServiceRpcRow> {
  return firstRow(
    await executeRpc<GuidedAssignedServiceRpcRow[]>(
      executor,
      "registrar_servicio_guiado",
      {
        p_atencion_id: values.attentionId,
        p_servicio_id: values.serviceId,
        p_proveedor_id: values.providerId,
        p_cantidad: values.quantity,
      },
    ),
    "La RPC no retornó el servicio guiado.",
  );
}

export function createGuidedOperationService(
  executor: RpcExecutor,
): GuidedOperationService {
  return {
    async openDay(openingAmount, notes = "") {
      return firstRow(
        await executeRpc<CashSessionRpcRow[]>(executor, "abrir_caja", {
          p_monto_inicial: openingAmount,
          p_observaciones: notes || null,
        }),
        "La RPC no retornó la caja abierta.",
      );
    },

    async registerPatient(values) {
      const rows = await executeRpc<RegisteredPatientRpcRow[]>(
        executor,
        "registrar_paciente_atencion",
        {
          p_tipo_documento: values.patient.documentType,
          p_numero_documento: values.patient.documentNumber,
          p_nombres: values.patient.firstNames,
          p_apellidos: values.patient.lastNames,
          p_fecha_nacimiento: values.patient.birthDate,
          p_telefono: values.patient.phone || null,
          p_correo: values.patient.email || null,
          p_direccion: values.patient.address || null,
          p_crear_atencion: true,
          p_observaciones_atencion: values.attentionNotes || null,
          p_categoria_tarifaria: values.tariffCategory,
        },
      );

      return firstRow(
        rows,
        "La RPC no retornó el paciente y la atención.",
      );
    },

    async listAvailableServices(referenceDate, tariffCategory = "general") {
      const rows = await executeRpc<GuidedServiceCatalogRpcRow[]>(
        executor,
        "listar_servicios_guiados_disponibles",
        {
          p_fecha_referencia: referenceDate,
          p_categoria_tarifaria: tariffCategory,
        },
      );

      return rows.map((row) => ({
        id: row.servicio_id,
        code: row.codigo,
        name: row.nombre,
        category: row.codigo === "EX-SANGRE" ? "tipo_sangre" : "medico",
        priceCents: moneyToCents(row.monto),
        specialPriceCents: moneyToCents(row.monto),
        providerId: row.proveedor_id,
        providerName: row.proveedor_nombre ?? "Sin comisión",
        commissionCents: moneyToCents(row.comision_unitaria),
      }));
    },

    listAvailableProviders() {
      return executeRpc<ProviderRpcRow[]>(executor, "listar_proveedores", {
        p_busqueda: null,
        p_especialidad: null,
        p_estado: "activo",
        p_limite: 200,
        p_desplazamiento: 0,
      });
    },

    async assignService(values) {
      return assignSingleService(executor, values);
    },

    async assignServices(values) {
      if (values.length === 0) {
        return [];
      }

      return executeRpc<GuidedAssignedServiceRpcRow[]>(
        executor,
        "registrar_servicios_guiados",
        {
          p_atencion_id: values[0]?.attentionId,
          p_asignaciones: values.map((item) => ({
            servicio_id: item.serviceId,
            proveedor_id: item.providerId,
            cantidad: item.quantity,
          })),
        },
      );
    },

    async recordAbandonment(attentionId, reason) {
      return firstRow(
        await executeRpc<RegisteredPatientRpcRow[]>(
          executor,
          "registrar_abandono_atencion",
          { p_atencion_id: attentionId, p_motivo: reason },
        ),
        "La RPC no retornó el abandono.",
      );
    },

    async registerPayment(values) {
      return firstRow(
        await executeRpc<ReceiptRpcRow[]>(
          executor,
          "registrar_pago_atencion",
          {
            p_atencion_id: values.attentionId,
            p_metodo: values.method,
            p_monto_recibido:
              values.method === "efectivo" ? values.cashReceived : null,
            p_banco: values.method === "transferencia" ? values.bank : null,
            p_referencia_transferencia:
              values.method === "transferencia"
                ? values.transferReference
                : null,
            p_fecha_transferencia:
              values.method === "transferencia" ? values.transferDate : null,
            p_observaciones: values.notes || null,
          },
        ),
        "La RPC no retornó el pago.",
      );
    },

    async markUnpaid(attentionId, reason = "") {
      return firstRow(
        await executeRpc<GuidedUnpaidRpcRow[]>(
          executor,
          "registrar_no_cobrado_atencion",
          {
            p_atencion_id: attentionId,
            p_motivo: reason || null,
          },
        ),
        "La RPC no retornó la atención no cobrada.",
      );
    },

    async getDayState() {
      const rows = await executeRpc<JsonRpcRow<GuidedDayRpcState>[]>(
        executor,
        "obtener_jornada_guiada",
        {},
      );
      const state = rows[0]?.jornada;
      if (!state) {
        throw new GuidedOperationServiceError(
          "La RPC no retornó el estado de la jornada.",
        );
      }
      return state;
    },

    async closeDay(values) {
      const deposit = values.deposit
        ? {
            fecha_deposito: values.deposit.depositDate || null,
            monto_depositado: values.deposit.depositedAmount,
            monto_aplicado:
              values.deposit.appliedAmount ?? values.deposit.depositedAmount,
            banco: values.deposit.bank,
            referencia: values.deposit.reference,
            evidencia_url: values.deposit.evidenceUrl || null,
            observaciones: values.deposit.notes || null,
          }
        : null;

      const rows = await executeRpc<JsonRpcRow<GuidedCloseDayRpcResult>[]>(
        executor,
        "cerrar_jornada_guiada",
        {
          p_efectivo_declarado: values.declaredCash,
          p_deposito: deposit,
          p_observaciones: values.notes || null,
        },
      );
      const result = rows[0]?.resultado;
      if (!result) {
        throw new GuidedOperationServiceError(
          "La RPC no retornó el cierre de jornada.",
        );
      }
      return result;
    },
  };
}
