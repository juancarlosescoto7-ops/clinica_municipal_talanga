import type {
  AttentionEventRecord,
  AttentionRecord,
  PatientRecord,
} from "../types/pacientes.types";
import {
  formatDate,
  formatDateTime,
  formatPatientName,
  getDocumentTypeLabel,
} from "../utils/pacientes-formatters";

import styles from "./pacientes.module.css";
import { StatusBadge } from "./status-badge";

interface PatientHistoryPanelProps {
  attentions: readonly AttentionRecord[];
  events: readonly AttentionEventRecord[];
  patient: PatientRecord;
}

export function PatientHistoryPanel({
  attentions,
  events,
  patient,
}: PatientHistoryPanelProps) {
  const patientAttentions = attentions
    .filter((attention) => attention.patientId === patient.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <div className={styles.history}>
      <section className={styles.patientProfile}>
        <span className={styles.profileAvatar} aria-hidden="true">
          {patient.firstNames.charAt(0)}
          {patient.lastNames.charAt(0)}
        </span>
        <div className={styles.profileIdentity}>
          <h3>{formatPatientName(patient)}</h3>
          <p>
            {getDocumentTypeLabel(patient.documentType)} ·{" "}
            {patient.documentNumber}
          </p>
        </div>
        <dl className={styles.profileDetails}>
          <div>
            <dt>Nacimiento</dt>
            <dd>{formatDate(patient.birthDate)}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{patient.phone ?? "No registrado"}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{patient.email ?? "No registrado"}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.historySection}>
        <div className={styles.historyHeading}>
          <div>
            <h3>Atenciones registradas</h3>
          </div>
          <span>{patientAttentions.length}</span>
        </div>

        {patientAttentions.length === 0 ? (
          <div className={styles.compactEmptyState}>
            <p>Este paciente todavía no tiene atenciones.</p>
          </div>
        ) : (
          <div className={styles.timeline}>
            {patientAttentions.map((attention) => {
              const attentionEvents = events
                .filter((event) => event.attentionId === attention.id)
                .sort((left, right) =>
                  right.createdAt.localeCompare(left.createdAt),
                );

              return (
                <article className={styles.timelineItem} key={attention.id}>
                  <span className={styles.timelineMarker} aria-hidden="true" />
                  <div className={styles.timelineCard}>
                    <div className={styles.timelineHeader}>
                      <div>
                        <strong>{attention.localNumber}</strong>
                        <small>{formatDateTime(attention.createdAt)}</small>
                      </div>
                      <StatusBadge status={attention.status} />
                    </div>
                    {attention.notes ? (
                      <p className={styles.timelineNotes}>
                        {attention.notes}
                      </p>
                    ) : null}
                    {attentionEvents.length > 0 ? (
                      <ul className={styles.eventList}>
                        {attentionEvents.map((event) => (
                          <li key={event.id}>
                            <span>
                              {event.eventType === "atencion_creada"
                                ? "Atención creada"
                                : "Abandono registrado"}
                            </span>
                            <small>
                              {formatDateTime(event.createdAt)} ·{" "}
                              {event.detail}
                            </small>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
