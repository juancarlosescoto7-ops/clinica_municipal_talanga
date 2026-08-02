"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ModuleDialog } from "@/components/shared/module-dialog";
import { getSupabaseBrowserRpcExecutor } from "@/services";

import {
  createEmptyServicesSession,
  filterServices,
  getCurrentRate,
  getRateValidity,
  todayAsLocalIsoDate,
} from "../services/servicios-session.service";
import {
  mapServiceRateRpcRow,
  mapServiceRpcRow,
} from "../services/servicios-rpc-mappers";
import { createServicesService } from "../services/servicios.service";
import type {
  RateFormValues,
  ServiceFormValues,
  ServiceStatus,
} from "../types/servicios.types";

import { RateForm } from "./rate-form";
import { RateHistoryPanel } from "./rate-history-panel";
import { ServiceForm } from "./service-form";
import styles from "./servicios.module.css";
import { ServicesTable } from "./services-table";

type DialogName = "create" | "edit" | "rate" | "history" | null;
type StatusFilter = "todos" | ServiceStatus;

interface FeedbackState {
  message: string;
}

export function ServicesWorkspace() {
  const service = useMemo(
    () => createServicesService(getSupabaseBrowserRpcExecutor()),
    [],
  );
  const [session, setSession] = useState(createEmptyServicesSession);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("todos");
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const rows = await service.listServices({
        query: "",
        status: "todos",
        page: 1,
        pageSize: 100,
        referenceDate: todayAsLocalIsoDate(),
        tariffCategory: "general",
      });
      const services = rows.map(mapServiceRpcRow);
      const rateGroups = await Promise.all(
        services.map((item) =>
          service.getServiceRates(item.id, todayAsLocalIsoDate()),
        ),
      );

      setSession({
        services,
        rates: rateGroups.flat().map(mapServiceRateRpcRow),
      });
    } catch (cause) {
      setLoadError(
        cause instanceof Error
          ? cause.message
          : "No fue posible cargar los servicios desde Supabase.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  const visibleServices = useMemo(
    () => filterServices(session.services, searchTerm, statusFilter),
    [searchTerm, session.services, statusFilter],
  );
  const selectedService = session.services.find(
    (service) => service.id === selectedServiceId,
  );
  const activeServices = session.services.filter(
    (service) => service.status === "activo",
  ).length;
  const servicesWithCurrentRate = session.services.filter((service) =>
    getCurrentRate(session.rates, service.id),
  ).length;
  const scheduledRates = session.rates.filter(
    (rate) => getRateValidity(rate) === "programada",
  ).length;

  function closeDialog() {
    setDialog(null);
    setSelectedServiceId(null);
  }

  function openServiceDialog(
    dialogName: "edit" | "rate" | "history",
    serviceId: string,
  ) {
    setSelectedServiceId(serviceId);
    setDialog(dialogName);
  }

  async function handleCreateService(values: ServiceFormValues) {
    try {
      await service.createService(values);
      await loadCatalog();
      setFeedback({ message: "Servicio guardado en Supabase." });
      return { success: true, message: "Servicio guardado." };
    } catch (cause) {
      return {
        success: false,
        message:
          cause instanceof Error
            ? cause.message
            : "No fue posible crear el servicio.",
      };
    }
  }

  async function handleUpdateService(values: ServiceFormValues) {
    if (!selectedServiceId) {
      return {
        success: false,
        message: "No hay un servicio seleccionado.",
      };
    }

    try {
      await service.updateService(selectedServiceId, values);
      await loadCatalog();
      setFeedback({ message: "Servicio actualizado en Supabase." });
      return { success: true, message: "Servicio actualizado." };
    } catch (cause) {
      return {
        success: false,
        message:
          cause instanceof Error
            ? cause.message
            : "No fue posible actualizar el servicio.",
      };
    }
  }

  async function handleScheduleRate(values: RateFormValues) {
    try {
      await service.scheduleRate(values);
      await loadCatalog();
      setFeedback({ message: "Tarifa guardada en Supabase." });
      return { success: true, message: "Tarifa guardada." };
    } catch (cause) {
      return {
        success: false,
        message:
          cause instanceof Error
            ? cause.message
            : "No fue posible programar la tarifa.",
      };
    }
  }

  return (
    <div className={styles.module}>
      <header className={styles.moduleHeader}>
        <div>
          <h1>Servicios y tarifas</h1>
        </div>
        <button
          className={styles.primaryButton}
          disabled={isLoading}
          onClick={() => setDialog("create")}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo servicio
        </button>
      </header>

      {isLoading ? (
        <div className={styles.feedback} role="status">
          <p>Cargando catálogo desde Supabase…</p>
        </div>
      ) : null}

      {loadError ? (
        <div className={styles.formAlert} role="alert">
          <p>{loadError}</p>
          <button onClick={() => void loadCatalog()} type="button">
            Reintentar
          </button>
        </div>
      ) : null}

      {feedback ? (
        <div className={styles.feedback} role="status">
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
        <article className={styles.metric}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 5h14v14H5zM8.5 9h7M8.5 12h7M8.5 15h4" />
            </svg>
          </span>
          <div>
            <span>Servicios</span>
            <strong>{session.services.length}</strong>
            <small>Total de la sesión</small>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m7 12 3 3 7-7M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
            </svg>
          </span>
          <div>
            <span>Activos</span>
            <strong>{activeServices}</strong>
            <small>Disponibles para asignar</small>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 7.5h10M7 12h10M7 16.5h6M5 4h14v16H5z" />
            </svg>
          </span>
          <div>
            <span>Con tarifa vigente</span>
            <strong>{servicesWithCurrentRate}</strong>
            <small>Según fecha vigente</small>
          </div>
        </article>
        <article className={`${styles.metric} ${styles.metricScheduled}`}>
          <span className={styles.metricIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 4v3M17 4v3M5 9h14M5 6h14v14H5zM9 13h2v2H9z" />
            </svg>
          </span>
          <div>
            <span>Programadas</span>
            <strong>{scheduledRates}</strong>
            <small>Vigencias futuras</small>
          </div>
        </article>
      </section>

      <section className={styles.panel} aria-labelledby="catalog-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="catalog-title">Servicios registrados</h2>
          </div>
          <div className={styles.filters}>
            <label className={styles.searchField}>
              <span className={styles.visuallyHidden}>Buscar servicios</span>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="10.8" cy="10.8" r="6.3" />
                <path d="m15.4 15.4 4.1 4.1" />
              </svg>
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por código o nombre"
                type="search"
                value={searchTerm}
              />
            </label>
            <label className={styles.filterSelect}>
              <span className={styles.visuallyHidden}>
                Filtrar por estado
              </span>
              <select
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                value={statusFilter}
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </label>
          </div>
        </div>

        <ServicesTable
          onEdit={(serviceId) => openServiceDialog("edit", serviceId)}
          onOpenRates={(serviceId) =>
            openServiceDialog("history", serviceId)
          }
          onScheduleRate={(serviceId) =>
            openServiceDialog("rate", serviceId)
          }
          rates={session.rates}
          services={visibleServices}
        />

        <footer className={styles.panelFooter}>
          <span>
            {visibleServices.length} de {session.services.length} servicios
          </span>
          <span>Moneda configurada: HNL</span>
        </footer>
      </section>

      {dialog === "create" ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Crear servicio"
        >
          <ServiceForm
            onCompleted={closeDialog}
            onSubmit={handleCreateService}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "edit" && selectedService ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Editar servicio"
        >
          <ServiceForm
            onCompleted={closeDialog}
            onSubmit={handleUpdateService}
            service={selectedService}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "rate" && selectedService ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Programar tarifa"
        >
          <RateForm
            onCompleted={closeDialog}
            onSubmit={handleScheduleRate}
            service={selectedService}
          />
        </ModuleDialog>
      ) : null}

      {dialog === "history" && selectedService ? (
        <ModuleDialog
          onClose={closeDialog}
          title="Historial de tarifas"
          wide
        >
          <RateHistoryPanel
            rates={session.rates}
            service={selectedService}
          />
        </ModuleDialog>
      ) : null}
    </div>
  );
}
