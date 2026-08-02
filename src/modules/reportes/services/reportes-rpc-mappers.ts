import type {
  MonthlyManagementReport,
  PersistedMonthlyReport,
} from "../types/reportes.types";

const monthFormatter = new Intl.DateTimeFormat("es-HN", {
  month: "long",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function reportDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

export function mapPersistedMonthlyReport(
  report: PersistedMonthlyReport,
): MonthlyManagementReport {
  const periodStart = reportDate(report.periodo);
  const periodEnd = new Date(
    periodStart.getFullYear(),
    periodStart.getMonth() + 1,
    0,
    12,
  );

  return {
    id: report.id,
    periodIso: report.periodo,
    period: monthFormatter.format(periodStart),
    periodStart: dateFormatter.format(periodStart),
    periodEnd: dateFormatter.format(periodEnd),
    generatedAt: dateTimeFormatter.format(new Date(report.generado_en)),
    headerText: report.encabezado,
    patientsAttended: Number(report.pacientes_atendidos),
    validReceipts: Number(report.recibos_validos),
    cancelledReceipts: Number(report.recibos_anulados),
    uncollectedAttentions: Number(report.atenciones_no_cobradas),
    medicalExams: Number(report.examenes_medicos),
    bloodTypeExams: Number(report.examenes_tipo_sangre),
    cancelledMedicalExams: Number(report.examenes_medicos_anulados),
    cancelledBloodTypeExams: Number(
      report.examenes_tipo_sangre_anulados,
    ),
    services: report.servicios.map((item) => ({
      serviceId: item.servicio_id,
      serviceCode: item.codigo,
      serviceName: item.nombre,
      rateCategory: item.categoria_tarifaria,
      quantity: Number(item.cantidad),
      unitPrice:
        Number(item.cantidad) > 0
          ? Number(item.ingreso) / Number(item.cantidad)
          : 0,
      income: Number(item.ingreso),
    })),
    dailySummary: report.detalle_diario.map((item) => ({
      date: item.fecha,
      patientsAttended: Number(item.pacientes_atendidos),
      validReceipts: Number(item.recibos_validos),
      generalMedicalExams: Number(item.examenes_medicos_general),
      seniorMedicalExams: Number(item.examenes_medicos_tercera_edad),
      policeMedicalExams: Number(item.examenes_medicos_policia),
      bloodTypeExams: Number(item.examenes_tipo_sangre),
      cancelledMedicalExams: Number(item.examenes_medicos_anulados),
      cancelledBloodTypeExams: Number(
        item.examenes_tipo_sangre_anulados,
      ),
      cancelledReceipts: Number(item.recibos_anulados),
      uncollectedAttentions: Number(item.atenciones_no_cobradas),
      income: Number(item.ingresos),
    })),
    providerCommissions: report.comisiones.map((item) => ({
      provider: item.proveedor,
      specialty:
        item.especialidad === "medicina" ? "Medicina" : "Psicología",
      services: Number(item.servicios),
      unitCommission: Number(item.comision_promedio),
      totalCommission: Number(item.total),
    })),
    salaries: report.salarios.map((item) => ({
      person: item.persona,
      role: item.cargo,
      monthlySalary: Number(item.salario),
    })),
    grossIncome: Number(report.ingresos_brutos),
    totalCommissions: Number(report.total_comisiones),
    totalSalaries: Number(report.total_salarios),
    generalProfit: Number(report.ganancia_general),
  };
}
