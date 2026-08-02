import {
  CASH_DENOMINATIONS,
  type CashClosingValues,
  type CashOpeningValues,
  type PaymentValues,
  type ReceiptAnnulmentValues,
  type ValidationErrors,
  type ValidationResult,
} from "../types/caja.types";

const MONEY_PATTERN = /^\d{1,7}(?:\.\d{1,2})?$/;
const INTEGER_PATTERN = /^\d+$/;

function resultFor<T>(errors: ValidationErrors<T>): ValidationResult<T> {
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

function todayAsLocalIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseMoneyToCents(
  value: string,
  allowZero = false,
): number | null {
  const normalizedValue = value.trim();

  if (!MONEY_PATTERN.test(normalizedValue)) {
    return null;
  }

  const amount = Number(normalizedValue);
  const minimum = allowZero ? 0 : 0.01;

  if (
    !Number.isFinite(amount) ||
    amount < minimum ||
    amount > 9_999_999.99
  ) {
    return null;
  }

  return Math.round(amount * 100);
}

export function validateCashOpening(
  values: CashOpeningValues,
): ValidationResult<CashOpeningValues> {
  const errors: ValidationErrors<CashOpeningValues> = {};

  if (parseMoneyToCents(values.openingAmount, true) === null) {
    errors.openingAmount =
      "Ingresa un monto inicial entre L 0.00 y L 9,999,999.99.";
  }

  if (values.notes.trim().length > 500) {
    errors.notes = "Las observaciones no pueden superar 500 caracteres.";
  }

  return resultFor(errors);
}

export function validatePayment(
  values: PaymentValues,
  totalCents: number,
): ValidationResult<PaymentValues> {
  const errors: ValidationErrors<PaymentValues> = {};

  if (!values.attentionId.trim()) {
    errors.attentionId = "Selecciona una atención.";
  }

  if (values.method === "efectivo") {
    const receivedCents = parseMoneyToCents(values.cashReceived);
    if (receivedCents === null || receivedCents < totalCents) {
      errors.cashReceived =
        "El efectivo recibido debe cubrir el total de la atención.";
    }
  } else {
    if (values.bank.trim().length < 2 || values.bank.trim().length > 100) {
      errors.bank = "Ingresa el banco o institución de la transferencia.";
    }

    if (
      values.transferReference.trim().length < 3 ||
      values.transferReference.trim().length > 100
    ) {
      errors.transferReference =
        "La referencia debe contener entre 3 y 100 caracteres.";
    }

    if (!values.transferDate) {
      errors.transferDate = "La fecha de transferencia es obligatoria.";
    } else if (values.transferDate > todayAsLocalIsoDate()) {
      errors.transferDate =
        "La fecha de transferencia no puede estar en el futuro.";
    }
  }

  if (values.notes.trim().length > 500) {
    errors.notes = "Las observaciones no pueden superar 500 caracteres.";
  }

  return resultFor(errors);
}

export function validateReceiptAnnulment(
  values: ReceiptAnnulmentValues,
): ValidationResult<ReceiptAnnulmentValues> {
  const errors: ValidationErrors<ReceiptAnnulmentValues> = {};

  if (!values.receiptId.trim()) {
    errors.receiptId = "Selecciona un recibo.";
  }

  const reason = values.reason.trim();
  if (reason.length < 10 || reason.length > 300) {
    errors.reason =
      "La justificación debe contener entre 10 y 300 caracteres.";
  }

  return resultFor(errors);
}

export function validateCashClosing(
  values: CashClosingValues,
): ValidationResult<CashClosingValues> {
  const errors: ValidationErrors<CashClosingValues> = {};
  const knownDenominationIds = new Set<string>(
    CASH_DENOMINATIONS.map((denomination) => denomination.id),
  );

  const invalidCount = values.denominationCounts.some((count) => {
    const normalizedQuantity = count.quantity.trim() || "0";
    return (
      !knownDenominationIds.has(count.denominationId) ||
      !INTEGER_PATTERN.test(normalizedQuantity) ||
      Number(normalizedQuantity) > 10_000
    );
  });

  if (invalidCount) {
    errors.denominationCounts =
      "Cada cantidad debe ser un entero entre 0 y 10,000.";
  }

  if (values.notes.trim().length > 500) {
    errors.notes = "Las observaciones no pueden superar 500 caracteres.";
  }

  return resultFor(errors);
}
