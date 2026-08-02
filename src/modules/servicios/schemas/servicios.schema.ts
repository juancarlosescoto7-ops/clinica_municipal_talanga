import type {
  AssignServiceValues,
  RateFormValues,
  ServiceFormValues,
  ValidationErrors,
  ValidationResult,
} from "../types/servicios.types";

const SERVICE_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;
const MONEY_PATTERN = /^\d{1,6}(?:\.\d{1,2})?$/;

function resultFor<T>(errors: ValidationErrors<T>): ValidationResult<T> {
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeServiceCode(value: string): string {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function normalizeServiceValues(
  values: ServiceFormValues,
): ServiceFormValues {
  return {
    ...values,
    code: normalizeServiceCode(values.code),
    name: values.name.trim().replace(/\s+/g, " "),
    description: values.description.trim().replace(/\s+/g, " "),
  };
}

export function validateService(
  rawValues: ServiceFormValues,
): ValidationResult<ServiceFormValues> {
  const values = normalizeServiceValues(rawValues);
  const errors: ValidationErrors<ServiceFormValues> = {};

  if (!SERVICE_CODE_PATTERN.test(values.code)) {
    errors.code =
      "Usa entre 3 y 20 letras mayúsculas, números o guiones.";
  }

  if (values.name.length < 3 || values.name.length > 120) {
    errors.name = "El nombre debe contener entre 3 y 120 caracteres.";
  }

  if (values.description.length > 500) {
    errors.description =
      "La descripción no puede superar 500 caracteres.";
  }

  if (values.status !== "activo" && values.status !== "inactivo") {
    errors.status = "Selecciona un estado válido.";
  }

  return resultFor(errors);
}

export function parseAmountToCents(value: string): number | null {
  const normalizedValue = value.trim();

  if (!MONEY_PATTERN.test(normalizedValue)) {
    return null;
  }

  const amount = Number(normalizedValue);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999.99) {
    return null;
  }

  return Math.round(amount * 100);
}

export function validateRate(
  values: RateFormValues,
): ValidationResult<RateFormValues> {
  const errors: ValidationErrors<RateFormValues> = {};

  if (!values.serviceId.trim()) {
    errors.serviceId = "Selecciona un servicio.";
  }

  if (parseAmountToCents(values.amount) === null) {
    errors.amount = "Ingresa un monto entre L 0.01 y L 999,999.99.";
  }

  if (!values.validFrom) {
    errors.validFrom = "La fecha inicial es obligatoria.";
  }

  if (
    values.validUntil &&
    values.validFrom &&
    values.validUntil < values.validFrom
  ) {
    errors.validUntil =
      "La fecha final no puede ser anterior a la fecha inicial.";
  }

  return resultFor(errors);
}

export function validateServiceAssignment(
  values: AssignServiceValues,
): ValidationResult<AssignServiceValues> {
  const errors: ValidationErrors<AssignServiceValues> = {};

  if (!values.attentionId.trim()) {
    errors.attentionId = "Selecciona una atención.";
  }

  if (!values.serviceId.trim()) {
    errors.serviceId = "Selecciona un servicio.";
  }

  if (!Number.isInteger(values.quantity) || values.quantity < 1) {
    errors.quantity = "La cantidad debe ser un entero mayor que cero.";
  }

  return resultFor(errors);
}

