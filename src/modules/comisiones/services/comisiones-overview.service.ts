import type { CommissionsOverview } from "../types/comisiones.types";

const overview: CommissionsOverview = {
  period: "Julio 2026",
  totalPaidServices: 450,
  accruedAmount: 29_360,
  liquidatedAmount: 0,
  pendingAmount: 29_360,
  providers: [
    {
      id: "PROV-001",
      providerName: "Ronald Deris Reyes",
      serviceName: "Examen médico",
      paidServices: 236,
      unitRate: 70,
      grossAmount: 16_520,
      adjustments: 0,
      netAmount: 16_520,
      status: "en_revision",
    },
    {
      id: "PROV-002",
      providerName: "Suamy Michelle Barahona",
      serviceName: "Examen psicológico",
      paidServices: 214,
      unitRate: 60,
      grossAmount: 12_840,
      adjustments: 0,
      netAmount: 12_840,
      status: "pendiente",
    },
  ],
  recentPeriods: [
    {
      id: "PER-2026-06",
      label: "Junio 2026",
      totalAmount: 58_840,
      status: "liquidada",
    },
    {
      id: "PER-2026-05",
      label: "Mayo 2026",
      totalAmount: 57_960,
      status: "liquidada",
    },
    {
      id: "PER-2026-04",
      label: "Abril 2026",
      totalAmount: 55_420,
      status: "liquidada",
    },
  ],
};

export function getCommissionsOverview(): CommissionsOverview {
  return overview;
}
