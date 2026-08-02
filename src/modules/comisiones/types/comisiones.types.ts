export type CommissionStatus =
  | "pendiente"
  | "en_revision"
  | "liquidada";

export type ProviderSpecialty = "medicina" | "psicologia";
export type ProviderStatus = "activo" | "inactivo";
export type CommissionSettlementStatus =
  | "borrador"
  | "en_revision"
  | "liquidada";

export interface ProviderValues {
  code: string;
  fullName: string;
  specialty: ProviderSpecialty;
  status: ProviderStatus;
}

export interface ProviderCommissionRateValues {
  providerId: string;
  serviceId: string;
  unitAmount: string;
  validFrom: string;
  validUntil: string;
}

export interface ProviderRpcRow {
  proveedor_id: string;
  codigo: string;
  nombre_completo: string;
  especialidad: ProviderSpecialty;
  estado: ProviderStatus;
  created_at?: string;
  updated_at?: string;
  total_resultados?: string;
}

export interface ProviderCommissionRateRpcRow {
  tarifa_comision_id: string;
  proveedor_id: string;
  servicio_id: string;
  monto_unitario: string;
  moneda: "HNL";
  vigente_desde: string;
  vigente_hasta: string | null;
  created_at: string;
}

export interface AssignedCommissionRpcRow {
  comision_id: string;
  atencion_servicio_id: string;
  proveedor_id: string;
  servicio_id: string;
  tarifa_comision_id: string;
  cantidad: number;
  comision_unitaria: string;
  total: string;
  moneda: "HNL";
}

export interface CommissionSettlementSummaryRpcRow {
  liquidacion_id: string;
  periodo: string;
  estado: CommissionSettlementStatus;
  total_comisiones: string;
  total_proveedores: string;
  total_servicios: string;
  liquidada_en?: string;
}

export interface CommissionSettlementDetailRpcRow {
  liquidacion_id: string;
  periodo: string;
  estado: CommissionSettlementStatus;
  total_comisiones: string;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  especialidad: ProviderSpecialty | null;
  servicios_cantidad: number | null;
  comision_calculada: string | null;
  ajuste: string | null;
  total: string | null;
  observaciones: string | null;
}

export interface CommissionProviderRow {
  id: string;
  providerName: string;
  serviceName: string;
  paidServices: number;
  unitRate: number;
  grossAmount: number;
  adjustments: number;
  netAmount: number;
  status: CommissionStatus;
}

export interface CommissionsOverview {
  period: string;
  totalPaidServices: number;
  accruedAmount: number;
  liquidatedAmount: number;
  pendingAmount: number;
  providers: readonly CommissionProviderRow[];
  recentPeriods: readonly {
    id: string;
    label: string;
    totalAmount: number;
    status: CommissionStatus;
  }[];
}
