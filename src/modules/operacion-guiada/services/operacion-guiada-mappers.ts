import type { CashSessionRecord } from "@/modules/caja/types/caja.types";

import type {
  GuidedCase,
  GuidedDayAttentionRpcRow,
  GuidedDayRpcState,
  GuidedOperationState,
  GuidedPatient,
  GuidedServiceDefinition,
} from "../types/operacion-guiada.types";

function moneyToCents(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function getServiceCategory(code: string): GuidedServiceDefinition["category"] {
  return code === "EX-SANGRE" ? "tipo_sangre" : "medico";
}

function mapPatient(
  row: GuidedDayAttentionRpcRow,
): GuidedPatient {
  const firstNames = row.paciente.nombres?.trim() ?? "";
  const lastNames = row.paciente.apellidos?.trim() ?? "";
  const legacyFullName = row.paciente.nombre_completo?.trim() ?? "";

  return {
    id: row.paciente.id,
    documentNumber: row.paciente.numero_documento,
    firstNames: firstNames || lastNames ? firstNames : legacyFullName,
    lastNames,
    birthDate: row.paciente.fecha_nacimiento ?? "",
    tariffCategory: row.categoria_tarifaria,
  };
}

function mapServices(
  row: GuidedDayAttentionRpcRow,
): readonly GuidedServiceDefinition[] {
  const servicesByAssignment = new Map<
    string,
    GuidedServiceDefinition & { providerNames: Set<string> }
  >();

  for (const service of row.servicios) {
    const assignmentKey = service.atencion_servicio_id;
    const existing = servicesByAssignment.get(assignmentKey);

    if (existing) {
      if (service.proveedor_nombre) {
        existing.providerNames.add(service.proveedor_nombre);
        existing.providerName = [...existing.providerNames].join(" y ");
      }
      continue;
    }

    const subtotalCents = moneyToCents(service.subtotal) ?? 0;
    const providerNames = new Set<string>();
    if (service.proveedor_nombre) {
      providerNames.add(service.proveedor_nombre);
    }

    servicesByAssignment.set(assignmentKey, {
      id: service.servicio_id,
      code: service.codigo,
      name: service.nombre,
      category: getServiceCategory(service.codigo),
      priceCents: subtotalCents,
      specialPriceCents: subtotalCents,
      providerId: service.proveedor_id,
      providerName: service.proveedor_nombre ?? "Sin comisión",
      commissionCents: 0,
      providerNames,
    });
  }

  return [...servicesByAssignment.values()].map((service) => ({
    id: service.id,
    code: service.code,
    name: service.name,
    category: service.category,
    priceCents: service.priceCents,
    specialPriceCents: service.specialPriceCents,
    providerId: service.providerId,
    providerName: service.providerName,
    commissionCents: service.commissionCents,
  }));
}

function mapTerminalCase(row: GuidedDayAttentionRpcRow): GuidedCase | null {
  if (
    row.estado !== "pagada" &&
    row.estado !== "no_cobrada" &&
    row.estado !== "abandonada" &&
    row.estado !== "anulada"
  ) {
    return null;
  }

  const services = mapServices(row);
  const calculatedTotal = services.reduce(
    (total, service) => total + service.priceCents,
    0,
  );

  return {
    id: row.atencion_id,
    attentionNumber: String(row.numero_atencion),
    receiptId: row.pago?.recibo_id ?? null,
    receiptNumber:
      row.pago?.numero_recibo === undefined
        ? null
        : String(row.pago.numero_recibo),
    patient: mapPatient(row),
    services,
    totalCents: moneyToCents(row.pago?.total ?? null) ?? calculatedTotal,
    status: row.estado,
    paymentMethod: row.pago?.metodo ?? null,
    paymentBank: row.pago?.banco ?? null,
    paymentReference: row.pago?.referencia ?? null,
    abandonmentReason: row.motivo_abandono ?? null,
    annulmentReason: row.pago?.motivo_anulacion ?? null,
    annulledAt: row.pago?.anulado_en ?? null,
    createdAt: row.creada_en,
  };
}

function getNextAttentionNumber(
  rows: readonly GuidedDayAttentionRpcRow[],
): number {
  const lastNumber = rows.reduce((largest, row) => {
    const value = Number(row.numero_atencion);
    return Number.isFinite(value) ? Math.max(largest, value) : largest;
  }, 0);
  return lastNumber + 1;
}

export function mapGuidedDayState(
  day: GuidedDayRpcState,
): GuidedOperationState {
  const activeAttention = day.atenciones.find(
    (row) => row.estado === "registrada" || row.estado === "pendiente_pago",
  );
  const cases = day.atenciones
    .map(mapTerminalCase)
    .filter((row): row is GuidedCase => row !== null);

  if (!day.caja) {
    return {
      step: "opening",
      activeAttentionId: null,
      activeAttentionNumber: null,
      activePatient: null,
      selectedServiceIds: [],
      cases,
      nextAttentionNumber: getNextAttentionNumber(day.atenciones),
      feedback: null,
      closingDeposit: day.deposito
        ? {
            amountCents:
              moneyToCents(day.deposito.monto_depositado) ?? 0,
            bank: day.deposito.banco,
            reference: day.deposito.referencia,
          }
        : null,
    };
  }

  if (day.caja.estado === "cerrada") {
    return {
      step: "closed",
      activeAttentionId: null,
      activeAttentionNumber: null,
      activePatient: null,
      selectedServiceIds: [],
      cases,
      nextAttentionNumber: getNextAttentionNumber(day.atenciones),
      feedback: null,
      closingDeposit: null,
    };
  }

  return {
    step: activeAttention
      ? activeAttention.servicios.length > 0
        ? "payment"
        : "service"
      : "patient",
    activeAttentionId: activeAttention?.atencion_id ?? null,
    activeAttentionNumber:
      activeAttention?.numero_atencion === undefined
        ? null
        : String(activeAttention.numero_atencion),
    activePatient: activeAttention ? mapPatient(activeAttention) : null,
    selectedServiceIds:
      activeAttention?.servicios.map((service) => service.servicio_id) ?? [],
    cases,
    nextAttentionNumber: getNextAttentionNumber(day.atenciones),
    feedback: null,
    closingDeposit: null,
  };
}

export function mapGuidedCashSession(
  day: GuidedDayRpcState,
): CashSessionRecord | null {
  if (!day.caja) {
    return null;
  }

  return {
    id: day.caja.id,
    code: "PRINCIPAL",
    status: day.caja.estado,
    openingAmountCents: moneyToCents(day.caja.monto_inicial) ?? 0,
    openedAt: day.caja.abierta_en,
    openingNotes: day.caja.observaciones_apertura ?? null,
    closedAt: day.caja.cerrada_en,
    expectedCashCents: moneyToCents(day.caja.efectivo_esperado),
    declaredCashCents: moneyToCents(day.caja.efectivo_declarado),
    differenceCents: moneyToCents(day.caja.diferencia),
    closingNotes: day.caja.observaciones_cierre ?? null,
  };
}
