"use client";

import { useMemo, useState } from "react";

import { ModuleDialog } from "@/components/shared/module-dialog";

import {
  abandonAttentionInSession,
  createAttentionInSession,
  createEmptyPatientsSession,
  filterPatients,
  registerPatientInSession,
} from "../services/pacientes-session.service";
import type {
  AbandonAttentionValues,
  CreateAttentionValues,
  PatientRegistrationValues,
} from "../types/pacientes.types";

import { AbandonmentForm } from "./abandonment-form";
import { CreateAttentionForm } from "./create-attention-form";
import { PatientHistoryPanel } from "./patient-history-panel";
import { PatientRegistrationForm } from "./patient-registration-form";
import { PatientTable } from "./patient-table";
import styles from "./pacientes.module.css";
import { RecentAttentions } from "./recent-attentions";

type DialogName = "register" | "attention" | "abandon" | "history" | null;

interface FeedbackState {
  message: string;
  tone: "success" | "warning";
}

export function PatientsWorkspace() {
  const [session, setSession] = useState(createEmptyPatientsSession);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [selectedAttentionId, setSelectedAttentionId] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const visiblePatients = useMemo(
    () => filterPatients(session.patients, searchTerm),
    [searchTerm, session.patients],
  );

  const selectedPatient = session.patients.find(
    (patient) => patient.id === selectedPatientId,
  );
  const selectedAttention = session.attentions.find(
    (attention) => attention.id === selectedAttentionId,
  );
  const attentionPatient = selectedAttention
    ? session.patients.find(
        (patient) => patient.id === selectedAttention.patientId,
      )
    : undefined;

  const pendingAttentionCount = session.attentions.filter(
    (attention) => attention.status === "pendiente_pago",
  ).length;
  const abandonedAttentionCount = session.attentions.filter(
    (attention) => attention.status === "abandonada",
  ).length;

  function closeDialog() {
    setDialog(null);
    setSelectedPatientId(null);
    setSelectedAttentionId(null);
  }

  function openPatientDialog(
    dialogName: "attention" | "history",
    patientId: string,
  ) {
    setSelectedPatientId(patientId);
    setDialog(dialogName);
  }

  function openAbandonDialog(attentionId: string) {
    setSelectedAttentionId(attentionId);
    setDialog("abandon");
  }

  function handleRegisterPatient(
    values: PatientRegistrationValues,
    createAttention: boolean,
    attentionNotes: string,
  ) {
    const result = registerPatientInSession(
      session,
      values,
      createAttention,
      attentionNotes,
    );

    if (result.success) {
      setSession(result.state);
      setFeedback({ message: result.message, tone: "success" });
    }

    return {
      success: result.success,
      message: result.message,
    };
  }

  function handleCreateAttention(values: CreateAttentionValues) {
    const result = createAttentionInSession(session, values);

    if (result.success) {
      setSession(result.state);
      setFeedback({ message: result.message, tone: "success" });
    }

    return {
      success: result.success,
      message: result.message,
    };
  }

  function handleAbandonAttention(values: AbandonAttentionValues) {
    const result = abandonAttentionInSession(session, values);

    if (result.success) {
      setSession(result.state);
      setFeedback({ message: result.message, tone: "warning" });
    }

    return {
      success: result.success,
      message: result.message,
    };
  }

  return (
    <div className={styles.module}>
      <header className={styles.moduleHeader}>
        <div>
          <h1>Pacientes y atenciones</h1>
        </div>
        <button
          className={styles.primaryButton}
          onClick={() => setDialog("register")}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Registrar paciente
        </button>
      </header>

      {feedback ? (
        <div
          className={`${styles.feedback} ${
            feedback.tone === "warning"
              ? styles.feedbackWarning
              : styles.feedbackSuccess
          }`}
          role="status"
        >
          <span aria-hidden="true">✓</span>
          <p>{feedback.message}</p>
          <button
            aria-label="Cerrar mensaje"
            onClick={() => setFeedback(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className={styles.metrics} aria-label="Resumen de la sesión">
        <article className={styles.metricCard}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M16 19.5v-1.25A3.25 3.25 0 0 0 12.75 15h-5.5A3.25 3.25 0 0 0 4 18.25v1.25M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            </svg>
          </span>
          <div>
            <span>Pacientes</span>
            <strong>{session.patients.length}</strong>
            <small>En esta sesión</small>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 7v5l3 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
            </svg>
          </span>
          <div>
            <span>Pendientes de pago</span>
            <strong>{pendingAttentionCount}</strong>
            <small>Atenciones abiertas</small>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 5h12v15H6zM9 2.5h6V7H9zM9 11h6M9 15h4" />
            </svg>
          </span>
          <div>
            <span>Atenciones</span>
            <strong>{session.attentions.length}</strong>
            <small>Total de la sesión</small>
          </div>
        </article>
        <article className={`${styles.metricCard} ${styles.metricCardAlert}`}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 8v5M12 16.5h.01M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
            </svg>
          </span>
          <div>
            <span>Abandonadas</span>
            <strong>{abandonedAttentionCount}</strong>
            <small>Con justificación</small>
          </div>
        </article>
      </section>

      <section className={styles.panel} aria-labelledby="patients-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="patients-title">Pacientes registrados</h2>
          </div>
          <label className={styles.searchField}>
            <span className={styles.visuallyHidden}>Buscar pacientes</span>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="6.3" />
              <path d="m15.4 15.4 4.1 4.1" />
            </svg>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre o documento"
              type="search"
              value={searchTerm}
            />
          </label>
        </div>
        <PatientTable
          attentions={session.attentions}
          onCreateAttention={(patientId) =>
            openPatientDialog("attention", patientId)
          }
          onOpenHistory={(patientId) =>
            openPatientDialog("history", patientId)
          }
          patients={visiblePatients}
        />
        <footer className={styles.panelFooter}>
          <span>
            {visiblePatients.length} de {session.patients.length} pacientes
          </span>
          <span>Datos de la sesión actual</span>
        </footer>
      </section>

      <section className={styles.panel} aria-labelledby="attentions-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="attentions-title">Atenciones recientes</h2>
          </div>
        </div>
        <RecentAttentions
          attentions={session.attentions}
          onAbandon={openAbandonDialog}
          onOpenHistory={(patientId) =>
            openPatientDialog("history", patientId)
          }
          patients={session.patients}
        />
      </section>

      {dialog === "register" ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Registrar paciente"
          wide
        >
          <PatientRegistrationForm
            onCompleted={closeDialog}
            onSubmit={handleRegisterPatient}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "attention" && selectedPatient ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Crear atención"
        >
          <CreateAttentionForm
            onCompleted={closeDialog}
            onSubmit={handleCreateAttention}
            patient={selectedPatient}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "abandon" &&
      selectedAttention &&
      attentionPatient ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Registrar abandono"
        >
          <AbandonmentForm
            attention={selectedAttention}
            onCompleted={closeDialog}
            onSubmit={handleAbandonAttention}
            patient={attentionPatient}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "history" && selectedPatient ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Historial del paciente"
          wide
        >
          <PatientHistoryPanel
            attentions={session.attentions}
            events={session.events}
            patient={selectedPatient}
          />
        </ModuleDialog>
      ) : null}
    </div>
  );
}
