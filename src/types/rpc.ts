export interface RpcError {
  message: string;
  code?: string;
}

export interface RpcResponse<TResult> {
  data: TResult | null;
  error: RpcError | null;
}

export interface RpcExecutor {
  rpc<TResult>(
    functionName: string,
    parameters: Record<string, unknown>,
  ): Promise<RpcResponse<TResult>>;
}

