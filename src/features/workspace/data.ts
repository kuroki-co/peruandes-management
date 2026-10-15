import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  accessSchema,
  canAccess,
  snapshotSchema,
  type ModuleId,
} from "./model";

export async function session() {
  await connection();
  if (!getSupabaseEnv()) return { status: "setup" as const };
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  const { data, error: profileError } = await db.rpc("my_access");
  if (profileError)
    return {
      status: ["PGRST202", "42P01"].includes(profileError.code)
        ? ("migration" as const)
        : ("error" as const),
    };
  const result = accessSchema.safeParse(data);
  if (!result.success || !result.data.active)
    return { status: "denied" as const };
  return { status: "ready" as const, access: result.data, db };
}
export async function requireModule(module: ModuleId) {
  const ctx = await session();
  if (ctx.status !== "ready" || !canAccess(ctx.access, module))
    throw new Error("No tienes permiso para esta operación.");
  return ctx;
}
export async function loadWorkspace(module: ModuleId) {
  const ctx = await session();
  if (ctx.status !== "ready") return ctx;
  if (!canAccess(ctx.access, module)) return { status: "denied" as const };
  const { data, error } = await ctx.db.rpc("workspace_data", {
    p_module: module,
  });
  if (error) return { status: "error" as const };
  const parsed = snapshotSchema.safeParse(data);
  if (!parsed.success) return { status: "error" as const };
  return { status: "ready" as const, access: ctx.access, data: parsed.data };
}
