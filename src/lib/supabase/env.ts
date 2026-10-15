import { z } from "zod";

const supabaseEnvSchema = z.object({
  url: z.url(),
  publishableKey: z.string().trim().min(1),
});

export function getSupabaseEnv() {
  // Acceso estático: Next.js incorpora estas variables públicas en el navegador.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Permite desarrollar la base del proyecto antes de conectar Supabase.
  if (!url && !publishableKey) return null;

  const result = supabaseEnvSchema.safeParse({ url, publishableKey });
  if (!result.success) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
    );
  }
  return result.data;
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env)
    throw new Error("Supabase todavía no está configurado en .env.local.");
  return env;
}
