import {
  CLINIC_PATHS,
  type NavigationSection,
} from "../types/navigation";

export const CLINIC_ENTRY_PATH = CLINIC_PATHS.cash;

const clinicNavigation: readonly NavigationSection[] = [
  {
    label: "Jornada",
    type: "daily-operation",
    items: [
      {
        label: "Operación guiada",
        href: CLINIC_PATHS.cash,
        icon: "cash",
        type: "daily-operation",
        isEntryPoint: true,
      },
    ],
  },
  {
    label: "Cierre mensual",
    type: "month-end-control",
    items: [
      {
        label: "Informe mensual",
        href: CLINIC_PATHS.reports,
        icon: "reports",
        type: "month-end-control",
      },
    ],
  },
  {
    label: "Configuración",
    type: "configuration",
    items: [
      {
        label: "Catálogo y tarifas",
        href: CLINIC_PATHS.services,
        icon: "services",
        type: "configuration",
      },
    ],
  },
];

export function getClinicNavigation(): readonly NavigationSection[] {
  return clinicNavigation;
}
