"use client";

import { useState } from "react";

import styles from "@/components/shared/operations.module.css";

import type { CommissionProviderRow } from "../types/comisiones.types";

interface CommissionLiquidationPanelProps {
  providers: readonly CommissionProviderRow[];
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

export function CommissionLiquidationPanel({
  providers,
}: CommissionLiquidationPanelProps) {
  const [selectedId, setSelectedId] = useState(
    providers[0]?.id ?? "",
  );
  const selected =
    providers.find((provider) => provider.id === selectedId) ??
    providers[0];

  if (!selected) {
    return null;
  }

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <h3>Detalle del cálculo</h3>
        </div>
        <span
          className={`${styles.statusBadge} ${styles.statusDraft}`}
        >
          Pendiente
        </span>
      </header>

      <div className={styles.panelBody}>
        <label className={styles.field}>
          <span>Proveedor</span>
          <select
            onChange={(event) => setSelectedId(event.target.value)}
            value={selectedId}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.providerName}
              </option>
            ))}
          </select>
        </label>

        <dl className={styles.breakdownList}>
          <div>
            <dt>Servicios pagados</dt>
            <dd>{selected.paidServices}</dd>
          </div>
          <div>
            <dt>Tarifa por servicio</dt>
            <dd>{formatMoney(selected.unitRate)}</dd>
          </div>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(selected.grossAmount)}</dd>
          </div>
          <div>
            <dt>Ajustes manuales</dt>
            <dd>{formatMoney(selected.adjustments)}</dd>
          </div>
          <div>
            <dt>Total a liquidar</dt>
            <dd>{formatMoney(selected.netAmount)}</dd>
          </div>
        </dl>

        <form className={styles.form}>
          <label className={styles.field}>
            <span>Observación o ajuste</span>
            <textarea
              placeholder="Motivo del ajuste, si corresponde"
              rows={3}
            />
          </label>
          <label className={styles.field}>
            <span>Referencia de pago</span>
            <input placeholder="Pendiente de definir" />
          </label>
          <label className={styles.checkField}>
            <input type="checkbox" />
            <span>
              Confirmo visualmente el período y los servicios pagados
              incluidos.
            </span>
          </label>
          <div className={styles.disabledHint}>
            Revisa el cálculo antes de registrar la obligación de pago.
          </div>
          <div className={styles.actionRow}>
            <button className={styles.secondaryButton} type="button">
              Solicitar revisión
            </button>
            <button className={styles.primaryButton} type="button">
              Liquidar período
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
