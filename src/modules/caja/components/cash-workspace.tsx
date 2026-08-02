"use client";

import { useState } from "react";

import { ModuleDialog } from "@/components/shared/module-dialog";

import {
  annulReceiptInSession,
  closeCashRegisterInSession,
  getCashPaymentsTotalCents,
  getExpectedCashCents,
  getTransferPaymentsTotalCents,
  openCashRegisterInSession,
  registerPaymentInSession,
} from "../services/caja-session.service";
import type {
  CashClosingValues,
  CashOpeningValues,
  PaymentValues,
  ReceiptAnnulmentValues,
} from "../types/caja.types";
import {
  formatDateTime,
  formatHnlFromCents,
} from "../utils/caja-formatters";

import { CashClosingPrint } from "./cash-closing-print";
import { CashClosingForm } from "./cash-closing-form";
import { CashOpeningForm } from "./cash-opening-form";
import { useCashSession } from "./cash-session-provider";
import styles from "./caja.module.css";
import { PaymentForm } from "./payment-form";
import { PendingCharges } from "./pending-charges";
import { ReceiptAnnulmentForm } from "./receipt-annulment-form";
import { ReceiptsTable } from "./receipts-table";

type DialogName = "payment" | "annulment" | "closing" | null;

export function CashWorkspace() {
  const { state, setState } = useCashSession();
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedAttentionId, setSelectedAttentionId] = useState<
    string | null
  >(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedAttention = state.attentions.find(
    (attention) => attention.id === selectedAttentionId,
  );
  const selectedReceipt = state.receipts.find(
    (receipt) => receipt.id === selectedReceiptId,
  );
  const isOpen = state.session?.status === "abierta";
  const isClosed = state.session?.status === "cerrada";
  const cashPaymentsCents = getCashPaymentsTotalCents(state);
  const transferPaymentsCents = getTransferPaymentsTotalCents(state);
  const expectedCashCents = getExpectedCashCents(state);

  function closeDialog() {
    setDialog(null);
    setSelectedAttentionId(null);
    setSelectedReceiptId(null);
  }

  function handleOpen(values: CashOpeningValues) {
    const result = openCashRegisterInSession(state, values);
    if (result.success) {
      setState(result.state);
      setFeedback(result.message);
    }
    return { success: result.success, message: result.message };
  }

  function handlePayment(values: PaymentValues) {
    const result = registerPaymentInSession(state, values);
    if (result.success) {
      setState(result.state);
      setFeedback(result.message);
    }
    return { success: result.success, message: result.message };
  }

  function handleAnnulment(values: ReceiptAnnulmentValues) {
    const result = annulReceiptInSession(state, values);
    if (result.success) {
      setState(result.state);
      setFeedback(result.message);
    }
    return { success: result.success, message: result.message };
  }

  function handleClosing(values: CashClosingValues) {
    const result = closeCashRegisterInSession(state, values);
    if (result.success) {
      setState(result.state);
      setFeedback(result.message);
    }
    return { success: result.success, message: result.message };
  }

  if (!state.session) {
    return (
      <div className={styles.module}>
        <header className={styles.moduleHeader}>
          <div>
            <h1>Caja y pagos</h1>
          </div>
        </header>

        <section className={styles.openingLayout}>
          <article className={styles.openingCard}>
            <div className={styles.openingCardHeader}>
              <h2>Apertura de caja</h2>
            </div>
            <CashOpeningForm onSubmit={handleOpen} />
          </article>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.module}>
      <header className={styles.moduleHeader}>
        <div>
          <h1>Caja y pagos</h1>
        </div>
        <div className={styles.headerActions}>
          <span
            className={`${styles.sessionBadge} ${
              isOpen ? styles.sessionOpen : styles.sessionClosed
            }`}
          >
            <span aria-hidden="true" />
            Caja {isOpen ? "abierta" : "cerrada"}
          </span>
          {isOpen ? (
            <button
              className={styles.closeCashButton}
              onClick={() => setDialog("closing")}
              type="button"
            >
              Cerrar caja
            </button>
          ) : null}
        </div>
      </header>

      {feedback ? (
        <div className={styles.feedback} role="status">
          <span aria-hidden="true">✓</span>
          <p>{feedback}</p>
          <button
            aria-label="Cerrar mensaje"
            onClick={() => setFeedback(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className={styles.sessionStrip}>
        <div>
          <span>Sesión</span>
          <strong>Caja PRINCIPAL</strong>
        </div>
        <div>
          <span>Apertura</span>
          <strong>{formatDateTime(state.session.openedAt)}</strong>
        </div>
        <div>
          <span>Fondo inicial</span>
          <strong>
            {formatHnlFromCents(state.session.openingAmountCents)}
          </strong>
        </div>
        {state.session.closedAt ? (
          <div>
            <span>Cierre</span>
            <strong>{formatDateTime(state.session.closedAt)}</strong>
          </div>
        ) : null}
      </section>

      <section className={styles.metrics} aria-label="Resumen de caja">
        <article className={styles.metric}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4.5 7h15v10h-15zM8 12h.01M16 12h.01M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            </svg>
          </span>
          <div>
            <span>Cobros en efectivo</span>
            <strong>{formatHnlFromCents(cashPaymentsCents)}</strong>
            <small>Recibos válidos</small>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 9h16M6 9V7l6-3 6 3v2M6 18h12M7.5 9v7M11 9v7M15 9v7M18.5 9v7" />
            </svg>
          </span>
          <div>
            <span>Transferencias</span>
            <strong>{formatHnlFromCents(transferPaymentsCents)}</strong>
            <small>Recibos válidos</small>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 5h14v14H5zM8.5 9h7M8.5 12h7M8.5 15h4" />
            </svg>
          </span>
          <div>
            <span>Recibos válidos</span>
            <strong>
              {state.receipts.filter((receipt) => receipt.status === "valido")
                .length}
            </strong>
            <small>{state.receipts.length} emitidos</small>
          </div>
        </article>
        <article className={`${styles.metric} ${styles.metricExpected}`}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 4v3M17 4v3M5 9h14M5 6h14v14H5zM9 13h6M9 16h4" />
            </svg>
          </span>
          <div>
            <span>Efectivo esperado</span>
            <strong>{formatHnlFromCents(expectedCashCents)}</strong>
            <small>Fondo inicial + cobros</small>
          </div>
        </article>
      </section>

      {isClosed ? (
        <>
          <section className={styles.closedSummary}>
            <span className={styles.closedIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m7 12 3 3 7-7M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
              </svg>
            </span>
            <div>
              <h2>Cierre de caja</h2>
              <p>
                Efectivo declarado:{" "}
                <strong>
                  {formatHnlFromCents(
                    state.session.declaredCashCents ?? 0,
                  )}
                </strong>
                {" · "}Diferencia:{" "}
                <strong>
                  {formatHnlFromCents(state.session.differenceCents ?? 0)}
                </strong>
              </p>
            </div>
            <button
              className={styles.printClosingButton}
              onClick={() => window.print()}
              type="button"
            >
              Imprimir cierre
            </button>
          </section>
          <CashClosingPrint state={state} />
        </>
      ) : (
        <section className={styles.panel} aria-labelledby="charges-title">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="charges-title">Atenciones cobrables</h2>
            </div>
            <span className={styles.sessionTag}>Sesión activa</span>
          </div>
          <PendingCharges
            attentions={state.attentions}
            disabled={!isOpen}
            onCharge={(attentionId) => {
              setSelectedAttentionId(attentionId);
              setDialog("payment");
            }}
          />
        </section>
      )}

      <section className={styles.panel} aria-labelledby="receipts-title">
        <div className={styles.panelHeader}>
          <div>
              <h2 id="receipts-title">Recibos de la sesión</h2>
          </div>
        </div>
        <ReceiptsTable
          canAnnul={isOpen}
          onAnnul={(receiptId) => {
            setSelectedReceiptId(receiptId);
            setDialog("annulment");
          }}
          receipts={state.receipts}
        />
      </section>

      {dialog === "payment" && selectedAttention ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Registrar pago"
          wide
        >
          <PaymentForm
            attention={selectedAttention}
            onCompleted={closeDialog}
            onSubmit={handlePayment}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "annulment" && selectedReceipt ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Anular recibo"
        >
          <ReceiptAnnulmentForm
            onCompleted={closeDialog}
            onSubmit={handleAnnulment}
            receipt={selectedReceipt}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "closing" && isOpen ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Cerrar caja"
          wide
        >
          <CashClosingForm
            expectedCashCents={expectedCashCents}
            onCompleted={closeDialog}
            onSubmit={handleClosing}
          />
        </ModuleDialog>
      ) : null}
    </div>
  );
}
