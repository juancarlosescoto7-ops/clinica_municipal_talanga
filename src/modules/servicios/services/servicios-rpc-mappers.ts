import type {
  ServiceRateRecord,
  ServiceRateRpcRow,
  ServiceRecord,
  ServiceRpcRow,
} from "../types/servicios.types";

export function mapServiceRpcRow(row: ServiceRpcRow): ServiceRecord {
  return {
    id: row.servicio_id,
    code: row.codigo,
    name: row.nombre,
    description: row.descripcion,
    status: row.estado,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapServiceRateRpcRow(
  row: ServiceRateRpcRow,
): ServiceRateRecord {
  return {
    id: row.tarifa_id,
    serviceId: row.servicio_id,
    amountCents: Math.round(Number(row.monto) * 100),
    currency: row.moneda,
    tariffCategory: row.categoria_tarifaria ?? "general",
    validFrom: row.vigente_desde,
    validUntil: row.vigente_hasta,
    createdAt: row.created_at,
  };
}
