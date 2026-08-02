"use client";

import type { ReactNode } from "react";

import styles from "./authentication.module.css";
import { useAuthentication } from "./authentication-provider";
import { LoginScreen } from "./login-screen";

export function AuthenticationGuard({ children }: { children: ReactNode }) {
  const { status } = useAuthentication();

  if (status === "authenticated") {
    return children;
  }

  if (status === "unauthenticated") {
    return <LoginScreen />;
  }

  return (
    <main className={styles.authGate} id="contenido-principal">
      <span className={styles.spinner} aria-hidden="true" />
      <h1>Verificando acceso…</h1>
    </main>
  );
}
