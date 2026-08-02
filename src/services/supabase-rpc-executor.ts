import type { RpcExecutor } from "@/types/rpc";

import {
  getSupabaseBrowserClient,
  type SiemcSupabaseClient,
} from "./supabase";

let browserRpcExecutor: RpcExecutor | null = null;

export function createSupabaseRpcExecutor(
  client: SiemcSupabaseClient,
): RpcExecutor {
  return {
    async rpc<TResult>(
      functionName: string,
      parameters: Record<string, unknown>,
    ) {
      const response = await client.rpc(functionName, parameters);

      return {
        data: response.data as TResult | null,
        error: response.error
          ? {
              code: response.error.code,
              message: response.error.message,
            }
          : null,
      };
    },
  };
}

export function getSupabaseBrowserRpcExecutor(): RpcExecutor {
  if (browserRpcExecutor) {
    return browserRpcExecutor;
  }

  browserRpcExecutor = createSupabaseRpcExecutor(
    getSupabaseBrowserClient(),
  );

  return browserRpcExecutor;
}
