import type {
  AttentionRecord,
  PatientRecord,
} from "../types/pacientes.types";
import {
  formatDateTime,
  formatPatientName,
  getDocumentTypeLabel,
} from "../utils/pacientes-formatters";

import styles from "./pacientes.module.css";
import { StatusBadge } from "./status-badge";

interface PatientTableProps {
  attentions: readonly AttentionRecord[];
  onCreateAttention: (patientId: string) => void;
  onOpenHistory: (patientId: string) => void;
  patients: readonly PatientRecord[];
}

function getLatestAttention(
  attentions: readonly AttentionRecord[],
  patientId: string,
): AttentionRecord | undefined {
  return attentions
    .filter((attention) => attention.patientId === patientId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function PatientTable({
  attentions,
  onCreateAttention,
  onOpenHistory,
  patients,
}: PatientTableProps) {
  if (patients.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyStateIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M16 19.5v-1.25A3.25 3.25 0 0 0 12.75 15h-5.5A3.25 3.25 0 0 0 4 18.25v1.25M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8h4M19 6v4" />
          </svg>
        </span>
        <strong>No hay pacientes para mostrar</strong>
        <p>Registra un paciente o cambia el término de búsqueda.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Documento</th>
            <th>Última atención</th>
            <th>Estado</th>
            <th>
              <span className={styles.visuallyHidden}>Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const latestAttention = getLatestAttention(
              attentions,
              patient.id,
            );

            return (
              <tr key={patient.id}>
                <td>
                  <div className={styles.patientCell}>
                    <span className={styles.patientAvatar} aria-hidden="true">
                      {patient.firstNames.charAt(0)}
                      {patient.lastNames.charAt(0)}
                    </span>
                    <div>
                      <strong>{formatPatientName(patient)}</strong>
                      <small>
                        Registrado {formatDateTime(patient.createdAt)}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={styles.primaryCell}>
                    {patient.documentNumber}
                  </span>
                  <small className={styles.secondaryCell}>
                    {getDocumentTypeLabel(patient.documentType)}
                  </small>
                </td>
                <td>
                  {latestAttention ? (
                    <>
                      <span className={styles.primaryCell}>
                        {latestAttention.localNumber}
                      </span>
                      <small className={styles.secondaryCell}>
                        {formatDateTime(latestAttention.createdAt)}
                      </small>
                    </>
                  ) : (
                    <span className={styles.mutedCell}>Sin atenciones</span>
                  )}
                </td>
                <td>
                  {latestAttention ? (
                    <StatusBadge status={latestAttention.status} />
                  ) : (
                    <span className={styles.mutedCell}>—</span>
                  )}
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.textButton}
                      onClick={() => onOpenHistory(patient.id)}
                      type="button"
                    >
                      Historial
                    </button>
                    <button
                      className={styles.iconButton}
                      onClick={() => onCreateAttention(patient.id)}
                      title="Crear atención"
                      type="button"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className={styles.visuallyHidden}>
                        Crear atención para {formatPatientName(patient)}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

