export type StaffStatus = "activo" | "inactivo";

export interface StaffValues {
  code: string;
  fullName: string;
  role: string;
  status: StaffStatus;
}

export interface StaffSalaryValues {
  staffId: string;
  amount: string;
  validFrom: string;
  validUntil: string;
}

export interface StaffRpcRow {
  personal_id: string;
  codigo: string;
  nombre_completo: string;
  cargo: string;
  estado: StaffStatus;
  created_at: string;
  updated_at: string;
}

export interface StaffSalaryRpcRow {
  salario_id: string;
  personal_id: string;
  monto: string;
  moneda: "HNL";
  vigente_desde: string;
  vigente_hasta: string | null;
  created_at: string;
}

export interface StaffWithSalaryRpcRow extends StaffRpcRow {
  salario_id: string | null;
  salario_vigente: string | null;
  moneda: "HNL" | null;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  total_resultados: string;
}

export interface ListStaffInput {
  query: string;
  status: "todos" | StaffStatus;
  referenceDate: string;
  page: number;
  pageSize: number;
}
