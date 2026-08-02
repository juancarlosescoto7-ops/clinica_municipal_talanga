import type {
  CashSessionRecord,
  CashSessionRpcRow,
} from "../types/caja.types";

function moneyToCents(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

export function mapCashSessionRpcRow(
  row: CashSessionRpcRow,
): CashSessionRecord {
  return {
    id: row.caja_sesion_id,
    code: "PRINCIPAL",
    status: row.estado,
    openingAmountCents: moneyToCents(row.monto_inicial) ?? 0,
    openedAt: row.abierta_en,
    openingNotes: null,
    closedAt: row.cerrada_en,
    expectedCashCents: moneyToCents(row.efectivo_esperado),
    declaredCashCents: moneyToCents(row.efectivo_declarado),
    differenceCents: moneyToCents(row.diferencia),
    closingNotes: null,
  };
}
