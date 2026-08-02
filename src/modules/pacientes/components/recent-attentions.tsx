import type {
  AttentionRecord,
  PatientRecord,
} from "../types/pacientes.types";
import {
  formatDateTime,
  formatPatientName,
} from "../utils/pacientes-formatters";

import styles from "./pacientes.module.css";
import { StatusBadge } from "./status-badge";

interface RecentAttentionsProps {
  attentions: readonly AttentionRecord[];
  onAbandon: (attentionId: string) => void;
  onOpenHistory: (patientId: string) => void;
  patients: readonly PatientRecord[];
}

export function RecentAttentions({
  attentions,
  onAbandon,
  onOpenHistory,
  patients,
}: RecentAttentionsProps) {
  const sortedAttentions = [...attentions].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  if (sortedAttentions.length === 0) {
    return (
      <div className={styles.compactEmptyState}>
        <p>Las atenciones creadas durante esta sesión aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className={styles.attentionList}>
      {sortedAttentions.map((attention) => {
        const patient = patients.find(
          (currentPatient) => currentPatient.id === attention.patientId,
        );

        if (!patient) {
          return null;
        }

        const canAbandon =
          attention.status === "registrada" ||
          attention.status === "pendiente_pago";

        return (
          <article className={styles.attentionRow} key={attention.id}>
            <div className={styles.attentionNumber}>
              <span>{attention.localNumber}</span>
              <small>{formatDateTime(attention.createdAt)}</small>
            </div>
            <div className={styles.attentionPatient}>
              <strong>{formatPatientName(patient)}</strong>
              <small>{patient.documentNumber}</small>
            </div>
            <StatusBadge status={attention.status} />
            <div className={styles.rowActions}>
              <button
                className={styles.textButton}
                onClick={() => onOpenHistory(patient.id)}
                type="button"
              >
                Ver historial
              </button>
              {canAbandon ? (
                <button
                  className={styles.dangerTextButton}
                  onClick={() => onAbandon(attention.id)}
                  type="button"
                >
                  Registrar abandono
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

