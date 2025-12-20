import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type SupabaseEnv = {
  url?: string;
  key?: string;
  projectId?: string;
};

const readEnv = (): SupabaseEnv => {
  const env = import.meta.env as any;
  return {
    url: env.VITE_SUPABASE_URL,
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY,
    projectId: env.VITE_SUPABASE_PROJECT_ID,
  };
};

const resolveUrl = ({ url, projectId }: SupabaseEnv) => {
  if (url) return url;
  if (projectId) return `https://${projectId}.supabase.co`;
  return undefined;
};

const env = readEnv();
const resolvedUrl = resolveUrl(env);
const resolvedKey = env.key;

const configError =
  !resolvedUrl || !resolvedKey
    ? `Backend config missing: ${[
        !resolvedUrl ? "VITE_SUPABASE_URL (or VITE_SUPABASE_PROJECT_ID)" : null,
        !resolvedKey ? "VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)" : null,
      ]
        .filter(Boolean)
        .join(" + ")}.`
    : null;

if (configError) {
  // Avoid crashing on import; if code later tries to use the client, it will throw.
  console.error(configError);
}

export const supabase: SupabaseClient<Database> = configError
  ? (new Proxy({} as SupabaseClient<Database>, {
      get() {
        throw new Error(configError);
      },
    }) as SupabaseClient<Database>)
  : createClient<Database>(resolvedUrl!, resolvedKey!, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

export const getBackendConfigError = () => configError;
