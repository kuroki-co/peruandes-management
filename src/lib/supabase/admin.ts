import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key)
    throw new Error(
      "La administración de cuentas requiere SUPABASE_SECRET_KEY en el servidor.",
    );
  return createClient(requireSupabaseEnv().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
