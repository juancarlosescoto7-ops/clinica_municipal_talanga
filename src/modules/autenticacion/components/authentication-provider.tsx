"use client";

import type { AuthError, Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSupabaseBrowserClient } from "@/services";

import {
  internalEmailToUsername,
  usernameToInternalEmail,
} from "../services/username-auth";

type AuthenticationStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthenticatedOperator {
  id: string;
  username: string;
}

interface AuthenticationContextValue {
  operator: AuthenticatedOperator | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  status: AuthenticationStatus;
}

interface AuthenticationProviderProps {
  children: ReactNode;
}

const AuthenticationContext =
  createContext<AuthenticationContextValue | null>(null);

function operatorFromSession(
  session: Session | null,
): AuthenticatedOperator | null {
  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    username: internalEmailToUsername(session.user.email),
  };
}

function authenticationErrorMessage(error: AuthError | null): string {
  switch (error?.code) {
    case "email_not_confirmed":
      return "La cuenta existe, pero todavía no está confirmada en Supabase.";
    case "email_provider_disabled":
    case "provider_disabled":
      return "El acceso con contraseña está deshabilitado en Supabase.";
    case "user_banned":
      return "La cuenta está deshabilitada en Supabase.";
    case "weak_password":
      return "Supabase rechazó la contraseña por la política de seguridad configurada.";
    case "over_request_rate_limit":
      return "Se realizaron demasiados intentos. Espere un momento y vuelva a intentar.";
    case "request_timeout":
      return "Supabase no respondió a tiempo. Verifique la conexión e intente nuevamente.";
    case "invalid_credentials":
      return "El usuario no existe o la contraseña no coincide.";
    default:
      return "No fue posible iniciar sesión. Revise la configuración de la cuenta en Supabase.";
  }
}

export function AuthenticationProvider({
  children,
}: AuthenticationProviderProps) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthenticationStatus>("loading");

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setStatus(nextSession ? "authenticated" : "unauthenticated");
  }, []);

  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        applySession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, supabase]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const email = usernameToInternalEmail(username);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        throw new Error(authenticationErrorMessage(error));
      }

      applySession(data.session);
    },
    [applySession, supabase],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      throw new Error("No fue posible cerrar la sesión.");
    }

    applySession(null);
  }, [applySession, supabase]);

  const value = useMemo<AuthenticationContextValue>(
    () => ({
      operator: operatorFromSession(session),
      signIn,
      signOut,
      status,
    }),
    [session, signIn, signOut, status],
  );

  return (
    <AuthenticationContext.Provider value={value}>
      {children}
    </AuthenticationContext.Provider>
  );
}

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext);

  if (!context) {
    throw new Error(
      "useAuthentication debe utilizarse dentro de AuthenticationProvider.",
    );
  }

  return context;
}
