import {
  RATE_VALIDITY_LABELS,
  SERVICE_STATUS_LABELS,
  type RateValidity,
  type ServiceStatus,
} from "../types/servicios.types";

const currencyFormatter = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatHnlFromCents(amountCents: number): string {
  return currencyFormatter.format(amountCents / 100);
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

export function getServiceStatusLabel(status: ServiceStatus): string {
  return SERVICE_STATUS_LABELS[status];
}

export function getRateValidityLabel(validity: RateValidity): string {
  return RATE_VALIDITY_LABELS[validity];
}

