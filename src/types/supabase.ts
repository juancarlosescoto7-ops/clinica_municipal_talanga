interface SupabaseRpcDefinition {
  Args: Record<string, unknown>;
  Returns: unknown;
}

/**
 * Superficie mínima compartida mientras las operaciones se consumen por RPC.
 * Puede sustituirse posteriormente por los tipos generados desde Supabase.
 */
export interface SupabaseDatabase {
  public: {
    Functions: Record<string, SupabaseRpcDefinition>;
    Tables: Record<string, never>;
    Views: Record<string, never>;
  };
}
