"use client";

import { useMemo, useState } from "react";

import styles from "@/components/shared/operations.module.css";

interface DepositRegistrationPanelProps {
  expectedAmount: number;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

export function DepositRegistrationPanel({
  expectedAmount,
}: DepositRegistrationPanelProps) {
  const [amount, setAmount] = useState("18450");
  const difference = useMemo(() => {
    const numericAmount = Number(amount);
    return Number.isFinite(numericAmount)
      ? numericAmount - expectedAmount
      : 0;
  }, [amount, expectedAmount]);

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <h3>Nuevo depósito</h3>
        </div>
        <span
          className={`${styles.statusBadge} ${
            difference === 0
              ? styles.statusSuccess
              : styles.statusWarning
          }`}
        >
          {difference === 0 ? "Conciliado" : "Con diferencia"}
        </span>
      </header>

      <div className={styles.panelBody}>
        <form className={styles.form}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Arqueo origen</span>
              <select defaultValue="ARQ-2026-004">
                <option value="ARQ-2026-004">
                  ARQ-2026-004 · 29/07/2026
                </option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Fecha del depósito</span>
              <input defaultValue="2026-07-30" type="date" />
            </label>
            <label className={styles.field}>
              <span>Banco</span>
              <input placeholder="Institución bancaria" />
            </label>
            <label className={styles.field}>
              <span>Referencia</span>
              <input placeholder="Número de operación" />
            </label>
            <label className={styles.field}>
              <span>Monto esperado</span>
              <input readOnly value={expectedAmount.toFixed(2)} />
            </label>
            <label className={styles.field}>
              <span>Monto depositado</span>
              <input
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                value={amount}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Justificación de diferencia</span>
              <textarea
                placeholder="Se habilitará cuando los montos no coincidan"
                rows={3}
              />
              <small>
                Diferencia calculada: {formatMoney(difference)}
              </small>
            </label>
          </div>

          <div className={styles.fileDrop}>
            <strong>Evidencia del depósito</strong>
            <span>Área visual para adjuntar imagen o PDF bancario</span>
            <button className={styles.secondaryButton} type="button">
              Seleccionar archivo
            </button>
          </div>

          <label className={styles.checkField}>
            <input type="checkbox" />
            <span>
              Confirmo que la referencia y la evidencia corresponden al
              depósito mostrado.
            </span>
          </label>

          <div className={styles.actionRow}>
            <button className={styles.secondaryButton} type="button">
              Guardar borrador
            </button>
            <button className={styles.primaryButton} type="button">
              Registrar depósito
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
