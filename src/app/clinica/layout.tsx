import type { ReactNode } from "react";

import {
  AuthenticationGuard,
  AuthenticationProvider,
} from "@/modules/autenticacion";
import {
  getClinicNavigation,
} from "@/modules/fundacion-visual";
import { ClinicWorkspaceShell } from "./clinic-workspace-shell";

interface ClinicLayoutProps {
  children: ReactNode;
}

export default function ClinicLayout({ children }: ClinicLayoutProps) {
  const navigationSections = getClinicNavigation();

  return (
    <AuthenticationProvider>
      <AuthenticationGuard>
        <ClinicWorkspaceShell navigationSections={navigationSections}>
          {children}
        </ClinicWorkspaceShell>
      </AuthenticationGuard>
    </AuthenticationProvider>
  );
}
