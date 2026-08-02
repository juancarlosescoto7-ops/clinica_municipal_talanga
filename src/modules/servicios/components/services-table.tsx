import {
  getCurrentRate,
  getRateValidity,
} from "../services/servicios-session.service";
import type {
  ServiceRateRecord,
  ServiceRecord,
} from "../types/servicios.types";
import {
  formatDate,
  formatHnlFromCents,
} from "../utils/servicios-formatters";

import { RateValidityBadge, ServiceStatusBadge } from "./service-status-badge";
import styles from "./servicios.module.css";

interface ServicesTableProps {
  onEdit: (serviceId: string) => void;
  onOpenRates: (serviceId: string) => void;
  onScheduleRate: (serviceId: string) => void;
  rates: readonly ServiceRateRecord[];
  services: readonly ServiceRecord[];
}

export function ServicesTable({
  onEdit,
  onOpenRates,
  onScheduleRate,
  rates,
  services,
}: ServicesTableProps) {
  if (services.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4.5 7.5h15M7 4.5v6M17 4.5v6M5.5 11.5h13v8h-13zM9 15.5h6" />
          </svg>
        </span>
        <strong>No hay servicios para mostrar</strong>
        <p>Crea un servicio o modifica los filtros del catálogo.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Estado</th>
            <th>Tarifa vigente</th>
            <th>Vigencia</th>
            <th>
              <span className={styles.visuallyHidden}>Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            const currentRate = getCurrentRate(rates, service.id);

            return (
              <tr key={service.id}>
                <td>
                  <div className={styles.serviceCell}>
                    <span aria-hidden="true">{service.code.slice(0, 2)}</span>
                    <div>
                      <strong>{service.name}</strong>
                      <small>{service.code}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <ServiceStatusBadge status={service.status} />
                </td>
                <td>
                  {currentRate ? (
                    <strong className={styles.amount}>
                      {formatHnlFromCents(currentRate.amountCents)}
                    </strong>
                  ) : (
                    <span className={styles.muted}>Sin tarifa vigente</span>
                  )}
                </td>
                <td>
                  {currentRate ? (
                    <div className={styles.validityCell}>
                      <RateValidityBadge
                        validity={getRateValidity(currentRate)}
                      />
                      <small>
                        Desde {formatDate(currentRate.validFrom)}
                      </small>
                    </div>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.textButton}
                      onClick={() => onOpenRates(service.id)}
                      type="button"
                    >
                      Historial
                    </button>
                    <button
                      className={styles.textButton}
                      onClick={() => onScheduleRate(service.id)}
                      type="button"
                    >
                      Nueva tarifa
                    </button>
                    <button
                      aria-label={`Editar ${service.name}`}
                      className={styles.iconButton}
                      onClick={() => onEdit(service.id)}
                      type="button"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="m14.5 5.5 4 4M6 18l2.1-5.1L16.4 4.6a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2l-8.3 8.3L6 18Z" />
                      </svg>
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

