import {
  normalizeServiceCode,
  normalizeServiceValues,
  parseAmountToCents,
} from "../schemas/servicios.schema";
import type {
  RateFormValues,
  RateValidity,
  ServiceFormValues,
  ServiceRateRecord,
  ServiceRecord,
  ServiceSessionOperationResult,
  ServicesSessionState,
} from "../types/servicios.types";

export function createEmptyServicesSession(): ServicesSessionState {
  return {
    services: [],
    rates: [],
  };
}

function createIdentifier(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function todayAsLocalIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hasDuplicateService(
  state: ServicesSessionState,
  values: ServiceFormValues,
  excludedServiceId?: string,
): "code" | "name" | null {
  const normalizedCode = normalizeServiceCode(values.code);
  const normalizedName = values.name.trim().toLocaleLowerCase("es");

  for (const service of state.services) {
    if (service.id === excludedServiceId) {
      continue;
    }

    if (normalizeServiceCode(service.code) === normalizedCode) {
      return "code";
    }

    if (service.name.toLocaleLowerCase("es") === normalizedName) {
      return "name";
    }
  }

  return null;
}

export function createServiceInSession(
  state: ServicesSessionState,
  rawValues: ServiceFormValues,
): ServiceSessionOperationResult {
  const values = normalizeServiceValues(rawValues);
  const duplicate = hasDuplicateService(state, values);

  if (duplicate) {
    return {
      state,
      success: false,
      message:
        duplicate === "code"
          ? "Ya existe un servicio con ese código."
          : "Ya existe un servicio con ese nombre.",
    };
  }

  const timestamp = nowIso();
  const service: ServiceRecord = {
    id: createIdentifier(),
    code: values.code,
    name: values.name,
    description: values.description || null,
    status: values.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    state: {
      ...state,
      services: [...state.services, service],
    },
    success: true,
    message: "Servicio agregado a la sesión actual.",
    serviceId: service.id,
  };
}

export function updateServiceInSession(
  state: ServicesSessionState,
  serviceId: string,
  rawValues: ServiceFormValues,
): ServiceSessionOperationResult {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service) {
    return {
      state,
      success: false,
      message: "El servicio seleccionado ya no está disponible.",
    };
  }

  const values = normalizeServiceValues(rawValues);
  const duplicate = hasDuplicateService(state, values, serviceId);

  if (duplicate) {
    return {
      state,
      success: false,
      message:
        duplicate === "code"
          ? "Ya existe otro servicio con ese código."
          : "Ya existe otro servicio con ese nombre.",
    };
  }

  const updatedService: ServiceRecord = {
    ...service,
    code: values.code,
    name: values.name,
    description: values.description || null,
    status: values.status,
    updatedAt: nowIso(),
  };

  return {
    state: {
      ...state,
      services: state.services.map((item) =>
        item.id === serviceId ? updatedService : item,
      ),
    },
    success: true,
    message: "Servicio actualizado en la sesión actual.",
    serviceId,
  };
}

function dateRangesOverlap(
  leftStart: string,
  leftEnd: string | null,
  rightStart: string,
  rightEnd: string | null,
): boolean {
  const leftLastDate = leftEnd ?? "9999-12-31";
  const rightLastDate = rightEnd ?? "9999-12-31";

  return leftStart <= rightLastDate && rightStart <= leftLastDate;
}

export function scheduleRateInSession(
  state: ServicesSessionState,
  values: RateFormValues,
): ServiceSessionOperationResult {
  const serviceExists = state.services.some(
    (service) => service.id === values.serviceId,
  );

  if (!serviceExists) {
    return {
      state,
      success: false,
      message: "El servicio seleccionado ya no está disponible.",
    };
  }

  const amountCents = parseAmountToCents(values.amount);
  if (amountCents === null) {
    return {
      state,
      success: false,
      message: "El monto ingresado no es válido.",
    };
  }

  const newEnd = values.validUntil || null;
  const overlaps = state.rates.some(
    (rate) =>
      rate.serviceId === values.serviceId &&
      dateRangesOverlap(
        values.validFrom,
        newEnd,
        rate.validFrom,
        rate.validUntil,
      ),
  );

  if (overlaps) {
    return {
      state,
      success: false,
      message:
        "La vigencia se superpone con otra tarifa del mismo servicio.",
    };
  }

  const rate: ServiceRateRecord = {
    id: createIdentifier(),
    serviceId: values.serviceId,
    amountCents,
    currency: "HNL",
    tariffCategory: values.tariffCategory ?? "general",
    validFrom: values.validFrom,
    validUntil: newEnd,
    createdAt: nowIso(),
  };

  return {
    state: {
      ...state,
      rates: [...state.rates, rate],
    },
    success: true,
    message: "Tarifa agregada a la sesión actual.",
    serviceId: values.serviceId,
    rateId: rate.id,
  };
}

export function getRateValidity(
  rate: ServiceRateRecord,
  referenceDate = todayAsLocalIsoDate(),
): RateValidity {
  if (rate.validFrom > referenceDate) {
    return "programada";
  }

  if (rate.validUntil && rate.validUntil < referenceDate) {
    return "vencida";
  }

  return "vigente";
}

export function getCurrentRate(
  rates: readonly ServiceRateRecord[],
  serviceId: string,
  tariffCategory: ServiceRateRecord["tariffCategory"] = "general",
): ServiceRateRecord | undefined {
  return rates.find(
    (rate) =>
      rate.serviceId === serviceId &&
      rate.tariffCategory === tariffCategory &&
      getRateValidity(rate) === "vigente",
  );
}

export function filterServices(
  services: readonly ServiceRecord[],
  searchTerm: string,
  status: "todos" | ServiceRecord["status"],
): readonly ServiceRecord[] {
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase("es");

  return services.filter((service) => {
    const matchesStatus = status === "todos" || service.status === status;
    const matchesTerm =
      !normalizedTerm ||
      `${service.code} ${service.name}`
        .toLocaleLowerCase("es")
        .includes(normalizedTerm);

    return matchesStatus && matchesTerm;
  });
}
