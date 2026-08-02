"use client";

import { type FormEvent, useState } from "react";

import { MunicipalLogo } from "@/components/shared/municipal-logo";
import { ThemeToggle } from "@/modules/fundacion-visual/components/theme-toggle";

import { useAuthentication } from "./authentication-provider";
import styles from "./authentication.module.css";

export function LoginScreen() {
  const { signIn } = useAuthentication();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(username, password);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible iniciar la sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.loginPage} id="contenido-principal">
      <div className={styles.themeControl}>
        <ThemeToggle />
      </div>

      <section className={styles.loginCard} aria-labelledby="login-title">
        <div className={styles.loginBrand}>
          <MunicipalLogo
            alt="Escudo de la Municipalidad de Talanga"
            width={86}
            height={90}
          />
          <div>
            <strong>Municipalidad de Talanga</strong>
            <span>Clínica Municipal</span>
          </div>
        </div>

        <div className={styles.loginHeading}>
          <span>SIEMC</span>
          <h1 id="login-title">Iniciar sesión</h1>
          <p>Ingrese sus credenciales para acceder al sistema.</p>
        </div>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label>
            <span>Usuario</span>
            <input
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              disabled={isSubmitting}
              maxLength={32}
              minLength={3}
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Ingrese su usuario"
              required
              spellCheck={false}
              type="text"
              value={username}
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              disabled={isSubmitting}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingrese su contraseña"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className={styles.loginError} role="alert">
              {error}
            </p>
          ) : null}

          <button
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Verificando…" : "Ingresar"}
          </button>
        </form>

        <p className={styles.restrictedNotice}>
          Acceso exclusivo para personal autorizado.
        </p>
      </section>
    </main>
  );
}
