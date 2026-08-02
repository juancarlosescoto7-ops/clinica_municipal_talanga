export type ReconciliationStatus =
  | "borrador"
  | "con_diferencia"
  | "confirmado";

export interface ReconciliationPaymentRow {
  label: string;
  transactions: number;
  amount: number;
  tone: "cash" | "transfer";
}

export interface ReconciliationHistoryRow {
  id: string;
  date: string;
  expectedAmount: number;
  declaredAmount: number;
  difference: number;
  status: ReconciliationStatus;
}

export interface DailyReconciliationOverview {
  date: string;
  cashSessionCode: string;
  validReceipts: number;
  annulledReceipts: number;
  expectedCash: number;
  transferAmount: number;
  totalCollected: number;
  paymentRows: readonly ReconciliationPaymentRow[];
  history: readonly ReconciliationHistoryRow[];
}

export interface ReconciliationRpcRow {
  id?: string;
  arqueo_id?: string;
  numero_arqueo: string;
  caja_sesion_id: string;
  fecha: string;
  total_efectivo: string;
  total_transferencias: string;
  total_cobrado: string;
  efectivo_esperado: string;
  efectivo_declarado: string;
  diferencia: string;
  estado: ReconciliationStatus;
  justificacion: string | null;
  confirmado_en: string | null;
  created_at?: string;
  updated_at?: string;
}
