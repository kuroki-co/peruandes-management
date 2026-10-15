"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import {
  actionSchemas,
  catalogSchemas,
  bookingSchema,
  type ActionKind,
} from "./schemas";
import { requireModule } from "./data";
import type { ModuleId } from "./model";

export type ActionResult = { ok: boolean; message: string; value?: string };
const ownership: Record<ActionKind, ModuleId> = {
  intermediaries: "intermediaries",
  providers: "providers",
  vehicles: "operations",
  crew: "operations",
  services: "settings",
  extras: "settings",
  tariff: "intermediaries",
  link: "intermediaries",
  booking: "bookings",
  bookingUpdate: "bookings",
  correction: "bookings",
  passenger: "bookings",
  passengerExtra: "bookings",
  attendance: "operations",
  departure: "operations",
  assignment: "operations",
  connection: "connections",
  lodging: "operations",
  guideFunds: "operations",
  removeLodging: "operations",
  outsourcing: "providers",
  movement: "finance",
  application: "finance",
  staff: "staff",
  createStaff: "staff",
};
function dbMessage(error: { code?: string; message: string }) {
  if (error.code === "P0001" || error.code === "42501")
    return error.message.slice(0, 250);
  if (error.code === "23505")
    return "Este registro ya existe. Revisa duplicados o la asignación de la movilidad.";
  if (error.code === "23503")
    return "Un registro relacionado no existe o cambió. Actualiza la página.";
  if (error.code === "23514")
    return "Los datos no cumplen las reglas del sistema.";
  return "No se pudo guardar. Comprueba la conexión y vuelve a intentarlo.";
}
export async function performAction(
  kind: ActionKind,
  input: unknown,
): Promise<ActionResult> {
  try {
    const targetModule = Object.hasOwn(ownership, kind)
      ? ownership[kind]
      : undefined;
    if (!targetModule) return { ok: false, message: "Operación no permitida." };
    const { db, access } = await requireModule(targetModule);
    let rpc = "";
    let args: Record<string, unknown> = {};
    let value: string | undefined;
    if (Object.hasOwn(catalogSchemas, kind)) {
      const schema = catalogSchemas[kind as keyof typeof catalogSchemas];
      const parsed = schema.safeParse(input);
      if (!parsed.success)
        return { ok: false, message: parsed.error.issues[0].message };
      rpc = "save_catalog";
      args = { p_kind: kind, p_data: parsed.data };
    } else {
      const parsed =
        actionSchemas[kind as keyof typeof actionSchemas].safeParse(input);
      if (!parsed.success)
        return { ok: false, message: parsed.error.issues[0].message };
      // Tipos inferidos por cada schema, sin confiar en campos del navegador.
      switch (kind) {
        case "tariff": {
          const d = actionSchemas.tariff.parse(input);
          rpc = "save_tariff";
          args = {
            p_intermediary: d.intermediary_id,
            p_service: d.service_id,
            p_amount: d.amount,
          };
          break;
        }
        case "link": {
          const d = actionSchemas.link.parse(input);
          value = d.revoke_id ? undefined : randomBytes(16).toString("hex");
          rpc = "manage_link";
          args = {
            p_intermediary: d.intermediary_id,
            p_token: value ?? "",
            p_revoke: d.revoke_id || null,
          };
          break;
        }
        case "booking":
          rpc = "create_internal_booking";
          args = { p_data: actionSchemas.booking.parse(input) };
          break;
        case "correction": {
          const d = actionSchemas.correction.parse(input);
          rpc = "correct_booking";
          args = {
            p_id: d.id,
            p_service: d.service_id,
            p_rate: d.amount,
            p_date: d.departure_date,
            p_reason: d.reason,
            p_request: d.request_id,
          };
          break;
        }
        case "bookingUpdate": {
          const d = actionSchemas.bookingUpdate.parse(input);
          rpc = "update_booking";
          args = {
            p_id: d.id,
            p_notes: d.notes,
            p_status: d.status,
            p_date: d.departure_date,
          };
          break;
        }
        case "passenger": {
          const d = actionSchemas.passenger.parse(input);
          rpc = "update_passenger";
          args = { p_id: d.id, p_data: d };
          break;
        }
        case "passengerExtra": {
          const d = actionSchemas.passengerExtra.parse(input);
          rpc = "set_passenger_extra";
          args = {
            p_passenger: d.passenger_id,
            p_extra: d.extra_id,
            p_quantity: d.quantity,
          };
          break;
        }
        case "attendance": {
          const d = actionSchemas.attendance.parse(input);
          rpc = "set_attendance";
          args = { p_passenger: d.passenger_id, p_status: d.status };
          break;
        }
        case "assignment": {
          const d = actionSchemas.assignment.parse(input);
          rpc = "assign_passenger";
          args = {
            p_passenger: d.passenger_id,
            p_departure: d.departure_id || null,
          };
          break;
        }
        case "departure":
          rpc = "save_departure";
          args = { p_data: parsed.data };
          break;
        case "connection":
          rpc = "save_connection";
          args = { p_data: parsed.data };
          break;
        case "guideFunds":
          rpc = "record_guide_funds";
          args = { p_data: parsed.data };
          break;
        case "lodging":
          rpc = "save_lodging";
          args = { p_data: parsed.data };
          break;
        case "removeLodging":
          rpc = "remove_lodging";
          args = { p_id: actionSchemas.removeLodging.parse(input).id };
          break;
        case "outsourcing":
          rpc = "record_outsourcing";
          args = { p_data: parsed.data };
          break;
        case "movement":
          rpc = "record_movement";
          args = { p_data: parsed.data };
          break;
        case "application": {
          const d = actionSchemas.application.parse(input);
          rpc = "apply_credit";
          args = {
            p_credit: d.credit_id,
            p_charge: d.charge_id,
            p_amount: d.amount,
            p_request: d.request_id,
          };
          break;
        }
        case "staff": {
          const d = actionSchemas.staff.parse(input);
          rpc = "update_staff";
          args = {
            p_id: d.id,
            p_active: d.active,
            p_revoked: d.revoked_modules,
          };
          break;
        }
        case "createStaff": {
          const d = actionSchemas.createStaff.parse(input);
          const admin = createAdminClient();
          const { data, error } = await admin.auth.admin.createUser({
            email: d.email,
            password: d.password,
            email_confirm: true,
          });
          if (error || !data.user)
            return {
              ok: false,
              message:
                "No se pudo crear la cuenta. Revisa si el correo ya está registrado y la configuración del servidor.",
            };
          const { error: profileError } = await admin.from("staff").insert({
            id: data.user.id,
            full_name: d.full_name,
            role: "sales",
            created_by: access.id,
          });
          if (profileError) {
            await admin.auth.admin.deleteUser(data.user.id);
            return {
              ok: false,
              message:
                "No se pudo crear el perfil. Comprueba la migración de la base de datos.",
            };
          }
          revalidatePath("/", "layout");
          return {
            ok: true,
            message:
              "Vendedora creada. Entrega sus credenciales mediante un canal privado.",
          };
        }
      }
    }
    const { error } = await db.rpc(rpc, args);
    if (error) return { ok: false, message: dbMessage(error) };
    revalidatePath("/", "layout");
    return { ok: true, message: "Guardado correctamente.", value };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && error.message.startsWith("La administración")
          ? error.message
          : "No se pudo completar la operación. Comprueba tu sesión y tus permisos.",
    };
  }
}
export async function submitPublicBooking(
  token: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  try {
    const env = requireSupabaseEnv();
    // Cliente sin sesión: el token limita el alta a su intermediario.
    const db = createStatelessClient(env.url, env.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.rpc("create_public_booking", {
      p_token: token,
      p_data: parsed.data,
    });
    if (error) return { ok: false, message: dbMessage(error) };
    return {
      ok: true,
      message:
        "Reserva registrada. Perú Andes ya dispone de los datos para organizar el servicio.",
      value: String(data),
    };
  } catch {
    return {
      ok: false,
      message:
        "No se pudo registrar. Comprueba la conexión y vuelve a intentarlo.",
    };
  }
}
export async function logout() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
