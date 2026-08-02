import type {
  PayableAttentionItem,
} from "../types/caja.types";
import {
  formatHnlFromCents,
} from "../utils/caja-formatters";

import styles from "./caja.module.css";

interface PendingChargesProps {
  attentions: readonly PayableAttentionItem[];
  disabled: boolean;
  onCharge: (attentionId: string) => void;
}

export function PendingCharges({
  attentions,
  disabled,
  onCharge,
}: PendingChargesProps) {
  const pendingAttentions = attentions.filter(
    (attention) => attention.status === "pendiente_pago",
  );

  if (pendingAttentions.length === 0) {
    return (
      <div className={styles.compactEmpty}>
        <p>No quedan atenciones pendientes de cobro.</p>
      </div>
    );
  }

  return (
    <div className={styles.chargeList}>
      {pendingAttentions.map((attention) => (
        <article className={styles.chargeRow} key={attention.id}>
          <span className={styles.patientAvatar} aria-hidden="true">
            {attention.patientName.charAt(0)}
          </span>
          <div className={styles.chargePatient}>
            <strong>{attention.patientName}</strong>
            <small>
              {attention.attentionNumber} · {attention.documentNumber}
            </small>
          </div>
          <div className={styles.chargeServices}>
            {attention.services.map((service) => (
              <span key={service.code}>{service.name}</span>
            ))}
          </div>
          <strong className={styles.chargeAmount}>
            {formatHnlFromCents(attention.totalCents)}
          </strong>
          <button
            className={styles.chargeButton}
            disabled={disabled}
            onClick={() => onCharge(attention.id)}
            type="button"
          >
            Cobrar
          </button>
        </article>
      ))}
    </div>
  );
}
