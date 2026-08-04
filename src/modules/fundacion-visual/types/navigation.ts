export type NavigationIcon =
  | "patients"
  | "services"
  | "cash"
  | "reconciliation"
  | "deposits"
  | "reports"
  | "commissions"
  | "reprint";

export type ClinicRouteType =
  | "daily-operation"
  | "end-of-day-control"
  | "month-end-control"
  | "configuration";

export const CLINIC_PATHS = {
  cash: "/clinica/caja",
  reprints: "/clinica/reimpresiones",
  patients: "/clinica/pacientes",
  reconciliations: "/clinica/arqueos",
  deposits: "/clinica/depositos",
  reports: "/clinica/reportes",
  commissions: "/clinica/comisiones",
  services: "/clinica/servicios",
} as const;

export type ClinicPath = (typeof CLINIC_PATHS)[keyof typeof CLINIC_PATHS];

export interface NavigationItem {
  label: string;
  href: ClinicPath;
  icon: NavigationIcon;
  type: ClinicRouteType;
  isEntryPoint?: boolean;
  requiresOpenDay?: boolean;
}

export interface NavigationSection {
  label: string;
  type: ClinicRouteType;
  items: readonly NavigationItem[];
}

export type OperationalDayStatus = "pending" | "open" | "closed";
