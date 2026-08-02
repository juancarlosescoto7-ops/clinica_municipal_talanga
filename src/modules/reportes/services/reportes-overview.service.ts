import type {
  ReportKind,
  ReportRow,
  ReportsOverview,
} from "../types/reportes.types";

const overview: ReportsOverview = {
  catalog: [
    {
      id: "atenciones",
      label: "Atenciones",
      description: "Registradas, pendientes, pagadas, abandonadas y anuladas.",
      code: "AT",
      category: "operativo",
    },
    {
      id: "abandonos",
      label: "Abandonos",
      description: "Motivos, etapa del proceso y tendencia.",
      code: "AB",
      category: "operativo",
    },
    {
      id: "ingresos",
      label: "Ingresos",
      description: "Efectivo, transferencias y recibos.",
      code: "IN",
      category: "financiero",
    },
    {
      id: "servicios",
      label: "Servicios",
      description: "Servicios cobrados y tarifas aplicadas.",
      code: "SV",
      category: "operativo",
    },
    {
      id: "caja",
      label: "Caja",
      description: "Sesiones, cierres y medios de pago.",
      code: "CJ",
      category: "financiero",
    },
    {
      id: "arqueos",
      label: "Arqueos",
      description: "Conteos, diferencias y conciliaciones.",
      code: "AR",
      category: "financiero",
    },
    {
      id: "depositos",
      label: "Depósitos",
      description: "Montos, referencias y conciliación.",
      code: "DE",
      category: "financiero",
    },
    {
      id: "comisiones",
      label: "Comisiones",
      description: "Servicios pagados y liquidaciones a proveedores.",
      code: "CO",
      category: "financiero",
    },
  ],
  attentionsThisMonth: 426,
  collectedThisMonth: 412_850,
  paidAttentions: 408,
  closedCashSessions: 24,
  trend: [
    { label: "Semana 1", value: 92, percentage: 68 },
    { label: "Semana 2", value: 108, percentage: 80 },
    { label: "Semana 3", value: 121, percentage: 90 },
    { label: "Semana 4", value: 105, percentage: 78 },
  ],
};

const reportRows: Record<ReportKind, readonly ReportRow[]> = {
  atenciones: [
    {
      id: "AT-2026-0426",
      date: "2026-07-29",
      concept: "Atención pagada",
      detail: "Paciente 09",
      status: "Pagada",
      amount: 1_050,
    },
    {
      id: "AT-2026-0425",
      date: "2026-07-29",
      concept: "Atención pendiente de pago",
      detail: "Paciente 08",
      status: "Pendiente",
      amount: 1_050,
    },
    {
      id: "AT-2026-0424",
      date: "2026-07-29",
      concept: "Atención abandonada",
      detail: "Motivo justificado",
      status: "Abandonada",
      amount: null,
    },
  ],
  abandonos: [
    {
      id: "AB-2026-018",
      date: "2026-07-27",
      concept: "Abandono antes de pago",
      detail: "Tiempo de espera informado",
      status: "Justificado",
      amount: null,
    },
    {
      id: "AB-2026-017",
      date: "2026-07-24",
      concept: "Abandono en registro",
      detail: "Documentación incompleta",
      status: "Justificado",
      amount: null,
    },
  ],
  ingresos: [
    {
      id: "REC-2026-1221",
      date: "2026-07-29",
      concept: "Pago en efectivo",
      detail: "Caja principal",
      status: "Válido",
      amount: 1_050,
    },
    {
      id: "REC-2026-1220",
      date: "2026-07-29",
      concept: "Transferencia",
      detail: "REF-2026-7721",
      status: "Válido",
      amount: 1_050,
    },
  ],
  servicios: [
    {
      id: "SER-2026-0102",
      date: "2026-07-29",
      concept: "Servicio cobrado",
      detail: "Tarifa municipal A",
      status: "Activo",
      amount: 250,
    },
    {
      id: "SER-2026-0101",
      date: "2026-07-29",
      concept: "Servicio cobrado",
      detail: "Tarifa municipal B",
      status: "Activo",
      amount: 250,
    },
  ],
  caja: [
    {
      id: "CAJ-2026-0024",
      date: "2026-07-29",
      concept: "Cierre de caja",
      detail: "Caja principal · Turno matutino",
      status: "Cerrada",
      amount: 18_450,
    },
    {
      id: "CAJ-2026-0023",
      date: "2026-07-29",
      concept: "Sesión de caja",
      detail: "Caja principal · Turno vespertino",
      status: "Abierta",
      amount: 7_350,
    },
  ],
  arqueos: [
    {
      id: "ARQ-2026-002",
      date: "2026-07-27",
      concept: "Diferencia de arqueo",
      detail: "Faltante justificado",
      status: "Revisada",
      amount: -50,
    },
  ],
  depositos: [
    {
      id: "DEP-2026-004",
      date: "2026-07-28",
      concept: "Depósito bancario",
      detail: "REF-2026-9041",
      status: "Conciliado",
      amount: 24_900,
    },
    {
      id: "DEP-2026-003",
      date: "2026-07-27",
      concept: "Depósito bancario",
      detail: "REF-2026-9038",
      status: "Con diferencia",
      amount: 22_700,
    },
  ],
  comisiones: [
    {
      id: "COM-2026-007",
      date: "2026-07-31",
      concept: "Obligación a proveedor",
      detail: "Ronald Deris Reyes",
      status: "Pendiente",
      amount: 16_520,
    },
    {
      id: "COM-2026-008",
      date: "2026-07-31",
      concept: "Obligación a proveedor",
      detail: "Suamy Michelle Barahona",
      status: "Pendiente",
      amount: 12_840,
    },
  ],
};

export function getReportsOverview(): ReportsOverview {
  return overview;
}

export function getReportRows(
  kind: ReportKind,
): readonly ReportRow[] {
  return reportRows[kind];
}
