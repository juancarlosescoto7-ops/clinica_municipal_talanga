"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from "react";

import type { GuidedOperationState } from "../types/operacion-guiada.types";

interface GuidedOperationContextValue {
  state: GuidedOperationState;
  setState: Dispatch<SetStateAction<GuidedOperationState>>;
}

interface GuidedOperationProviderProps {
  children: ReactNode;
}

const initialState: GuidedOperationState = {
  step: "opening",
  activeAttentionId: null,
  activeAttentionNumber: null,
  activePatient: null,
  selectedServiceIds: [],
  cases: [],
  nextAttentionNumber: 1,
  feedback: null,
  closingDeposit: null,
};

const GuidedOperationContext =
  createContext<GuidedOperationContextValue | null>(null);

export function GuidedOperationProvider({
  children,
}: GuidedOperationProviderProps) {
  const [state, setState] = useState<GuidedOperationState>(initialState);

  return (
    <GuidedOperationContext.Provider value={{ state, setState }}>
      {children}
    </GuidedOperationContext.Provider>
  );
}

export function useGuidedOperation(): GuidedOperationContextValue {
  const context = useContext(GuidedOperationContext);

  if (!context) {
    throw new Error(
      "useGuidedOperation debe utilizarse dentro de GuidedOperationProvider.",
    );
  }

  return context;
}
