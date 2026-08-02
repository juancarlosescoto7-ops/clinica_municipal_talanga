import type { DailyReconciliationOverview } from "../types/arqueos.types";

const overview: DailyReconciliationOverview = {
  date: "2026-07-29",
  cashSessionCode: "PRINCIPAL-0729",
  validReceipts: 28,
  annulledReceipts: 2,
  expectedCash: 18_450,
  transferAmount: 9_600,
  totalCollected: 28_050,
  paymentRows: [
    {
      label: "Efectivo",
      transactions: 19,
      amount: 18_450,
      tone: "cash",
    },
    {
      label: "Transferencias",
      transactions: 9,
      amount: 9_600,
      tone: "transfer",
    },
  ],
  history: [
    {
      id: "ARQ-2026-003",
      date: "2026-07-28",
      expectedAmount: 24_900,
      declaredAmount: 24_900,
      difference: 0,
      status: "confirmado",
    },
    {
      id: "ARQ-2026-002",
      date: "2026-07-27",
      expectedAmount: 22_750,
      declaredAmount: 22_700,
      difference: -50,
      status: "con_diferencia",
    },
    {
      id: "ARQ-2026-001",
      date: "2026-07-26",
      expectedAmount: 19_300,
      declaredAmount: 19_300,
      difference: 0,
      status: "confirmado",
    },
  ],
};

export function getDailyReconciliationOverview(): DailyReconciliationOverview {
  return overview;
}
