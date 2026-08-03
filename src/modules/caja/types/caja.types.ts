export const CASH_DENOMINATIONS = [
  { id: "bill-500", valueCents: 50_000, label: "L 500", type: "billete" },
  { id: "bill-200", valueCents: 20_000, label: "L 200", type: "billete" },
  { id: "bill-100", valueCents: 10_000, label: "L 100", type: "billete" },
  { id: "bill-50", valueCents: 5_000, label: "L 50", type: "billete" },
  { id: "bill-20", valueCents: 2_000, label: "L 20", type: "billete" },
  { id: "bill-10", valueCents: 1_000, label: "L 10", type: "billete" },
  { id: "bill-5", valueCents: 500, label: "L 5", type: "billete" },
  { id: "bill-2", valueCents: 200, label: "L 2", type: "billete" },
  { id: "bill-1", valueCents: 100, label: "L 1", type: "billete" },
  { id: "coin-050", valueCents: 50, label: "50 centavos", type: "moneda" },
  { id: "coin-020", valueCents: 20, label: "20 centavos", type: "moneda" },
  { id: "coin-010", valueCents: 10, label: "10 centavos", type: "moneda" },
  { id: "coin-005", valueCents: 5, label: "5 centavos", type: "moneda" },
] as const;

export type CashDenomination = (typeof CASH_DENOMINATIONS)[number];
export type CashSessionStatus = "abierta" | "cerrada";
export type ReceiptStatus = "valido" | "anulado";
export type PaymentMethod = "efectivo" | "transferencia";

export interface CashOpeningValues {
  openingAmount: string;
  notes: string;
}

export interface PaymentValues {
  attentionId: string;
  method: PaymentMethod;
  cashReceived: string;
  bank: string;
  transferReference: string;
  transferDate: string;
  notes: string;
}

export interface ReceiptAnnulmentValues {
  receiptId: string;
  reason: string;
  adminKey: string;
}

export interface DenominationCountValue {
  denominationId: string;
  quantity: string;
}

export interface CashClosingValues {
  denominationCounts: readonly DenominationCountValue[];
  notes: string;
}

export interface DirectCashClosingValues {
  declaredCash: number;
  notes: string;
}

export interface PayableServiceItem {
  code: string;
  name: string;
  quantity: number;
  subtotalCents: number;
}

export interface PayableAttentionItem {
  id: string;
  attentionNumber: string;
  patientName: string;
  documentNumber: string;
  services: readonly PayableServiceItem[];
  totalCents: number;
  status: "pendiente_pago" | "pagada";
}

export interface CashSessionRecord {
  id: string;
  code: "PRINCIPAL";
  status: CashSessionStatus;
  openingAmountCents: number;
  openedAt: string;
  openingNotes: string | null;
  closedAt: string | null;
  expectedCashCents: number | null;
  declaredCashCents: number | null;
  differenceCents: number | null;
  closingNotes: string | null;
}

export interface ReceiptRecord {
  id: string;
  localNumber: string;
  cashSessionId: string;
  attentionId: string;
  attentionNumber: string;
  patientName: string;
  totalCents: number;
  currency: "HNL";
  status: ReceiptStatus;
  method: PaymentMethod;
  cashReceivedCents: number | null;
  changeCents: number | null;
  bank: string | null;
  transferReference: string | null;
  transferDate: string | null;
  notes: string | null;
  issuedAt: string;
  annulledAt: string | null;
  annulmentReason: string | null;
}

export interface CashCountDetailRecord {
  denominationId: string;
  label: string;
  valueCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface CashRegisterState {
  session: CashSessionRecord | null;
  attentions: readonly PayableAttentionItem[];
  receipts: readonly ReceiptRecord[];
  countDetails: readonly CashCountDetailRecord[];
  nextLocalReceiptNumber: number;
}

export interface CashSessionOperationResult {
  state: CashRegisterState;
  success: boolean;
  message: string;
  receiptId?: string;
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export interface ValidationResult<T> {
  isValid: boolean;
  errors: ValidationErrors<T>;
}

export interface CashSessionRpcRow {
  caja_sesion_id: string;
  codigo_caja: string;
  estado: CashSessionStatus;
  monto_inicial: string;
  abierta_en: string;
  cerrada_en: string | null;
  efectivo_esperado: string | null;
  efectivo_declarado: string | null;
  diferencia: string | null;
}

export interface PendingChargeRpcRow {
  atencion_id: string;
  numero_atencion: string;
  paciente_id: string;
  paciente_nombre: string;
  numero_documento: string;
  servicios: readonly {
    codigo: string;
    nombre: string;
    cantidad: number;
    subtotal: string;
  }[];
  total: string;
}

export interface ReceiptRpcRow {
  recibo_id: string;
  numero_recibo: string;
  caja_sesion_id: string;
  atencion_id: string;
  total: string;
  estado: ReceiptStatus;
  metodo: PaymentMethod;
  monto_recibido: string | null;
  cambio: string | null;
  banco: string | null;
  referencia_transferencia: string | null;
  fecha_transferencia: string | null;
  emitido_en: string;
  anulado_en: string | null;
  motivo_anulacion: string | null;
}

export interface CashClosingRpcRow extends CashSessionRpcRow {
  conteo_id: string;
}
