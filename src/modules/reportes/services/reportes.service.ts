import type { RpcExecutor } from "@/types/rpc";

import type {
  MonthlyReportListRpcRow,
  MonthlyReportSummaryRpcRow,
  PersistedMonthlyReport,
} from "../types/reportes.types";

interface MonthlyReportJsonRpcRow {
  informe: PersistedMonthlyReport;
}

export interface ReportsService {
  generateMonthly(period: string): Promise<MonthlyReportSummaryRpcRow>;
  getMonthly(period: string): Promise<PersistedMonthlyReport | null>;
  listMonthly(): Promise<readonly MonthlyReportListRpcRow[]>;
}

export class ReportsServiceError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ReportsServiceError";
    this.code = code;
  }
}

async function executeRpc<TResult>(
  executor: RpcExecutor,
  name: string,
  parameters: Record<string, unknown>,
): Promise<TResult> {
  const response = await executor.rpc<TResult>(name, parameters);
  if (response.error) {
    throw new ReportsServiceError(response.error.message, response.error.code);
  }
  if (response.data === null) {
    throw new ReportsServiceError(`La RPC ${name} no retornó datos.`);
  }
  return response.data;
}

export function createReportsService(executor: RpcExecutor): ReportsService {
  return {
    async generateMonthly(period) {
      const rows = await executeRpc<MonthlyReportSummaryRpcRow[]>(
        executor,
        "generar_informe_mensual",
        { p_periodo: period },
      );
      const report = rows[0];
      if (!report) {
        throw new ReportsServiceError("La RPC no retornó el informe generado.");
      }
      return report;
    },

    async getMonthly(period) {
      const rows = await executeRpc<MonthlyReportJsonRpcRow[]>(
        executor,
        "obtener_informe_mensual",
        { p_periodo: period },
      );
      return rows[0]?.informe ?? null;
    },

    listMonthly() {
      return executeRpc<MonthlyReportListRpcRow[]>(
        executor,
        "listar_informes_mensuales",
        {},
      );
    },
  };
}
