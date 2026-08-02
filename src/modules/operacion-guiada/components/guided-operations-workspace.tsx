"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { CashOpeningForm } from "@/modules/caja/components/cash-opening-form";
import { useCashSession } from "@/modules/caja/components/cash-session-provider";
import { mapCashSessionRpcRow } from "@/modules/caja/services/caja-rpc-mappers";
import type {
  CashOpeningValues,
  PaymentMethod,
} from "@/modules/caja/types/caja.types";
import {
  TARIFF_CATEGORY_LABELS,
  type TariffCategory,
} from "@/modules/pacientes/types/pacientes.types";
import {
  formatPatientBirthDateInput,
  parsePatientBirthDate,
  splitPatientFullName,
} from "@/modules/pacientes/utils/patient-input";
import { getSupabaseBrowserRpcExecutor } from "@/services";

import {
  mapGuidedCashSession,
  mapGuidedDayState,
} from "../services/operacion-guiada-mappers";
import { createGuidedOperationService } from "../services/operacion-guiada.service";
import {
  formatHnl,
  getGuidedServicePriceCents,
  getPaidTotalByMethodCents,
  getPaidTotalCents,
} from "../utils/operacion-guiada-formatters";
import type {
  GuidedCaseStatus,
  GuidedPatient,
  GuidedServiceDefinition,
} from "../types/operacion-guiada.types";
import { GuidedClosingPrint } from "./guided-closing-print";
import { useGuidedOperation } from "./guided-operation-provider";
import {
  GuidedReceiptPrint,
  type GuidedReceiptPrintData,
} from "./guided-receipt-print";
import styles from "./guided-operations.module.css";

const FLOW_STEPS = [
  { id: "opening", label: "Apertura" },
  { id: "patient", label: "Paciente" },
  { id: "service", label: "Servicio" },
  { id: "payment", label: "Cobro" },
  { id: "closing", label: "Cierre" },
] as const;

interface PatientFormValues {
  documentNumber: string;
  fullName: string;
  birthDate: string;
  tariffCategory: TariffCategory;
}

interface ClosingFormValues {
  declaredCash: string;
  depositAmount: string;
  depositBank: string;
  depositReference: string;
  notes: string;
}

const emptyPatientValues: PatientFormValues = {
  documentNumber: "",
  fullName: "",
  birthDate: "",
  tariffCategory: "general",
};

const emptyClosingValues: ClosingFormValues = {
  declaredCash: "",
  depositAmount: "",
  depositBank: "",
  depositReference: "",
  notes: "",
};

function parseCurrencyToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return 0;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function rpcMoneyToCents(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function todayAsLocalIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function patientFullName(patient: GuidedPatient): string {
  return `${patient.firstNames} ${patient.lastNames}`.trim();
}

function caseStatusLabel(status: GuidedCaseStatus): string {
  if (status === "pagada") {
    return "Cobrada";
  }

  if (status === "no_cobrada") {
    return "No cobrada";
  }

  return "Abandono";
}

export function GuidedOperationsWorkspace() {
  const {
    state: cashState,
    setState: setCashState,
  } = useCashSession();
  const { state, setState } = useGuidedOperation();
  const service = useMemo(
    () => createGuidedOperationService(getSupabaseBrowserRpcExecutor()),
    [],
  );
  const [serviceCatalog, setServiceCatalog] = useState<
    readonly GuidedServiceDefinition[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [patientValues, setPatientValues] =
    useState<PatientFormValues>(emptyPatientValues);
  const [patientError, setPatientError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [showAbandonment, setShowAbandonment] = useState(false);
  const [abandonmentReason, setAbandonmentReason] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("efectivo");
  const [cashReceived, setCashReceived] = useState("");
  const [transferBank, setTransferBank] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [closingValues, setClosingValues] =
    useState<ClosingFormValues>(emptyClosingValues);
  const [closingError, setClosingError] = useState("");
  const [receiptToPrint, setReceiptToPrint] =
    useState<GuidedReceiptPrintData | null>(null);
  const lastAutoPrintedReceiptId = useRef<string | null>(null);

  useEffect(() => {
    if (!receiptToPrint) {
      return;
    }

    const receiptId = receiptToPrint.receiptId;
    const handleAfterPrint = () => {
      setReceiptToPrint((current) =>
        current?.receiptId === receiptId ? null : current,
      );
    };

    window.addEventListener("afterprint", handleAfterPrint);
    const printTimer = window.setTimeout(() => {
      if (lastAutoPrintedReceiptId.current === receiptId) {
        return;
      }

      lastAutoPrintedReceiptId.current = receiptId;
      window.print();
    }, 180);

    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [receiptToPrint]);

  const applyRemoteDay = useCallback(
    async (feedback: string | null = null) => {
      const day = await service.getDayState();
      const mappedState = mapGuidedDayState(day);

      setCashState((current) => ({
        ...current,
        session: mapGuidedCashSession(day),
      }));
      setState({ ...mappedState, feedback });

      return mappedState;
    },
    [service, setCashState, setState],
  );

  useEffect(() => {
    let active = true;

    async function initialize() {
      setIsLoading(true);
      setRemoteError("");

      try {
        const day = await service.getDayState();
        const mappedState = mapGuidedDayState(day);
        const category =
          mappedState.activePatient?.tariffCategory ?? "general";
        const catalog = await service.listAvailableServices(
          todayAsLocalIsoDate(),
          category,
        );

        if (!active) {
          return;
        }

        setServiceCatalog(catalog);
        setCashState((current) => ({
          ...current,
          session: mapGuidedCashSession(day),
        }));
        setState(mappedState);
      } catch (cause) {
        if (active) {
          setRemoteError(
            cause instanceof Error
              ? cause.message
              : "No fue posible cargar la jornada desde Supabase.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [service, setCashState, setState]);

  const selectedServices = serviceCatalog.filter((service) =>
    state.selectedServiceIds.includes(service.id),
  ).map((service) => ({
    ...service,
    priceCents: getGuidedServicePriceCents(service),
  }));
  const selectedTotalCents = selectedServices.reduce(
    (total, service) => total + service.priceCents,
    0,
  );
  const paidTotalCents = getPaidTotalCents(state.cases);
  const cashPaymentsCents = getPaidTotalByMethodCents(
    state.cases,
    "efectivo",
  );
  const transferPaymentsCents = getPaidTotalByMethodCents(
    state.cases,
    "transferencia",
  );
  const expectedCashCents =
    (cashState.session?.openingAmountCents ?? 0) + cashPaymentsCents;
  const paidCasesCount = state.cases.filter(
    (item) => item.status === "pagada",
  ).length;
  const pendingCasesCount = state.cases.filter(
    (item) => item.status === "no_cobrada",
  ).length;
  const abandonedCasesCount = state.cases.filter(
    (item) => item.status === "abandonada",
  ).length;
  const operationStep =
    state.step === "opening" && cashState.session?.status === "abierta"
      ? "patient"
      : state.step === "opening" &&
          cashState.session?.status === "cerrada"
        ? "closed"
        : state.step;

  const currentStepIndex =
    operationStep === "closed"
      ? FLOW_STEPS.length
      : FLOW_STEPS.findIndex((item) => item.id === operationStep);

  async function handleOpen(values: CashOpeningValues) {
    try {
      const opened = await service.openDay(
        Number(values.openingAmount),
        values.notes,
      );

      setCashState((current) => ({
        ...current,
        session: mapCashSessionRpcRow(opened),
      }));
      setState((current) => ({
        ...current,
        activeAttentionId: null,
        activeAttentionNumber: null,
        step: "patient",
        feedback: "Caja abierta. Registre al primer paciente.",
      }));
      return {
        success: true,
        message: "Caja abierta y guardada en Supabase.",
      };
    } catch (cause) {
      return {
        success: false,
        message:
          cause instanceof Error
            ? cause.message
            : "No fue posible abrir la caja en Supabase.",
      };
    }
  }

  function updatePatientField(
    field: keyof PatientFormValues,
    value: string,
  ) {
    setPatientValues((current) => ({ ...current, [field]: value }));
    setPatientError("");
  }

  async function handlePatientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nameParts = splitPatientFullName(patientValues.fullName);
    const birthDate = parsePatientBirthDate(patientValues.birthDate);

    if (
      !patientValues.documentNumber.trim() ||
      !nameParts ||
      nameParts.firstNames.length > 100 ||
      nameParts.lastNames.length > 100 ||
      !birthDate
    ) {
      setPatientError(
        "Ingrese el documento, el nombre completo y una fecha válida en formato DD/MM/AAAA.",
      );
      return;
    }

    if (birthDate > todayAsLocalIsoDate()) {
      setPatientError("La fecha de nacimiento no puede estar en el futuro.");
      return;
    }

    setIsSubmitting(true);
    setPatientError("");

    try {
      const registered = await service.registerPatient({
        patient: {
          documentType: "identidad",
          documentNumber: patientValues.documentNumber.trim(),
          firstNames: nameParts.firstNames,
          lastNames: nameParts.lastNames,
          birthDate,
          phone: "",
          email: "",
          address: "",
        },
        attentionNotes: "",
        tariffCategory: patientValues.tariffCategory,
      });

      if (!registered.atencion_id) {
        throw new Error("Supabase no retornó la atención creada.");
      }

      const catalog = await service.listAvailableServices(
        todayAsLocalIsoDate(),
        patientValues.tariffCategory,
      );
      const patient: GuidedPatient = {
        id: registered.paciente_id,
        documentNumber: patientValues.documentNumber.trim(),
        firstNames: nameParts.firstNames,
        lastNames: nameParts.lastNames,
        birthDate,
        tariffCategory: patientValues.tariffCategory,
      };

      setServiceCatalog(catalog);
      setState((current) => ({
        ...current,
        activeAttentionId: registered.atencion_id,
        activeAttentionNumber: registered.numero_atencion,
        activePatient: patient,
        selectedServiceIds: [],
        step: "service",
        feedback: null,
      }));
      setPatientValues(emptyPatientValues);
      setShowAbandonment(false);
      setAbandonmentReason("");
    } catch (cause) {
      setPatientError(
        cause instanceof Error
          ? cause.message
          : "No fue posible registrar el paciente en Supabase.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAbandonment() {
    if (!abandonmentReason.trim()) {
      setServiceError("Indique el motivo del abandono.");
      return;
    }

    if (!state.activeAttentionId) {
      setServiceError("No existe una atención activa en Supabase.");
      return;
    }

    setIsSubmitting(true);
    setServiceError("");
    try {
      await service.recordAbandonment(
        state.activeAttentionId,
        abandonmentReason.trim(),
      );
      await applyRemoteDay(
        "Abandono guardado. Continúe con el siguiente paciente.",
      );
      setShowAbandonment(false);
      setAbandonmentReason("");
    } catch (cause) {
      setServiceError(
        cause instanceof Error
          ? cause.message
          : "No fue posible registrar el abandono.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueToPayment() {
    if (selectedServices.length === 0) {
      setServiceError("Seleccione al menos un servicio.");
      return;
    }

    if (!state.activeAttentionId) {
      setServiceError("No existe una atención activa en Supabase.");
      return;
    }

    setIsSubmitting(true);
    setServiceError("");
    try {
      await service.assignServices(
        selectedServices.map((selectedService) => ({
          attentionId: state.activeAttentionId as string,
          serviceId: selectedService.id,
          providerId: selectedService.providerId,
          quantity: 1,
        })),
      );
      setCashReceived((selectedTotalCents / 100).toFixed(2));
      setPaymentError("");
      setState((current) => ({
        ...current,
        step: "payment",
        feedback: null,
      }));
    } catch (cause) {
      setServiceError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar los servicios de la atención.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.activeAttentionId || !state.activePatient) {
      setPaymentError("No existe una atención activa en Supabase.");
      return;
    }

    const receivedCents = parseCurrencyToCents(cashReceived);
    if (paymentMethod === "efectivo") {
      if (receivedCents === null || receivedCents < selectedTotalCents) {
        setPaymentError(
          "El efectivo recibido debe cubrir el total del servicio.",
        );
        return;
      }
    }

    if (
      paymentMethod === "transferencia" &&
      (!transferBank.trim() || !transferReference.trim())
    ) {
      setPaymentError(
        "Banco y referencia son obligatorios para una transferencia.",
      );
      return;
    }

    setIsSubmitting(true);
    setPaymentError("");
    try {
      const receipt = await service.registerPayment({
        attentionId: state.activeAttentionId,
        method: paymentMethod,
        cashReceived:
          paymentMethod === "efectivo" && receivedCents !== null
            ? receivedCents / 100
            : null,
        bank:
          paymentMethod === "transferencia" ? transferBank.trim() : null,
        transferReference:
          paymentMethod === "transferencia"
            ? transferReference.trim()
            : null,
        transferDate:
          paymentMethod === "transferencia" ? todayAsLocalIsoDate() : null,
        notes: "",
      });

      setReceiptToPrint({
        receiptId: receipt.recibo_id,
        receiptNumber: String(receipt.numero_recibo),
        attentionId: state.activeAttentionId,
        attentionNumber:
          state.activeAttentionNumber ?? state.activeAttentionId.slice(0, 8),
        issuedAt: receipt.emitido_en,
        patientName: patientFullName(state.activePatient),
        patientDocument: state.activePatient.documentNumber,
        tariffCategory:
          TARIFF_CATEGORY_LABELS[state.activePatient.tariffCategory],
        services: selectedServices.map((selectedService) => ({
          code: selectedService.code,
          name: selectedService.name,
          quantity: 1,
          unitPriceCents: selectedService.priceCents,
          subtotalCents: selectedService.priceCents,
        })),
        totalCents: rpcMoneyToCents(receipt.total) ?? selectedTotalCents,
        paymentMethod: receipt.metodo,
        cashReceivedCents: rpcMoneyToCents(receipt.monto_recibido),
        changeCents: rpcMoneyToCents(receipt.cambio),
        bank: receipt.banco,
        transferReference: receipt.referencia_transferencia,
      });

      await applyRemoteDay(
        "Cobro y recibo guardados. Continúe con el siguiente paciente.",
      );
      setPaymentMethod("efectivo");
      setCashReceived("");
      setTransferBank("");
      setTransferReference("");
    } catch (cause) {
      setPaymentError(
        cause instanceof Error
          ? cause.message
          : "No fue posible registrar el cobro en Supabase.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnpaid() {
    if (!state.activeAttentionId) {
      setPaymentError("No existe una atención activa en Supabase.");
      return;
    }

    setIsSubmitting(true);
    setPaymentError("");
    try {
      await service.markUnpaid(state.activeAttentionId);
      await applyRemoteDay(
        "Atención guardada como no cobrada. Continúe con el siguiente paciente.",
      );
      setPaymentMethod("efectivo");
      setCashReceived("");
      setTransferBank("");
      setTransferReference("");
    } catch (cause) {
      setPaymentError(
        cause instanceof Error
          ? cause.message
          : "No fue posible registrar la atención no cobrada.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function beginClosing() {
    if (state.activePatient) {
      const message =
        "Finalice la atención actual como cobrada, no cobrada o abandonada antes de cerrar.";
      if (state.step === "service") {
        setServiceError(message);
      } else {
        setPaymentError(message);
      }
      return;
    }

    setClosingValues({
      ...emptyClosingValues,
      declaredCash: (expectedCashCents / 100).toFixed(2),
    });
    setClosingError("");
    setState((current) => ({
      ...current,
      step: "closing",
      feedback: null,
    }));
  }

  function cancelClosing() {
    setState((current) => ({
      ...current,
      step: "patient",
      feedback: null,
    }));
  }

  async function handleClosing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const declaredCashCents = parseCurrencyToCents(
      closingValues.declaredCash,
    );
    const depositAmountCents = parseCurrencyToCents(
      closingValues.depositAmount,
    );

    if (declaredCashCents === null || depositAmountCents === null) {
      setClosingError("Revise los montos ingresados.");
      return;
    }

    if (
      depositAmountCents > 0 &&
      (!closingValues.depositBank.trim() ||
        !closingValues.depositReference.trim())
    ) {
      setClosingError(
        "Banco y referencia son obligatorios cuando existe depósito.",
      );
      return;
    }

    if (!cashState.session || cashState.session.status !== "abierta") {
      setClosingError("No existe una caja abierta para cerrar.");
      return;
    }

    if (
      declaredCashCents !== expectedCashCents &&
      !closingValues.notes.trim()
    ) {
      setClosingError(
        "Explique la diferencia de caja antes de confirmar el cierre.",
      );
      return;
    }

    setIsSubmitting(true);
    setClosingError("");
    try {
      await service.closeDay({
        declaredCash: declaredCashCents / 100,
        notes: closingValues.notes.trim(),
        deposit:
          depositAmountCents > 0
            ? {
                depositDate: todayAsLocalIsoDate(),
                depositedAmount: depositAmountCents / 100,
                appliedAmount: depositAmountCents / 100,
                bank: closingValues.depositBank.trim(),
                reference: closingValues.depositReference.trim(),
                evidenceUrl: "",
                notes: closingValues.notes.trim(),
              }
            : null,
      });
      const mappedState = await applyRemoteDay();
      setState({
        ...mappedState,
        step: "closed",
        closingDeposit:
          depositAmountCents > 0
            ? {
                amountCents: depositAmountCents,
                bank: closingValues.depositBank.trim(),
                reference: closingValues.depositReference.trim(),
              }
            : null,
        feedback: null,
      });
    } catch (cause) {
      setClosingError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cerrar la jornada en Supabase.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleService(serviceId: string) {
    setServiceError("");
    setState((current) => {
      const isSelected = current.selectedServiceIds.includes(serviceId);
      return {
        ...current,
        selectedServiceIds: isSelected
          ? current.selectedServiceIds.filter((id) => id !== serviceId)
          : [...current.selectedServiceIds, serviceId],
      };
    });
  }

  function renderPatientStep() {
    return (
      <section className={styles.taskCard}>
        <header className={styles.taskHeader}>
          <span className={styles.stepNumber}>2</span>
          <h2>Registrar paciente</h2>
        </header>

        <form className={styles.form} onSubmit={handlePatientSubmit}>
          {patientError ? (
            <p className={styles.error} role="alert">
              {patientError}
            </p>
          ) : null}
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Documento</span>
              <input
                autoFocus
                onChange={(event) =>
                  updatePatientField("documentNumber", event.target.value)
                }
                placeholder="Número de identidad o pasaporte"
                value={patientValues.documentNumber}
              />
            </label>
            <label className={styles.field}>
              <span>Fecha de nacimiento</span>
              <input
                autoComplete="bday"
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  updatePatientField(
                    "birthDate",
                    formatPatientBirthDateInput(event.target.value),
                  )
                }
                placeholder="DD/MM/AAAA"
                type="text"
                value={patientValues.birthDate}
              />
            </label>
            <label className={styles.field}>
              <span>Tarifa aplicable</span>
              <select
                onChange={(event) =>
                  updatePatientField(
                    "tariffCategory",
                    event.target.value as TariffCategory,
                  )
                }
                value={patientValues.tariffCategory}
              >
                {Object.entries(TARIFF_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className={styles.field}>
              <span>Nombre completo</span>
              <input
                autoComplete="name"
                maxLength={201}
                onChange={(event) =>
                  updatePatientField("fullName", event.target.value)
                }
                placeholder="Nombre completo del paciente"
                value={patientValues.fullName}
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando…" : "Registrar y continuar"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderServiceStep() {
    if (!state.activePatient) {
      return null;
    }

    return (
      <section className={styles.taskCard}>
        <header className={styles.taskHeader}>
          <span className={styles.stepNumber}>3</span>
          <div>
            <h2>Crear servicio</h2>
            <p>
              {patientFullName(state.activePatient)} ·{" "}
              {state.activePatient.documentNumber} ·{" "}
              {TARIFF_CATEGORY_LABELS[
                state.activePatient.tariffCategory
              ]}
            </p>
          </div>
        </header>

        {serviceError ? (
          <p className={styles.error} role="alert">
            {serviceError}
          </p>
        ) : null}

        {showAbandonment ? (
          <div className={styles.abandonmentBox}>
            <label className={styles.field}>
              <span>Motivo del abandono</span>
              <textarea
                autoFocus
                onChange={(event) => {
                  setAbandonmentReason(event.target.value);
                  setServiceError("");
                }}
                rows={3}
                value={abandonmentReason}
              />
            </label>
            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowAbandonment(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className={styles.dangerButton}
                disabled={isSubmitting}
                onClick={handleAbandonment}
                type="button"
              >
                {isSubmitting ? "Guardando…" : "Confirmar abandono"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.serviceList}>
              {serviceCatalog.map((service) => {
                const isSelected = state.selectedServiceIds.includes(
                  service.id,
                );
                const priceCents = getGuidedServicePriceCents(service);
                return (
                  <label
                    className={`${styles.serviceOption}${
                      isSelected ? ` ${styles.serviceOptionSelected}` : ""
                    }`}
                    key={service.id}
                  >
                    <input
                      checked={isSelected}
                      onChange={() => toggleService(service.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{service.name}</strong>
                      <small>
                        {service.providerName} · {service.code}
                      </small>
                    </span>
                    <strong>{formatHnl(priceCents)}</strong>
                  </label>
                );
              })}
            </div>
            {serviceCatalog.length === 0 ? (
              <p className={styles.error} role="alert">
                No hay servicios con tarifa y proveedor vigentes para esta
                categoría.
              </p>
            ) : null}
            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>{formatHnl(selectedTotalCents)}</strong>
            </div>
            <div className={styles.actionsBetween}>
              <button
                className={styles.dangerTextButton}
                onClick={() => {
                  setShowAbandonment(true);
                  setServiceError("");
                }}
                type="button"
              >
                Registrar abandono
              </button>
              <button
                className={styles.primaryButton}
                disabled={isSubmitting || serviceCatalog.length === 0}
                onClick={continueToPayment}
                type="button"
              >
                {isSubmitting ? "Guardando…" : "Crear servicio"}
              </button>
            </div>
          </>
        )}
      </section>
    );
  }

  function renderPaymentStep() {
    if (!state.activePatient) {
      return null;
    }

    const receivedCents = parseCurrencyToCents(cashReceived) ?? 0;
    const changeCents = Math.max(
      receivedCents - selectedTotalCents,
      0,
    );

    return (
      <section className={styles.taskCard}>
        <header className={styles.taskHeader}>
          <span className={styles.stepNumber}>4</span>
          <div>
            <h2>Cobrar servicio</h2>
            <p>{patientFullName(state.activePatient)}</p>
          </div>
          <strong className={styles.taskAmount}>
            {formatHnl(selectedTotalCents)}
          </strong>
        </header>

        <div className={styles.selectedServices}>
          {selectedServices.map((service) => (
            <span key={service.id}>{service.name}</span>
          ))}
        </div>

        <form className={styles.form} onSubmit={handlePayment}>
          {paymentError ? (
            <p className={styles.error} role="alert">
              {paymentError}
            </p>
          ) : null}

          <fieldset className={styles.methodFieldset}>
            <legend>Método de pago</legend>
            <div className={styles.methodSelector}>
              <button
                aria-pressed={paymentMethod === "efectivo"}
                onClick={() => {
                  setPaymentMethod("efectivo");
                  setPaymentError("");
                }}
                type="button"
              >
                Efectivo
              </button>
              <button
                aria-pressed={paymentMethod === "transferencia"}
                onClick={() => {
                  setPaymentMethod("transferencia");
                  setPaymentError("");
                }}
                type="button"
              >
                Transferencia
              </button>
            </div>
          </fieldset>

          {paymentMethod === "efectivo" ? (
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Efectivo recibido</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => {
                    setCashReceived(event.target.value);
                    setPaymentError("");
                  }}
                  value={cashReceived}
                />
              </label>
              <div className={styles.readOnlyField}>
                <span>Cambio</span>
                <strong>{formatHnl(changeCents)}</strong>
              </div>
            </div>
          ) : (
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Banco</span>
                <input
                  onChange={(event) => {
                    setTransferBank(event.target.value);
                    setPaymentError("");
                  }}
                  value={transferBank}
                />
              </label>
              <label className={styles.field}>
                <span>Referencia</span>
                <input
                  onChange={(event) => {
                    setTransferReference(event.target.value);
                    setPaymentError("");
                  }}
                  value={transferReference}
                />
              </label>
            </div>
          )}

          <div className={styles.actionsBetween}>
            <button
              className={styles.secondaryButton}
              disabled={isSubmitting}
              onClick={handleUnpaid}
              type="button"
            >
              {isSubmitting ? "Guardando…" : "No cobrado"}
            </button>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando…" : "Cobrar y emitir recibo"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderClosingStep() {
    return (
      <section className={styles.closingWorkspace}>
        <header className={styles.closingHeader}>
          <div>
            <h1>Cierre de jornada</h1>
            <p>Revise lo cobrado y registre el efectivo contado.</p>
          </div>
          <button
            className={styles.secondaryButton}
            onClick={cancelClosing}
            type="button"
          >
            Volver a operación
          </button>
        </header>

        <div className={styles.closingMetrics}>
          <div>
            <span>Total cobrado</span>
            <strong>{formatHnl(paidTotalCents)}</strong>
          </div>
          <div>
            <span>Efectivo cobrado</span>
            <strong>{formatHnl(cashPaymentsCents)}</strong>
          </div>
          <div>
            <span>Transferencias</span>
            <strong>{formatHnl(transferPaymentsCents)}</strong>
          </div>
          <div>
            <span>No cobrados</span>
            <strong>{pendingCasesCount}</strong>
          </div>
        </div>

        <div className={styles.closingGrid}>
          <section className={styles.tableCard}>
            <header>
              <h2>Atenciones de la jornada</h2>
              <span>{state.cases.length} registros</span>
            </header>
            {renderCasesTable()}
          </section>

          <form className={styles.taskCard} onSubmit={handleClosing}>
            <header className={styles.taskHeader}>
              <span className={styles.stepNumber}>5</span>
              <h2>Conteo y depósito</h2>
            </header>
            {closingError ? (
              <p className={styles.error} role="alert">
                {closingError}
              </p>
            ) : null}
            <div className={styles.reconciliationRows}>
              <div>
                <span>Fondo inicial</span>
                <strong>
                  {formatHnl(
                    cashState.session?.openingAmountCents ?? 0,
                  )}
                </strong>
              </div>
              <div>
                <span>Efectivo esperado</span>
                <strong>{formatHnl(expectedCashCents)}</strong>
              </div>
            </div>
            <label className={styles.field}>
              <span>Efectivo contado (incluye fondo inicial)</span>
              <input
                inputMode="decimal"
                onChange={(event) => {
                  setClosingValues((current) => ({
                    ...current,
                    declaredCash: event.target.value,
                  }));
                  setClosingError("");
                }}
                value={closingValues.declaredCash}
              />
            </label>

            <fieldset className={styles.depositFields}>
              <legend>Depósito bancario del cierre (opcional)</legend>
              <label className={styles.field}>
                <span>Monto depositado</span>
                <input
                  inputMode="decimal"
                  onChange={(event) =>
                    setClosingValues((current) => ({
                      ...current,
                      depositAmount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  value={closingValues.depositAmount}
                />
              </label>
              <label className={styles.field}>
                <span>Banco</span>
                <input
                  onChange={(event) =>
                    setClosingValues((current) => ({
                      ...current,
                      depositBank: event.target.value,
                    }))
                  }
                  value={closingValues.depositBank}
                />
              </label>
              <label className={styles.field}>
                <span>Referencia</span>
                <input
                  onChange={(event) =>
                    setClosingValues((current) => ({
                      ...current,
                      depositReference: event.target.value,
                    }))
                  }
                  value={closingValues.depositReference}
                />
              </label>
            </fieldset>
            <label className={styles.field}>
              <span>Observaciones del cierre</span>
              <textarea
                onChange={(event) => {
                  setClosingValues((current) => ({
                    ...current,
                    notes: event.target.value,
                  }));
                  setClosingError("");
                }}
                placeholder="Obligatorias cuando existe diferencia"
                rows={3}
                value={closingValues.notes}
              />
            </label>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Cerrando jornada…" : "Confirmar cierre"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  function renderCasesTable() {
    if (state.cases.length === 0) {
      return <p className={styles.empty}>Sin atenciones registradas.</p>;
    }

    return (
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Atención</th>
              <th>Paciente</th>
              <th>Servicio</th>
              <th>Medio</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[...state.cases].reverse().map((item) => (
              <tr key={item.id}>
                <td>{item.attentionNumber}</td>
                <td>{patientFullName(item.patient)}</td>
                <td>
                  {item.services.map((service) => service.name).join(", ") ||
                    "—"}
                </td>
                <td>
                  {item.paymentMethod === "efectivo"
                    ? "Efectivo"
                    : item.paymentMethod === "transferencia"
                      ? `Transferencia · ${item.paymentReference}`
                      : "—"}
                </td>
                <td>
                  <span
                    className={`${styles.status} ${
                      styles[`status_${item.status}`]
                    }`}
                  >
                    {caseStatusLabel(item.status)}
                  </span>
                </td>
                <td>{formatHnl(item.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.workspace} aria-live="polite">
        <section className={styles.openingCard}>
          <h1>Cargando jornada desde Supabase…</h1>
        </section>
      </div>
    );
  }

  if (remoteError) {
    return (
      <div className={styles.workspace}>
        <section className={styles.openingCard}>
          <h1>No se pudo cargar la jornada</h1>
          <p className={styles.error} role="alert">
            {remoteError}
          </p>
          <button
            className={styles.primaryButton}
            onClick={() => window.location.reload()}
            type="button"
          >
            Reintentar conexión
          </button>
        </section>
      </div>
    );
  }

  if (!cashState.session) {
    return (
      <div className={styles.workspace}>
        <header className={styles.pageHeader}>
          <h1>Operación guiada</h1>
        </header>
        <nav className={styles.stepper} aria-label="Flujo de la jornada">
          {FLOW_STEPS.map((item, index) => (
            <span
              className={index === 0 ? styles.stepActive : ""}
              key={item.id}
            >
              <b>{index + 1}</b>
              {item.label}
            </span>
          ))}
        </nav>
        <section className={styles.openingCard}>
          <header className={styles.taskHeader}>
            <span className={styles.stepNumber}>1</span>
            <h2>Apertura de caja</h2>
          </header>
          <CashOpeningForm onSubmit={handleOpen} />
        </section>
      </div>
    );
  }

  if (operationStep === "closing") {
    return renderClosingStep();
  }

  if (operationStep === "closed") {
    const differenceCents = cashState.session.differenceCents ?? 0;
    return (
      <div className={styles.closedWorkspace}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Jornada cerrada</h1>
            <p>
              {state.cases.length} atenciones · {paidCasesCount} cobradas
            </p>
          </div>
          <div className={styles.closedActions}>
            <button
              className={styles.secondaryButton}
              onClick={() => window.print()}
              type="button"
            >
              Imprimir cierre
            </button>
            <Link className={styles.primaryButton} href="/clinica/reportes">
              Ver informe mensual
            </Link>
          </div>
        </header>
        <section className={styles.closedSummary}>
          <div>
            <span>Total cobrado</span>
            <strong>{formatHnl(paidTotalCents)}</strong>
          </div>
          <div>
            <span>Efectivo declarado</span>
            <strong>
              {formatHnl(cashState.session.declaredCashCents ?? 0)}
            </strong>
          </div>
          <div>
            <span>Diferencia de caja</span>
            <strong>{formatHnl(differenceCents)}</strong>
          </div>
          <div>
            <span>Depósito registrado</span>
            <strong>
              {formatHnl(state.closingDeposit?.amountCents ?? 0)}
            </strong>
          </div>
        </section>
        <section className={styles.tableCard}>
          <header>
            <h2>Resumen final</h2>
          </header>
          {renderCasesTable()}
        </section>
        <GuidedClosingPrint
          cases={state.cases}
          deposit={state.closingDeposit}
          session={cashState.session}
        />
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Operación de la jornada</h1>
          <p>
            {paidCasesCount} cobradas · {pendingCasesCount} no cobradas ·{" "}
            {abandonedCasesCount} abandonos
          </p>
        </div>
        <button
          className={styles.closeButton}
          onClick={beginClosing}
          type="button"
        >
          Cerrar jornada
        </button>
      </header>

      <nav className={styles.stepper} aria-label="Flujo de la jornada">
        {FLOW_STEPS.map((item, index) => (
          <span
            className={
              index === currentStepIndex
                ? styles.stepActive
                : index < currentStepIndex
                  ? styles.stepDone
                  : ""
            }
            key={item.id}
          >
            <b>{index + 1}</b>
            {item.label}
          </span>
        ))}
      </nav>

      {state.feedback ? (
        <div className={styles.feedback} role="status">
          <span>{state.feedback}</span>
          <button
            aria-label="Cerrar mensaje"
            onClick={() =>
              setState((current) => ({ ...current, feedback: null }))
            }
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className={styles.operationGrid}>
        <div>
          {operationStep === "patient" ? renderPatientStep() : null}
          {operationStep === "service" ? renderServiceStep() : null}
          {operationStep === "payment" ? renderPaymentStep() : null}
        </div>

        <aside className={styles.dayPanel}>
          <header>
            <div>
              <h2>Jornada actual</h2>
              <span>{state.cases.length} atenciones</span>
            </div>
            <strong>{formatHnl(paidTotalCents)}</strong>
          </header>
          <dl>
            <div>
              <dt>Efectivo</dt>
              <dd>{formatHnl(cashPaymentsCents)}</dd>
            </div>
            <div>
              <dt>Transferencias</dt>
              <dd>{formatHnl(transferPaymentsCents)}</dd>
            </div>
            <div>
              <dt>No cobradas</dt>
              <dd>{pendingCasesCount}</dd>
            </div>
          </dl>
          <div className={styles.compactCases}>{renderCasesTable()}</div>
        </aside>
      </div>
      <GuidedReceiptPrint receipt={receiptToPrint} />
    </div>
  );
}
