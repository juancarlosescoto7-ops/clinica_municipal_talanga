import type { TariffCategory } from "@/modules/pacientes/types/pacientes.types";

export const SERVICE_STATUS_LABELS = {
  activo: "Activo",
  inactivo: "Inactivo",
} as const;

export type ServiceStatus = keyof typeof SERVICE_STATUS_LABELS;

export const RATE_VALIDITY_LABELS = {
  vigente: "Vigente",
  programada: "Programada",
  vencida: "Vencida",
} as const;

export type RateValidity = keyof typeof RATE_VALIDITY_LABELS;

export interface ServiceFormValues {
  code: string;
  name: string;
  description: string;
  status: ServiceStatus;
}

export interface RateFormValues {
  serviceId: string;
  amount: string;
  validFrom: string;
  validUntil: string;
  tariffCategory?: TariffCategory;
}

export interface AssignServiceValues {
  attentionId: string;
  serviceId: string;
  quantity: number;
}

export interface ServiceRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRateRecord {
  id: string;
  serviceId: string;
  amountCents: number;
  currency: "HNL";
  tariffCategory: TariffCategory;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
}

export interface ServicesSessionState {
  services: readonly ServiceRecord[];
  rates: readonly ServiceRateRecord[];
}

export interface ServiceSessionOperationResult {
  state: ServicesSessionState;
  success: boolean;
  message: string;
  serviceId?: string;
  rateId?: string;
}

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export interface ValidationResult<T> {
  isValid: boolean;
  errors: ValidationErrors<T>;
}

export interface ServiceRpcRow {
  servicio_id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: ServiceStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalogRpcRow extends ServiceRpcRow {
  tarifa_vigente_id: string | null;
  monto_vigente: string | null;
  moneda: "HNL" | null;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  categoria_tarifaria: TariffCategory | null;
  total_resultados: string;
}

export interface ServiceRateRpcRow {
  tarifa_id: string;
  servicio_id: string;
  monto: string;
  moneda: "HNL";
  categoria_tarifaria: TariffCategory;
  vigente_desde: string;
  vigente_hasta: string | null;
  estado_vigencia: RateValidity;
  created_at: string;
}

export interface AttentionServiceRpcRow {
  atencion_servicio_id: string;
  atencion_id: string;
  servicio_id: string;
  tarifa_id: string;
  cantidad: number;
  monto_unitario: string;
  subtotal: string;
  moneda: "HNL";
}
