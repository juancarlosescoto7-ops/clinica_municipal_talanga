import {
  getRateValidity,
} from "../services/servicios-session.service";
import type {
  ServiceRateRecord,
  ServiceRecord,
} from "../types/servicios.types";
import { TARIFF_CATEGORY_LABELS } from "@/modules/pacientes/types/pacientes.types";
import {
  formatDate,
  formatHnlFromCents,
} from "../utils/servicios-formatters";

import { RateValidityBadge, ServiceStatusBadge } from "./service-status-badge";
import styles from "./servicios.module.css";

interface RateHistoryPanelProps {
  rates: readonly ServiceRateRecord[];
  service: ServiceRecord;
}

export function RateHistoryPanel({
  rates,
  service,
}: RateHistoryPanelProps) {
  const serviceRates = rates
    .filter((rate) => rate.serviceId === service.id)
    .sort((left, right) =>
      right.validFrom.localeCompare(left.validFrom),
    );

  return (
    <div className={styles.history}>
      <section className={styles.serviceProfile}>
        <span aria-hidden="true">{service.code.slice(0, 2)}</span>
        <div>
          <h3>{service.name}</h3>
          <p>{service.code}</p>
        </div>
        <ServiceStatusBadge status={service.status} />
      </section>

      <section className={styles.historySection}>
        <div className={styles.historyHeading}>
          <div>
            <h3>Tarifas y vigencias</h3>
          </div>
          <span>{serviceRates.length}</span>
        </div>

        {serviceRates.length === 0 ? (
          <div className={styles.compactEmpty}>
            <p>Este servicio todavía no tiene tarifas programadas.</p>
          </div>
        ) : (
          <div className={styles.rateList}>
            {serviceRates.map((rate) => (
              <article className={styles.rateCard} key={rate.id}>
                <div>
                  <strong>{formatHnlFromCents(rate.amountCents)}</strong>
                  <small>{TARIFF_CATEGORY_LABELS[rate.tariffCategory]} · HNL</small>
                </div>
                <dl>
                  <div>
                    <dt>Desde</dt>
                    <dd>{formatDate(rate.validFrom)}</dd>
                  </div>
                  <div>
                    <dt>Hasta</dt>
                    <dd>
                      {rate.validUntil
                        ? formatDate(rate.validUntil)
                        : "Indefinida"}
                    </dd>
                  </div>
                </dl>
                <RateValidityBadge validity={getRateValidity(rate)} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
