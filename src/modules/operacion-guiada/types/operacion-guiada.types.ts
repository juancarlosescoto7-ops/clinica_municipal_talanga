import type { PaymentMethod } from "@/modules/caja/types/caja.types";
import type {
  PatientRegistrationValues,
  TariffCategory,
} from "@/modules/pacientes/types/pacientes.types";

export type GuidedOperationStep =
  | "opening"
  | "patient"
  | "service"
  | "payment"
  | "closing"
  | "closed";

export type GuidedCaseStatus =
  | "pagada"
  | "no_cobrada"
  | "abandonada"
  | "anulada";

export interface GuidedPatient {
  id: string;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  tariffCategory: TariffCategory;
}

export interface GuidedServiceDefinition {
  id: string;
  code: string;
  name: string;
  category: "medico" | "tipo_sangre";
  priceCents: number;
  specialPriceCents: number;
  providerId: string | null;
  providerName: string;
  commissionCents: number;
}

export interface GuidedCase {
  id: string;
  attentionNumber: string;
  receiptId: string | null;
  receiptNumber: string | null;
  patient: GuidedPatient;
  services: readonly GuidedServiceDefinition[];
  totalCents: number;
  status: GuidedCaseStatus;
  paymentMethod: PaymentMethod | null;
  paymentBank: string | null;
  paymentReference: string | null;
  abandonmentReason: string | null;
  annulmentReason: string | null;
  annulledAt: string | null;
  createdAt: string;
}

export interface ClosingDeposit {
  amountCents: number;
  bank: string;
  reference: string;
}

export interface GuidedOperationState {
  step: GuidedOperationStep;
  activeAttentionId: string | null;
  activeAttentionNumber: string | null;
  activePatient: GuidedPatient | null;
  selectedServiceIds: readonly string[];
  cases: readonly GuidedCase[];
  nextAttentionNumber: number;
  feedback: string | null;
  closingDeposit: ClosingDeposit | null;
}

export interface GuidedRegisterPatientValues {
  patient: PatientRegistrationValues;
  attentionNotes: string;
  tariffCategory: TariffCategory;
}

export interface GuidedRegisteredPatientRpcRow {
  paciente_id: string;
  atencion_id: string;
  numero_atencion: string | number;
  estado: "registrada" | "pendiente_pago";
  tipo_documento: PatientRegistrationValues["documentType"];
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
}

export interface GuidedAssignServiceValues {
  attentionId: string;
  serviceId: string;
  providerId: string | null;
  quantity: number;
}

export interface GuidedPaymentValues {
  attentionId: string;
  method: PaymentMethod;
  cashReceived: number | null;
  bank: string | null;
  transferReference: string | null;
  transferDate: string | null;
  notes: string;
}

export interface GuidedClosingDepositValues {
  depositDate: string;
  depositedAmount: number;
  appliedAmount?: number;
  bank: string;
  reference: string;
  evidenceUrl: string;
  notes: string;
}

export interface GuidedCloseDayValues {
  declaredCash: number;
  notes: string;
  deposit: GuidedClosingDepositValues | null;
}

export interface GuidedAssignedServiceRpcRow {
  atencion_servicio_id: string;
  atencion_id: string;
  servicio_id: string;
  tarifa_id: string;
  cantidad: number;
  monto_unitario: string;
  subtotal: string;
  moneda: "HNL";
  proveedor_id: string | null;
  comision_id: string | null;
  comision_unitaria: string | null;
  comision_total: string | null;
}

export interface GuidedServiceCatalogRpcRow {
  servicio_id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tarifa_id: string;
  monto: string | number;
  moneda: "HNL";
  categoria_tarifaria: TariffCategory;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  especialidad: "medicina" | "psicologia" | null;
  comision_unitaria: string | number;
}

export interface GuidedDayAttentionRpcRow {
  atencion_id: string;
  numero_atencion: string | number;
  estado:
    | "registrada"
    | "pendiente_pago"
    | "pagada"
    | "no_cobrada"
    | "abandonada"
    | "anulada";
  categoria_tarifaria: TariffCategory;
  creada_en: string;
  motivo_abandono?: string | null;
  paciente: {
    id: string;
    numero_documento: string;
    nombre_completo: string;
    nombres?: string;
    apellidos?: string;
    fecha_nacimiento?: string;
  };
  servicios: readonly {
    atencion_servicio_id: string;
    servicio_id: string;
    codigo: string;
    nombre: string;
    cantidad: number;
    monto_unitario: string | number;
    subtotal: string | number;
    proveedor_id: string | null;
    proveedor_nombre: string | null;
  }[];
  pago: {
    recibo_id: string;
    numero_recibo: string | number;
    total: string | number;
    estado: "valido" | "anulado";
    metodo: PaymentMethod;
    banco: string | null;
    referencia: string | null;
    emitido_en: string;
    anulado_en: string | null;
    motivo_anulacion: string | null;
  } | null;
}

export interface GuidedUnpaidRpcRow {
  atencion_id: string;
  numero_atencion: string;
  paciente_id: string;
  estado: "no_cobrada";
  motivo: string | null;
  actualizado_en: string;
}

export interface GuidedDayRpcState {
  caja: {
    id: string;
    estado: "abierta" | "cerrada";
    monto_inicial: number;
    abierta_en: string;
    observaciones_apertura?: string | null;
    cerrada_en: string | null;
    efectivo_esperado: number | null;
    efectivo_declarado: number | null;
    diferencia: number | null;
    observaciones_cierre?: string | null;
  } | null;
  resumen: {
    pacientes: number;
    pagadas: number;
    no_cobradas: number;
    abandonadas: number;
    anuladas: number;
    total_cobrado: number;
    efectivo: number;
    transferencias: number;
  };
  atenciones: readonly GuidedDayAttentionRpcRow[];
  deposito?: {
    id: string;
    numero: string | number;
    fecha: string;
    banco: string;
    referencia: string;
    monto_depositado: string | number;
    monto_aplicado: string | number;
    estado: string;
    evidencia_url: string | null;
    observaciones: string | null;
  } | null;
}

export interface GuidedCloseDayRpcResult {
  caja_sesion_id: string;
  conteo_id: string;
  arqueo_id: string;
  estado_arqueo: "confirmado" | "con_diferencia";
  total_cobrado: number;
  efectivo_recaudado: number;
  transferencias: number;
  efectivo_esperado: number;
  efectivo_declarado: number;
  diferencia: number;
  deposito_id: string | null;
  numero_deposito: string | null;
}
