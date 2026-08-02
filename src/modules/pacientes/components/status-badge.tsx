import { getAttentionStatusLabel } from "../utils/pacientes-formatters";
import type { AttentionStatus } from "../types/pacientes.types";

import styles from "./pacientes.module.css";

interface StatusBadgeProps {
  status: AttentionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const className =
    status === "abandonada" || status === "anulada"
      ? styles.statusDanger
      : status === "pendiente_pago" || status === "registrada"
        ? styles.statusPending
        : styles.statusSuccess;

  return (
    <span className={`${styles.statusBadge} ${className}`}>
      <span aria-hidden="true" />
      {getAttentionStatusLabel(status)}
    </span>
  );
}

