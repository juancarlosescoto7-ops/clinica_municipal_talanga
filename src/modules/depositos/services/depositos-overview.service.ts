import type { DepositOverview } from "../types/depositos.types";

const overview: DepositOverview = {
  pendingAmount: 18_450,
  depositedThisMonth: 412_850,
  pendingReconciliations: 1,
  differenceThisMonth: -50,
  sourceReconciliations: [
    {
      id: "ARQ-2026-003",
      date: "2026-07-28",
      availableAmount: 24_900,
      status: "incluido",
    },
    {
      id: "ARQ-2026-004",
      date: "2026-07-29",
      availableAmount: 18_450,
      status: "disponible",
    },
  ],
  history: [
    {
      id: "DEP-2026-004",
      depositDate: "2026-07-28",
      bank: "Banco municipal",
      reference: "REF-2026-9041",
      expectedAmount: 24_900,
      depositedAmount: 24_900,
      difference: 0,
      status: "conciliado",
      hasEvidence: true,
    },
    {
      id: "DEP-2026-003",
      depositDate: "2026-07-27",
      bank: "Banco municipal",
      reference: "REF-2026-9038",
      expectedAmount: 22_750,
      depositedAmount: 22_700,
      difference: -50,
      status: "con_diferencia",
      hasEvidence: true,
    },
    {
      id: "DEP-2026-002",
      depositDate: "2026-07-26",
      bank: "Banco municipal",
      reference: "REF-2026-9034",
      expectedAmount: 19_300,
      depositedAmount: 19_300,
      difference: 0,
      status: "conciliado",
      hasEvidence: true,
    },
    {
      id: "DEP-2026-001",
      depositDate: "2026-07-25",
      bank: "Pendiente",
      reference: "Sin registrar",
      expectedAmount: 17_850,
      depositedAmount: 0,
      difference: -17_850,
      status: "pendiente",
      hasEvidence: false,
    },
  ],
};

export function getDepositsOverview(): DepositOverview {
  return overview;
}
