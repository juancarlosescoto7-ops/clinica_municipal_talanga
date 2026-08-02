import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { SupabaseDatabase } from "@/types/supabase";

export type SiemcSupabaseClient = SupabaseClient<SupabaseDatabase>;

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

interface SupabasePublicConfiguration {
  publishableKey: string;
  url: string;
}

const AUTH_STORAGE_KEY = "siemc-auth-session-v2";
let browserClient: SiemcSupabaseClient | null = null;

function getBrowserAuthStorage(projectUrl: string): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const projectReference = new URL(projectUrl).hostname.split(".")[0];

    if (projectReference) {
      window.localStorage.removeItem(`sb-${projectReference}-auth-token`);
    }

    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function requireEnvironmentValue(
  name: string,
  value: string | undefined,
): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new SupabaseConfigurationError(
      `Falta configurar ${name} en el archivo .env.local.`,
    );
  }

  return normalizedValue;
}

function validateProjectUrl(value: string): string {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Protocolo no permitido.");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    throw new SupabaseConfigurationError(
      "NEXT_PUBLIC_SUPABASE_URL debe contener una URL HTTP o HTTPS válida.",
    );
  }
}

export function getSupabasePublicConfiguration(): SupabasePublicConfiguration {
  const projectUrl = requireEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const publishableKey = requireEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return {
    publishableKey,
    url: validateProjectUrl(projectUrl),
  };
}

export function getSupabaseBrowserClient(): SiemcSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const configuration = getSupabasePublicConfiguration();
  const authStorage = getBrowserAuthStorage(configuration.url);

  browserClient = createClient<SupabaseDatabase>(
    configuration.url,
    configuration.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: Boolean(authStorage),
        storage: authStorage,
        storageKey: AUTH_STORAGE_KEY,
      },
      db: {
        schema: "public",
      },
    },
  );

  return browserClient;
}
