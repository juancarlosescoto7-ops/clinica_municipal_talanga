export type ReportKind =
  | "atenciones"
  | "abandonos"
  | "servicios"
  | "ingresos"
  | "caja"
  | "arqueos"
  | "depositos"
  | "comisiones";

export interface ReportCatalogItem {
  id: ReportKind;
  label: string;
  description: string;
  code: string;
  category: "operativo" | "financiero";
}

export interface ReportRow {
  id: string;
  date: string;
  concept: string;
  detail: string;
  status: string;
  amount: number | null;
}

export interface ReportTrendRow {
  label: string;
  value: number;
  percentage: number;
}

export interface ReportsOverview {
  catalog: readonly ReportCatalogItem[];
  attentionsThisMonth: number;
  collectedThisMonth: number;
  paidAttentions: number;
  closedCashSessions: number;
  trend: readonly ReportTrendRow[];
}

export type MonthlyRateCategory =
  | "general"
  | "tercera_edad"
  | "policia"
  | "medico"
  | "psicologico"
  | "tipo_sangre";

export interface MonthlyServiceSummary {
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  rateCategory: MonthlyRateCategory;
  quantity: number;
  unitPrice: number;
  income: number;
}

export interface MonthlyProviderCommission {
  provider: string;
  specialty: "Medicina" | "Psicología";
  services: number;
  unitCommission: number;
  totalCommission: number;
}

export interface MonthlySalary {
  person: string;
  role: string;
  monthlySalary: number;
}

export interface MonthlyDailySummary {
  date: string;
  patientsAttended: number;
  validReceipts: number;
  generalMedicalExams: number;
  seniorMedicalExams: number;
  policeMedicalExams: number;
  bloodTypeExams: number;
  cancelledMedicalExams: number;
  cancelledBloodTypeExams: number;
  cancelledReceipts: number;
  uncollectedAttentions: number;
  income: number;
}

export interface MonthlyManagementReport {
  id: string;
  periodIso: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  headerText: string;
  patientsAttended: number;
  validReceipts: number;
  cancelledReceipts: number;
  uncollectedAttentions: number;
  medicalExams: number;
  bloodTypeExams: number;
  cancelledMedicalExams: number;
  cancelledBloodTypeExams: number;
  services: readonly MonthlyServiceSummary[];
  dailySummary: readonly MonthlyDailySummary[];
  providerCommissions: readonly MonthlyProviderCommission[];
  salaries: readonly MonthlySalary[];
  grossIncome: number;
  totalCommissions: number;
  totalSalaries: number;
  generalProfit: number;
}

export interface MonthlyReportSummaryRpcRow {
  informe_id: string;
  periodo: string;
  pacientes_atendidos: number;
  examenes_medicos: number;
  examenes_tipo_sangre: number;
  ingresos_brutos: string;
  total_comisiones: string;
  total_salarios: string;
  ganancia_general: string;
  generado_en: string;
}

export interface PersistedMonthlyReport {
  id: string;
  periodo: string;
  encabezado: string;
  generado_en: string;
  pacientes_atendidos: number;
  recibos_validos: number;
  recibos_anulados: number;
  atenciones_no_cobradas: number;
  examenes_medicos: number;
  examenes_tipo_sangre: number;
  examenes_medicos_anulados: number;
  examenes_tipo_sangre_anulados: number;
  ingresos_brutos: number;
  total_comisiones: number;
  total_salarios: number;
  ganancia_general: number;
  servicios: readonly {
    servicio_id: string;
    codigo: string;
    nombre: string;
    categoria_tarifaria: MonthlyRateCategory;
    cantidad: number;
    ingreso: number;
  }[];
  detalle_diario: readonly {
    fecha: string;
    pacientes_atendidos: number;
    recibos_validos: number;
    examenes_medicos_general: number;
    examenes_medicos_tercera_edad: number;
    examenes_medicos_policia: number;
    examenes_tipo_sangre: number;
    examenes_medicos_anulados: number;
    examenes_tipo_sangre_anulados: number;
    recibos_anulados: number;
    atenciones_no_cobradas: number;
    ingresos: number;
  }[];
  comisiones: readonly {
    proveedor_id: string;
    proveedor: string;
    especialidad: "medicina" | "psicologia";
    servicios: number;
    comision_promedio: number;
    total: number;
  }[];
  salarios: readonly {
    personal_id: string;
    persona: string;
    cargo: string;
    salario: number;
  }[];
}

export interface MonthlyReportListRpcRow {
  id: string;
  periodo: string;
  encabezado: string;
  pacientes_atendidos: number;
  examenes_medicos: number;
  examenes_tipo_sangre: number;
  ingresos_brutos: string;
  total_comisiones: string;
  total_salarios: string;
  ganancia_general: string;
  estado: "generado";
  generado_en: string;
}
