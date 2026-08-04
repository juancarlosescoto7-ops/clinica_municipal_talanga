import type { PaymentMethod, ReceiptStatus } from "@/modules/caja/types/caja.types";
import type { TariffCategory } from "@/modules/pacientes/types/pacientes.types";

export interface ReceiptReprintServiceRpcRow {
  codigo: string;
  nombre: string;
  cantidad: number;
  monto_unitario: string | number;
  subtotal: string | number;
}

export interface ReceiptReprintRpcRow {
  recibo_id: string;
  numero_recibo: string | number;
  atencion_id: string;
  numero_atencion: string | number;
  emitido_en: string;
  paciente_nombre: string;
  numero_documento: string;
  categoria_tarifaria: TariffCategory;
  servicios: readonly ReceiptReprintServiceRpcRow[];
  total: string | number;
  estado: ReceiptStatus;
  metodo: PaymentMethod;
  monto_recibido: string | number | null;
  cambio: string | number | null;
  banco: string | null;
  referencia_transferencia: string | null;
  fecha_transferencia: string | null;
}

export interface PublicReceiptVerificationRpcRow {
  recibo_id: string;
  numero_recibo: string | number;
  emitido_en: string;
  total: string | number;
  moneda: "HNL";
  estado: ReceiptStatus;
  es_valido: boolean;
}
