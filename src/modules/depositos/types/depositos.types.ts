export type DepositStatus =
  | "pendiente"
  | "conciliado"
  | "con_diferencia";

export type PersistedDepositStatus =
  | "registrado"
  | "conciliado"
  | "con_diferencia"
  | "anulado";

export interface DepositAssignmentValues {
  reconciliationId: string;
  amount: number;
}

export interface DepositValues {
  depositDate: string;
  bank: string;
  reference: string;
  depositedAmount: number;
  assignments: readonly DepositAssignmentValues[];
  evidenceUrl: string;
  notes: string;
}

export interface PendingDepositReconciliationRpcRow {
  arqueo_id: string;
  numero_arqueo: string;
  fecha: string;
  efectivo_recaudado: string;
  monto_asignado: string;
  monto_disponible: string;
}

export interface DepositRpcRow {
  id?: string;
  deposito_id?: string;
  numero_deposito: string;
  fecha_deposito: string;
  banco: string;
  referencia: string;
  monto_esperado: string;
  monto_depositado: string;
  diferencia: string;
  estado: PersistedDepositStatus;
  evidencia_url: string | null;
  observaciones: string | null;
  anulado_en?: string | null;
  motivo_anulacion?: string | null;
}

export interface DepositDetailRpcRow {
  deposito: DepositRpcRow;
  asignaciones: readonly {
    arqueo_id: string;
    numero_arqueo: string;
    fecha: string;
    monto_aplicado: string;
  }[];
}

export interface DepositHistoryRow {
  id: string;
  depositDate: string;
  bank: string;
  reference: string;
  expectedAmount: number;
  depositedAmount: number;
  difference: number;
  status: DepositStatus;
  hasEvidence: boolean;
}

export interface DepositOverview {
  pendingAmount: number;
  depositedThisMonth: number;
  pendingReconciliations: number;
  differenceThisMonth: number;
  sourceReconciliations: readonly {
    id: string;
    date: string;
    availableAmount: number;
    status: "disponible" | "incluido";
  }[];
  history: readonly DepositHistoryRow[];
}
