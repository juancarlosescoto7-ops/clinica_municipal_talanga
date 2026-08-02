import type { ReactNode } from "react";

import { MunicipalLogo } from "@/components/shared/municipal-logo";
import { SessionControl } from "@/modules/autenticacion/components/session-control";

import type {
  NavigationSection,
  OperationalDayStatus,
} from "../types/navigation";
import { ClinicNavigation } from "./clinic-navigation";
import { ThemeToggle } from "./theme-toggle";

interface ClinicShellProps {
  children: ReactNode;
  navigationSections: readonly NavigationSection[];
  operationalDayStatus: OperationalDayStatus;
}

export function ClinicShell({
  children,
  navigationSections,
  operationalDayStatus,
}: ClinicShellProps) {
  const statusLabel =
    operationalDayStatus === "pending"
      ? "Apertura pendiente"
      : operationalDayStatus === "open"
        ? "Jornada activa"
        : "Caja cerrada";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="SIEMC, Clínica Municipal de Talanga">
          <span className="brand__logo-frame" aria-hidden="true">
            <MunicipalLogo
              className="brand__logo"
              alt=""
              width={42}
              height={44}
            />
          </span>
          <span>
            <span className="brand__name">SIEMC</span>
            <span className="brand__description">Clínica Municipal</span>
          </span>
        </div>

        <ClinicNavigation
          operationalDayStatus={operationalDayStatus}
          sections={navigationSections}
        />
      </aside>

      <div className="workspace">
        <header className="topbar">
          <SessionControl />
          <ThemeToggle />
          <span
            className={`environment-chip environment-chip--${operationalDayStatus}`}
          >
            <span className="environment-chip__dot" aria-hidden="true" />
            {statusLabel}
          </span>
        </header>

        <main className="main-content" id="contenido-principal">
          {children}
        </main>
      </div>
    </div>
  );
}
