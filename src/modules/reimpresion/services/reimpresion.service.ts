import type { RpcExecutor } from "@/types/rpc";

import type {
  PublicReceiptVerificationRpcRow,
  ReceiptReprintRpcRow,
} from "../types/reimpresion.types";

export interface ReceiptReprintService {
  authorizeReprint(
    receiptNumber: number,
    adminKey: string,
  ): Promise<ReceiptReprintRpcRow>;
  verifyReceipt(receiptId: string): Promise<PublicReceiptVerificationRpcRow | null>;
}

export class ReceiptReprintServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ReceiptReprintServiceError";
    this.code = code;
  }
}

function rpcErrorMessage(message: string): string {
  if (message.includes("Could not find the function public.reimprimir_recibo")) {
    return "La función de reimpresión todavía no está publicada en Supabase. Ejecute el instalador actualizado y recargue la caché de la Data API.";
  }

  if (message.includes("CLAVE_ANULACION_NO_CONFIGURADA")) {
    return "La clave administrativa todavía no está configurada en Supabase Vault.";
  }

  if (message.includes("CLAVE_ANULACION_INVALIDA")) {
    return "La clave administrativa no es correcta.";
  }

  if (message.includes("RECIBO_NO_EXISTE")) {
    return "No existe un recibo con ese número.";
  }

  if (message.includes("RECIBO_NO_VALIDO")) {
    return "El recibo está anulado y no puede reimprimirse.";
  }

  if (message.includes("REIMPRESION_REQUIERE_AUTENTICACION")) {
    return "La sesión terminó. Inicie sesión nuevamente para reimprimir.";
  }

  if (message.includes("NUMERO_RECIBO_INVALIDO")) {
    return "Ingrese un número de recibo válido.";
  }

  return message;
}

async function executeRpc<TResult>(
  executor: RpcExecutor,
  name: string,
  parameters: Record<string, unknown>,
): Promise<TResult> {
  const response = await executor.rpc<TResult>(name, parameters);

  if (response.error) {
    throw new ReceiptReprintServiceError(
      rpcErrorMessage(response.error.message),
      response.error.code,
    );
  }

  if (response.data === null) {
    throw new ReceiptReprintServiceError(`La RPC ${name} no retornó datos.`);
  }

  return response.data;
}

export function createReceiptReprintService(
  executor: RpcExecutor,
): ReceiptReprintService {
  return {
    async authorizeReprint(receiptNumber, adminKey) {
      const rows = await executeRpc<ReceiptReprintRpcRow[]>(
        executor,
        "reimprimir_recibo",
        {
          p_numero_recibo: receiptNumber,
          p_clave_administrativa: adminKey,
        },
      );
      const receipt = rows[0];

      if (!receipt) {
        throw new ReceiptReprintServiceError(
          "La consulta no retornó el recibo solicitado.",
        );
      }

      return receipt;
    },

    async verifyReceipt(receiptId) {
      const rows = await executeRpc<PublicReceiptVerificationRpcRow[]>(
        executor,
        "verificar_recibo_publico",
        { p_recibo_id: receiptId },
      );

      return rows[0] ?? null;
    },
  };
}
