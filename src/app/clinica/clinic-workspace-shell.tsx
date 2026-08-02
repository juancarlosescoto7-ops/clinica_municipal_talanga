"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  CashSessionProvider,
  useCashSession,
} from "@/modules/caja";
import { GuidedOperationProvider } from "@/modules/operacion-guiada";
import {
  CLINIC_ENTRY_PATH,
  ClinicShell,
  type NavigationSection,
  type OperationalDayStatus,
} from "@/modules/fundacion-visual";

interface ClinicWorkspaceShellProps {
  children: ReactNode;
  navigationSections: readonly NavigationSection[];
}

function ClinicWorkspaceContent({
  children,
  navigationSections,
}: ClinicWorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { error, isLoading, state } = useCashSession();
  const operationalDayStatus: OperationalDayStatus =
    state.session?.status === "abierta"
      ? "open"
      : state.session?.status === "cerrada"
        ? "closed"
        : "pending";
  const openingRequired =
    !isLoading &&
    operationalDayStatus === "pending" &&
    pathname !== CLINIC_ENTRY_PATH;

  useEffect(() => {
    if (openingRequired) {
      router.replace(CLINIC_ENTRY_PATH);
    }
  }, [openingRequired, router]);

  return (
    <ClinicShell
      navigationSections={navigationSections}
      operationalDayStatus={operationalDayStatus}
    >
      {isLoading ? (
        <section className="route-gate" aria-live="polite">
          <h1>Conectando con Supabase…</h1>
        </section>
      ) : error ? (
        <section className="route-gate" aria-live="assertive">
          <h1>No se pudo consultar la jornada</h1>
          <p>{error}</p>
        </section>
      ) : openingRequired ? (
        <section className="route-gate" aria-live="polite">
          <h1>Apertura de caja requerida</h1>
        </section>
      ) : (
        children
      )}
    </ClinicShell>
  );
}

export function ClinicWorkspaceShell(
  props: ClinicWorkspaceShellProps,
) {
  return (
    <CashSessionProvider>
      <GuidedOperationProvider>
        <ClinicWorkspaceContent {...props} />
      </GuidedOperationProvider>
    </CashSessionProvider>
  );
}
