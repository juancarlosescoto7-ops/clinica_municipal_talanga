"use client";

import { useState } from "react";

import styles from "./authentication.module.css";
import { useAuthentication } from "./authentication-provider";

export function SessionControl() {
  const { operator, signOut } = useAuthentication();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={styles.sessionControl}>
      <span className={styles.sessionIdentity}>
        <small>Sesión</small>
        <strong>{operator?.username ?? "Usuario"}</strong>
      </span>
      <button
        className={styles.signOutButton}
        disabled={isSigningOut}
        onClick={() => void handleSignOut()}
        type="button"
      >
        {isSigningOut ? "Saliendo…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
