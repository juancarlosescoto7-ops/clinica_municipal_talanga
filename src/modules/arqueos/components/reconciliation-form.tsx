"use client";

import { useMemo, useState } from "react";

import styles from "@/components/shared/operations.module.css";

interface ReconciliationFormProps {
  expectedCash: number;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

export function ReconciliationForm({
  expectedCash,
}: ReconciliationFormProps) {
  const [declaredCash, setDeclaredCash] = useState("18400");
  const [confirmed, setConfirmed] = useState(false);

  const difference = useMemo(() => {
    const value = Number(declaredCash);
    return Number.isFinite(value) ? value - expectedCash : 0;
  }, [declaredCash, expectedCash]);

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <h3>Confirmación del arqueo</h3>
        </div>
        <span
          className={`${styles.statusBadge} ${
            difference === 0
              ? styles.statusSuccess
              : styles.statusWarning
          }`}
        >
          {difference === 0 ? "Cuadrado" : "Con diferencia"}
        </span>
      </header>

      <div className={styles.panelBody}>
        <form className={styles.form}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Efectivo esperado</span>
              <input readOnly value={expectedCash.toFixed(2)} />
            </label>
            <label className={styles.field}>
              <span>Efectivo declarado</span>
              <input
                inputMode="decimal"
                onChange={(event) => setDeclaredCash(event.target.value)}
                value={declaredCash}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Justificación de la diferencia</span>
              <textarea
                placeholder="Obligatoria cuando el arqueo no cuadra"
                rows={4}
              />
              <small>
                Diferencia calculada: {formatMoney(difference)}
              </small>
            </label>
          </div>

          <label className={styles.checkField}>
            <input
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>
              Confirmo visualmente el conteo y la documentación del día.
            </span>
          </label>

          <div className={styles.disabledHint}>
            Verifica el conteo y la justificación antes de confirmar el arqueo.
          </div>

          <div className={styles.actionRow}>
            <button className={styles.secondaryButton} type="button">
              Guardar borrador
            </button>
            <button className={styles.primaryButton} type="button">
              Confirmar arqueo
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
