"use client";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginValues } from "./schema";

export async function signIn(values: LoginValues) {
  const credentials = loginSchema.parse(values);
  const { error } = await createClient().auth.signInWithPassword(credentials);
  return error;
}
