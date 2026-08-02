import type {
  RateValidity,
  ServiceStatus,
} from "../types/servicios.types";
import {
  getRateValidityLabel,
  getServiceStatusLabel,
} from "../utils/servicios-formatters";

import styles from "./servicios.module.css";

interface ServiceStatusBadgeProps {
  status: ServiceStatus;
}

interface RateValidityBadgeProps {
  validity: RateValidity;
}

export function ServiceStatusBadge({
  status,
}: ServiceStatusBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${
        status === "activo" ? styles.badgeActive : styles.badgeInactive
      }`}
    >
      <span aria-hidden="true" />
      {getServiceStatusLabel(status)}
    </span>
  );
}

export function RateValidityBadge({
  validity,
}: RateValidityBadgeProps) {
  const validityClass =
    validity === "vigente"
      ? styles.badgeActive
      : validity === "programada"
        ? styles.badgeScheduled
        : styles.badgeExpired;

  return (
    <span className={`${styles.badge} ${validityClass}`}>
      <span aria-hidden="true" />
      {getRateValidityLabel(validity)}
    </span>
  );
}

