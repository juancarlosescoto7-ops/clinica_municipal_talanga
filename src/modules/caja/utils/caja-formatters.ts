import type {
  PaymentMethod,
  ReceiptStatus,
} from "../types/caja.types";

const currencyFormatter = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatHnlFromCents(amountCents: number): string {
  return currencyFormatter.format(amountCents / 100);
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return method === "efectivo" ? "Efectivo" : "Transferencia";
}

export function getReceiptStatusLabel(status: ReceiptStatus): string {
  return status === "valido" ? "Válido" : "Anulado";
}

