import type { RpcExecutor } from "@/types/rpc";

import type {
  CashClosingRpcRow,
  CashClosingValues,
  DirectCashClosingValues,
  CashOpeningValues,
  CashSessionRpcRow,
  PendingChargeRpcRow,
  PaymentValues,
  ReceiptAnnulmentValues,
  ReceiptRpcRow,
} from "../types/caja.types";

export interface CashService {
  openCashRegister(values: CashOpeningValues): Promise<CashSessionRpcRow>;
  getCurrentCashRegister(): Promise<CashSessionRpcRow | null>;
  listPendingCharges(): Promise<readonly PendingChargeRpcRow[]>;
  registerPayment(values: PaymentValues): Promise<ReceiptRpcRow>;
  annulReceipt(values: ReceiptAnnulmentValues): Promise<ReceiptRpcRow>;
  closeCashRegister(
    values: CashClosingValues,
  ): Promise<CashClosingRpcRow>;
  closeCashRegisterWithTotal(
    values: DirectCashClosingValues,
  ): Promise<CashClosingRpcRow>;
  listReceipts(cashSessionId: string): Promise<readonly ReceiptRpcRow[]>;
}

export class CashServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "CashServiceError";
    this.code = code;
  }
}

function rpcErrorMessage(message: string): string {
  if (message.includes("CLAVE_ANULACION_NO_CONFIGURADA")) {
    return "La clave administrativa de anulación todavía no está configurada en Supabase Vault.";
  }

  if (message.includes("CLAVE_ANULACION_INVALIDA")) {
    return "La clave administrativa no es correcta.";
  }

  return message;
}

async function executeRpc<TResult>(
  executor: RpcExecutor,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<TResult> {
  const response = await executor.rpc<TResult>(functionName, parameters);

  if (response.error) {
    throw new CashServiceError(
      rpcErrorMessage(response.error.message),
      response.error.code,
    );
  }

  if (response.data === null) {
    throw new CashServiceError(
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
    throw new CashServiceError(message);
  }

  return row;
}

export function createCashService(executor: RpcExecutor): CashService {
  return {
    async openCashRegister(values) {
      const rows = await executeRpc<CashSessionRpcRow[]>(
        executor,
        "abrir_caja",
        {
          p_monto_inicial: Number(values.openingAmount),
          p_observaciones: values.notes || null,
        },
      );

      return firstRowOrThrow(rows, "La RPC no retornó la caja abierta.");
    },

    async getCurrentCashRegister() {
      const rows = await executeRpc<CashSessionRpcRow[]>(
        executor,
        "obtener_caja_actual",
        {},
      );

      return rows[0] ?? null;
    },

    listPendingCharges() {
      return executeRpc<PendingChargeRpcRow[]>(
        executor,
        "listar_atenciones_pendientes_cobro",
        {},
      );
    },

    async registerPayment(values) {
      const rows = await executeRpc<ReceiptRpcRow[]>(
        executor,
        "registrar_pago_atencion",
        {
          p_atencion_id: values.attentionId,
          p_metodo: values.method,
          p_monto_recibido:
            values.method === "efectivo"
              ? Number(values.cashReceived)
              : null,
          p_banco:
            values.method === "transferencia" ? values.bank : null,
          p_referencia_transferencia:
            values.method === "transferencia"
              ? values.transferReference
              : null,
          p_fecha_transferencia:
            values.method === "transferencia"
              ? values.transferDate
              : null,
          p_observaciones: values.notes || null,
        },
      );

      return firstRowOrThrow(rows, "La RPC no retornó el recibo.");
    },

    async annulReceipt(values) {
      const rows = await executeRpc<ReceiptRpcRow[]>(
        executor,
        "anular_recibo",
        {
          p_recibo_id: values.receiptId,
          p_motivo: values.reason,
          p_clave_administrativa: values.adminKey,
        },
      );

      return firstRowOrThrow(
        rows,
        "La RPC no retornó el recibo anulado.",
      );
    },

    async closeCashRegister(values) {
      const counts = values.denominationCounts
        .map((count) => ({
          codigo: count.denominationId,
          cantidad: Number(count.quantity || "0"),
        }))
        .filter((count) => count.cantidad > 0);

      const rows = await executeRpc<CashClosingRpcRow[]>(
        executor,
        "cerrar_caja",
        {
          p_conteo: counts,
          p_observaciones: values.notes || null,
        },
      );

      return firstRowOrThrow(rows, "La RPC no retornó el cierre.");
    },

    async closeCashRegisterWithTotal(values) {
      const rows = await executeRpc<CashClosingRpcRow[]>(
        executor,
        "cerrar_caja_con_total",
        {
          p_efectivo_declarado: values.declaredCash,
          p_observaciones: values.notes || null,
        },
      );

      return firstRowOrThrow(rows, "La RPC no retornó el cierre.");
    },

    listReceipts(cashSessionId) {
      return executeRpc<ReceiptRpcRow[]>(
        executor,
        "listar_recibos_caja",
        {
          p_caja_sesion_id: cashSessionId,
        },
      );
    },
  };
}
