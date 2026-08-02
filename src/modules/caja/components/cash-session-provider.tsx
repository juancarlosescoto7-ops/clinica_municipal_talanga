"use client";

import {
  useCallback,
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

import { getSupabaseBrowserRpcExecutor } from "@/services";

import { createInitialCashRegisterState } from "../services/caja-session.service";
import { mapCashSessionRpcRow } from "../services/caja-rpc-mappers";
import { createCashService } from "../services/caja.service";
import type { CashRegisterState } from "../types/caja.types";

interface CashSessionContextValue {
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setState: Dispatch<SetStateAction<CashRegisterState>>;
  state: CashRegisterState;
}

interface CashSessionProviderProps {
  children: ReactNode;
}

const CashSessionContext = createContext<CashSessionContextValue | null>(null);

export function CashSessionProvider({
  children,
}: CashSessionProviderProps) {
  const [state, setState] = useState<CashRegisterState>(
    createInitialCashRegisterState,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = createCashService(getSupabaseBrowserRpcExecutor());
      const currentSession = await service.getCurrentCashRegister();

      setState((current) => ({
        ...current,
        session: currentSession
          ? mapCashSessionRpcRow(currentSession)
          : null,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible consultar la caja en Supabase.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return (
    <CashSessionContext.Provider
      value={{ error, isLoading, refresh, state, setState }}
    >
      {children}
    </CashSessionContext.Provider>
  );
}

export function useCashSession(): CashSessionContextValue {
  const context = useContext(CashSessionContext);

  if (!context) {
    throw new Error(
      "useCashSession debe utilizarse dentro de CashSessionProvider.",
    );
  }

  return context;
}
