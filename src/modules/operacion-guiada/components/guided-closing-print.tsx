import { MunicipalLogo } from "@/components/shared/municipal-logo";
import type { CashSessionRecord } from "@/modules/caja/types/caja.types";
import {
  formatDateTime,
  getPaymentMethodLabel,
} from "@/modules/caja/utils/caja-formatters";

import type {
  ClosingDeposit,
  GuidedCase,
} from "../types/operacion-guiada.types";
import {
  formatHnl,
  getPaidTotalByMethodCents,
  getPaidTotalCents,
} from "../utils/operacion-guiada-formatters";

import styles from "./guided-closing-print.module.css";

interface GuidedClosingPrintProps {
  session: CashSessionRecord;
  cases: readonly GuidedCase[];
  deposit: ClosingDeposit | null;
}

function statusLabel(item: GuidedCase): string {
  if (item.status === "pagada") {
    return "Cobrada";
  }

  if (item.status === "no_cobrada") {
    return "No cobrada";
  }

  return "Abandonada";
}

function paymentDetail(item: GuidedCase): string {
  if (!item.paymentMethod) {
    return "—";
  }

  if (item.paymentMethod === "efectivo") {
    return getPaymentMethodLabel(item.paymentMethod);
  }

  return [
    getPaymentMethodLabel(item.paymentMethod),
    item.paymentBank,
    item.paymentReference ? `Ref. ${item.paymentReference}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function GuidedClosingPrint({
  session,
  cases,
  deposit,
}: GuidedClosingPrintProps) {
  if (session.status !== "cerrada" || !session.closedAt) {
    return null;
  }

  const orderedCases = [...cases].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
  const paidCases = orderedCases.filter((item) => item.status === "pagada");
  const unpaidCases = orderedCases.filter(
    (item) => item.status === "no_cobrada",
  );
  const abandonedCases = orderedCases.filter(
    (item) => item.status === "abandonada",
  );
  const totalCollectedCents = getPaidTotalCents(cases);
  const cashCollectedCents = getPaidTotalByMethodCents(cases, "efectivo");
  const transferCollectedCents = getPaidTotalByMethodCents(
    cases,
    "transferencia",
  );
  const differenceCents = session.differenceCents ?? 0;

  return (
    <article
      aria-label="Cierre y arqueo diario para impresión"
      className={styles.printRoot}
    >
      <header className={styles.documentHeader}>
        <div className={styles.brandBlock}>
          <MunicipalLogo
            alt="Escudo de la Municipalidad de Talanga"
            className={styles.municipalLogo}
            height={50}
            width={48}
          />
          <div>
            <span className={styles.organization}>
              SIEMC · Clínica Municipal
            </span>
            <h1>Cierre de caja y arqueo diario</h1>
            <p>Detalle consolidado de la jornada registrada en Supabase.</p>
          </div>
        </div>
        <div className={styles.documentStatus}>
          <span>Estado del arqueo</span>
          <strong>
            {differenceCents === 0 ? "Cuadrado" : "Con diferencia"}
          </strong>
        </div>
      </header>

      <dl className={styles.identityGrid}>
        <div>
          <dt>Caja</dt>
          <dd>{session.code}</dd>
        </div>
        <div>
          <dt>Apertura</dt>
          <dd>{formatDateTime(session.openedAt)}</dd>
        </div>
        <div>
          <dt>Cierre</dt>
          <dd>{formatDateTime(session.closedAt)}</dd>
        </div>
        <div className={styles.sessionIdentifier}>
          <dt>Identificador de sesión</dt>
          <dd>{session.id}</dd>
        </div>
      </dl>

      <section className={styles.section}>
        <h2>Resumen financiero</h2>
        <dl className={styles.summaryGrid}>
          <div>
            <dt>Fondo inicial</dt>
            <dd>{formatHnl(session.openingAmountCents)}</dd>
          </div>
          <div>
            <dt>Cobros en efectivo</dt>
            <dd>{formatHnl(cashCollectedCents)}</dd>
          </div>
          <div>
            <dt>Transferencias</dt>
            <dd>{formatHnl(transferCollectedCents)}</dd>
          </div>
          <div>
            <dt>Total cobrado</dt>
            <dd>{formatHnl(totalCollectedCents)}</dd>
          </div>
          <div>
            <dt>Efectivo esperado</dt>
            <dd>{formatHnl(session.expectedCashCents ?? 0)}</dd>
          </div>
          <div>
            <dt>Efectivo declarado</dt>
            <dd>{formatHnl(session.declaredCashCents ?? 0)}</dd>
          </div>
          <div className={styles.differenceSummary}>
            <dt>Diferencia</dt>
            <dd>
              {differenceCents > 0 ? "+" : ""}
              {formatHnl(differenceCents)}
            </dd>
          </div>
          <div>
            <dt>Depósito</dt>
            <dd>{formatHnl(deposit?.amountCents ?? 0)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section}>
        <h2>Control de atenciones</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Resultado</th>
              <th className={styles.numeric}>Casos</th>
              <th className={styles.numeric}>Monto cobrado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cobradas</td>
              <td className={styles.numeric}>{paidCases.length}</td>
              <td className={styles.numeric}>{formatHnl(totalCollectedCents)}</td>
            </tr>
            <tr>
              <td>No cobradas</td>
              <td className={styles.numeric}>{unpaidCases.length}</td>
              <td className={styles.numeric}>{formatHnl(0)}</td>
            </tr>
            <tr>
              <td>Abandonadas</td>
              <td className={styles.numeric}>{abandonedCases.length}</td>
              <td className={styles.numeric}>{formatHnl(0)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total de atenciones</td>
              <td className={styles.numeric}>{orderedCases.length}</td>
              <td className={styles.numeric}>{formatHnl(totalCollectedCents)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className={styles.section}>
        <h2>Detalle de atenciones y movimientos</h2>
        {orderedCases.length > 0 ? (
          <table className={`${styles.table} ${styles.caseTable}`}>
            <thead>
              <tr>
                <th>Atención / fecha</th>
                <th>Paciente</th>
                <th>Servicios / proveedor</th>
                <th>Estado / pago</th>
                <th className={styles.numeric}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orderedCases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>At. {item.attentionNumber}</strong>
                    <small>{formatDateTime(item.createdAt)}</small>
                    {item.receiptNumber ? (
                      <small>Recibo {item.receiptNumber}</small>
                    ) : null}
                  </td>
                  <td>
                    <strong>
                      {item.patient.firstNames} {item.patient.lastNames}
                    </strong>
                    <small>{item.patient.documentNumber}</small>
                    <small>
                      Tarifa: {item.patient.tariffCategory.replaceAll("_", " ")}
                    </small>
                  </td>
                  <td>
                    {item.services.length > 0 ? (
                      item.services.map((service) => (
                        <span className={styles.serviceLine} key={service.id}>
                          <strong>
                            {service.code} · {service.name}
                          </strong>
                          <small>
                            {service.providerName} · {formatHnl(service.priceCents)}
                          </small>
                        </span>
                      ))
                    ) : (
                      <small>Sin servicios asignados</small>
                    )}
                  </td>
                  <td>
                    <strong>{statusLabel(item)}</strong>
                    <small>{paymentDetail(item)}</small>
                    {item.abandonmentReason ? (
                      <small>Motivo: {item.abandonmentReason}</small>
                    ) : null}
                  </td>
                  <td className={styles.numeric}>
                    {formatHnl(item.status === "pagada" ? item.totalCents : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyText}>La jornada no tuvo atenciones.</p>
        )}
      </section>

      <section className={`${styles.section} ${styles.notesSection}`}>
        <h2>Depósito y observaciones</h2>
        <dl>
          <div>
            <dt>Depósito bancario</dt>
            <dd>
              {deposit
                ? `${deposit.bank} · Ref. ${deposit.reference} · ${formatHnl(deposit.amountCents)}`
                : "No se registró depósito con este cierre."}
            </dd>
          </div>
          <div>
            <dt>Observaciones de apertura</dt>
            <dd>{session.openingNotes ?? "Sin observaciones."}</dd>
          </div>
          <div>
            <dt>Observaciones de cierre / diferencia</dt>
            <dd>{session.closingNotes ?? "Sin observaciones."}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.signatures} aria-label="Firmas del cierre">
        <div>
          <span />
          <strong>Responsable de caja</strong>
          <small>Nombre, firma y fecha</small>
        </div>
        <div>
          <span />
          <strong>Revisión / supervisión</strong>
          <small>Nombre, firma y fecha</small>
        </div>
      </section>

      <footer className={styles.documentFooter}>
        <span>Generado mediante SIEMC</span>
        <span>Cierre: {formatDateTime(session.closedAt)}</span>
      </footer>
    </article>
  );
}
