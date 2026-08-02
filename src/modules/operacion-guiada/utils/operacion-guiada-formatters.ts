import type {
  GuidedCase,
  GuidedServiceDefinition,
} from "../types/operacion-guiada.types";

export function formatHnl(cents: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(cents / 100);
}

export function getGuidedServicePriceCents(
  service: GuidedServiceDefinition,
): number {
  return service.priceCents;
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
