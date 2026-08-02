import {
  parseMoneyToCents,
} from "../schemas/caja.schema";
import {
  CASH_DENOMINATIONS,
  type CashClosingValues,
  type CashOpeningValues,
  type CashRegisterState,
  type CashSessionOperationResult,
  type PayableAttentionItem,
  type PaymentValues,
  type ReceiptAnnulmentValues,
  type ReceiptRecord,
} from "../types/caja.types";

const initialAttentions: readonly PayableAttentionItem[] = [
  {
    id: "attention-001",
    attentionNumber: "AT-2026-0001",
    patientName: "Paciente 01",
    documentNumber: "0801-2000-00001",
    services: [
      {
        code: "SERV-001",
        name: "Servicio municipal A",
        quantity: 1,
        subtotalCents: 35_000,
      },
    ],
    totalCents: 35_000,
    status: "pendiente_pago",
  },
  {
    id: "attention-002",
    attentionNumber: "AT-2026-0002",
    patientName: "Paciente 02",
    documentNumber: "0801-2000-00002",
    services: [
      {
        code: "SERV-002",
        name: "Servicio municipal B",
        quantity: 1,
        subtotalCents: 45_000,
      },
    ],
    totalCents: 45_000,
    status: "pendiente_pago",
  },
];

export function createInitialCashRegisterState(): CashRegisterState {
  return {
    session: null,
    attentions: initialAttentions,
    receipts: [],
    countDetails: [],
    nextLocalReceiptNumber: 1,
  };
}

function createIdentifier(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function localDateIso(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function openCashRegisterInSession(
  state: CashRegisterState,
  values: CashOpeningValues,
): CashSessionOperationResult {
  if (state.session) {
    return {
      state,
      success: false,
      message: "La sesión actual ya contiene una apertura de caja.",
    };
  }

  const openingAmountCents = parseMoneyToCents(
    values.openingAmount,
    true,
  );
  if (openingAmountCents === null) {
    return {
      state,
      success: false,
      message: "El monto inicial no es válido.",
    };
  }

  return {
    state: {
      ...state,
      session: {
        id: createIdentifier(),
        code: "PRINCIPAL",
        status: "abierta",
        openingAmountCents,
        openedAt: nowIso(),
        openingNotes: values.notes.trim() || null,
        closedAt: null,
        expectedCashCents: null,
        declaredCashCents: null,
        differenceCents: null,
        closingNotes: null,
      },
    },
    success: true,
    message: "Caja abierta en la sesión actual.",
  };
}

export function getValidReceipts(
  state: CashRegisterState,
): readonly ReceiptRecord[] {
  return state.receipts.filter((receipt) => receipt.status === "valido");
}

export function getCashPaymentsTotalCents(
  state: CashRegisterState,
): number {
  return getValidReceipts(state)
    .filter((receipt) => receipt.method === "efectivo")
    .reduce((total, receipt) => total + receipt.totalCents, 0);
}

export function getTransferPaymentsTotalCents(
  state: CashRegisterState,
): number {
  return getValidReceipts(state)
    .filter((receipt) => receipt.method === "transferencia")
    .reduce((total, receipt) => total + receipt.totalCents, 0);
}

export function getExpectedCashCents(state: CashRegisterState): number {
  return (
    (state.session?.openingAmountCents ?? 0) +
    getCashPaymentsTotalCents(state)
  );
}

export function registerPaymentInSession(
  state: CashRegisterState,
  values: PaymentValues,
): CashSessionOperationResult {
  if (!state.session || state.session.status !== "abierta") {
    return {
      state,
      success: false,
      message: "Debe existir una caja abierta para registrar pagos.",
    };
  }

  const attention = state.attentions.find(
    (item) => item.id === values.attentionId,
  );
  if (!attention || attention.status !== "pendiente_pago") {
    return {
      state,
      success: false,
      message: "La atención seleccionada no está pendiente de pago.",
    };
  }

  const duplicate = state.receipts.some(
    (receipt) =>
      receipt.attentionId === attention.id &&
      receipt.status === "valido",
  );
  if (duplicate) {
    return {
      state,
      success: false,
      message: "La atención ya tiene un recibo válido.",
    };
  }

  const cashReceivedCents =
    values.method === "efectivo"
      ? parseMoneyToCents(values.cashReceived)
      : null;

  if (
    values.method === "efectivo" &&
    (cashReceivedCents === null ||
      cashReceivedCents < attention.totalCents)
  ) {
    return {
      state,
      success: false,
      message: "El efectivo recibido no cubre el total.",
    };
  }

  const timestamp = nowIso();
  const receipt: ReceiptRecord = {
    id: createIdentifier(),
    localNumber: `RC-${String(
      state.nextLocalReceiptNumber,
    ).padStart(6, "0")}`,
    cashSessionId: state.session.id,
    attentionId: attention.id,
    attentionNumber: attention.attentionNumber,
    patientName: attention.patientName,
    totalCents: attention.totalCents,
    currency: "HNL",
    status: "valido",
    method: values.method,
    cashReceivedCents,
    changeCents:
      cashReceivedCents === null
        ? null
        : cashReceivedCents - attention.totalCents,
    bank: values.method === "transferencia" ? values.bank.trim() : null,
    transferReference:
      values.method === "transferencia"
        ? values.transferReference.trim()
        : null,
    transferDate:
      values.method === "transferencia"
        ? values.transferDate || localDateIso()
        : null,
    notes: values.notes.trim() || null,
    issuedAt: timestamp,
    annulledAt: null,
    annulmentReason: null,
  };

  return {
    state: {
      ...state,
      attentions: state.attentions.map((item) =>
        item.id === attention.id ? { ...item, status: "pagada" } : item,
      ),
      receipts: [...state.receipts, receipt],
      nextLocalReceiptNumber: state.nextLocalReceiptNumber + 1,
    },
    success: true,
    message: "Pago y recibo agregados a la sesión actual.",
    receiptId: receipt.id,
  };
}

export function annulReceiptInSession(
  state: CashRegisterState,
  values: ReceiptAnnulmentValues,
): CashSessionOperationResult {
  if (!state.session || state.session.status !== "abierta") {
    return {
      state,
      success: false,
      message: "Solo se anulan recibos mientras la caja está abierta.",
    };
  }

  const receipt = state.receipts.find(
    (item) => item.id === values.receiptId,
  );
  if (!receipt || receipt.status !== "valido") {
    return {
      state,
      success: false,
      message: "El recibo seleccionado no está disponible para anulación.",
    };
  }

  const attention = state.attentions.find(
    (item) => item.id === receipt.attentionId,
  );
  if (!attention || attention.status !== "pagada") {
    return {
      state,
      success: false,
      message:
        "El estado actual de la atención no permite anular el recibo.",
    };
  }

  const timestamp = nowIso();

  return {
    state: {
      ...state,
      attentions: state.attentions.map((item) =>
        item.id === attention.id
          ? { ...item, status: "pendiente_pago" }
          : item,
      ),
      receipts: state.receipts.map((item) =>
        item.id === receipt.id
          ? {
              ...item,
              status: "anulado",
              annulledAt: timestamp,
              annulmentReason: values.reason.trim(),
            }
          : item,
      ),
    },
    success: true,
    message: "Recibo anulado en la sesión actual.",
    receiptId: receipt.id,
  };
}

export function closeCashRegisterInSession(
  state: CashRegisterState,
  values: CashClosingValues,
): CashSessionOperationResult {
  if (!state.session || state.session.status !== "abierta") {
    return {
      state,
      success: false,
      message: "No existe una caja abierta para cerrar.",
    };
  }

  const countDetails = values.denominationCounts
    .map((count) => {
      const denomination = CASH_DENOMINATIONS.find(
        (item) => item.id === count.denominationId,
      );
      const quantity = Number(count.quantity.trim() || "0");

      if (
        !denomination ||
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        quantity > 10_000
      ) {
        return null;
      }

      return {
        denominationId: denomination.id,
        label: denomination.label,
        valueCents: denomination.valueCents,
        quantity,
        subtotalCents: denomination.valueCents * quantity,
      };
    })
    .filter((detail) => detail !== null);

  if (countDetails.length !== values.denominationCounts.length) {
    return {
      state,
      success: false,
      message: "El conteo contiene una cantidad inválida.",
    };
  }

  const declaredCashCents = countDetails.reduce(
    (total, detail) => total + detail.subtotalCents,
    0,
  );
  const expectedCashCents = getExpectedCashCents(state);

  return {
    state: {
      ...state,
      session: {
        ...state.session,
        status: "cerrada",
        closedAt: nowIso(),
        expectedCashCents,
        declaredCashCents,
        differenceCents: declaredCashCents - expectedCashCents,
        closingNotes: values.notes.trim() || null,
      },
      countDetails,
    },
    success: true,
    message: "Caja cerrada en la sesión actual.",
  };
}
