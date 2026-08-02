import type {
  GuidedCase,
  GuidedServiceDefinition,
} from "../types/operacion-guiada.types";

export const GUIDED_SERVICE_CATALOG: readonly GuidedServiceDefinition[] = [
  {
    id: "service-medical-exam",
    code: "EX-MED",
    name: "Exámenes médicos",
    category: "medico",
    priceCents: 50000,
    specialPriceCents: 35000,
    providerId: "provider-medical",
    providerName: "Ronald Deris Reyes",
    commissionCents: 7000,
  },
  {
    id: "service-blood-type-exam",
    code: "EX-SANGRE",
    name: "Examen de tipo de sangre",
    category: "tipo_sangre",
    priceCents: 5000,
    specialPriceCents: 5000,
    providerId: null,
    providerName: "Sin comisión",
    commissionCents: 0,
  },
];

export function getGuidedServicePriceCents(
  service: GuidedServiceDefinition,
  tariffCategory: "general" | "tercera_edad" | "policia",
): number {
  return tariffCategory === "general"
    ? service.priceCents
    : service.specialPriceCents;
}

export function formatHnl(cents: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(cents / 100);
}

export function getPaidCases(
  cases: readonly GuidedCase[],
): readonly GuidedCase[] {
  return cases.filter((item) => item.status === "pagada");
}

export function getPaidTotalCents(cases: readonly GuidedCase[]): number {
  return getPaidCases(cases).reduce(
    (total, item) => total + item.totalCents,
    0,
  );
}

export function getPaidTotalByMethodCents(
  cases: readonly GuidedCase[],
  method: "efectivo" | "transferencia",
): number {
  return getPaidCases(cases)
    .filter((item) => item.paymentMethod === method)
    .reduce((total, item) => total + item.totalCents, 0);
}
