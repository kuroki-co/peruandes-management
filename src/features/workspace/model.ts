import { z } from "zod";

export const modules = [
  {
    id: "dashboard",
    path: "/dashboard",
    name: "Dashboard",
    description: "La operación de Perú Andes, en un solo lugar.",
    icon: "◫",
  },
  {
    id: "intermediaries",
    path: "/intermediarios",
    name: "Intermediarios",
    description: "Hoteles, agencias y acuerdos comerciales.",
    icon: "▦",
  },
  {
    id: "bookings",
    path: "/reservas",
    name: "Reservas",
    description: "Reservas registradas y requerimientos de cada pasajero.",
    icon: "▤",
  },
  {
    id: "operations",
    path: "/operaciones",
    name: "Operaciones",
    description: "Salidas, movilidades, guías y manifiestos.",
    icon: "◈",
  },
  {
    id: "connections",
    path: "/conexiones",
    name: "Conexiones",
    description: "Seguimiento de los pasajeros que continúan hacia Puno.",
    icon: "↗",
  },
  {
    id: "providers",
    path: "/proveedores",
    name: "Proveedores",
    description: "Operadores externos y servicios tercerizados.",
    icon: "◇",
  },
  {
    id: "finance",
    path: "/finanzas",
    name: "Finanzas",
    description: "Cuentas corrientes, abonos, adelantos y liquidaciones.",
    icon: "▣",
  },
  {
    id: "settings",
    path: "/configuracion",
    name: "Configuración",
    description: "Servicios turísticos y catálogo de adicionales.",
    icon: "⚙",
  },
  {
    id: "staff",
    path: "/vendedoras",
    name: "Vendedoras",
    description: "Cuentas del equipo y permisos de acceso.",
    icon: "♧",
  },
] as const;
export type ModuleId = (typeof modules)[number]["id"];
export type Row = Record<string, unknown>;
export const snapshotSchema = z.record(
  z.string(),
  z.array(z.record(z.string(), z.unknown())),
);
export type Snapshot = z.infer<typeof snapshotSchema>;
export const accessSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  role: z.enum(["sales", "superadmin"]),
  active: z.boolean(),
  revoked_modules: z.array(z.string()),
});
export type Access = z.infer<typeof accessSchema>;
export function canAccess(access: Access, module: ModuleId) {
  return (
    access.active &&
    (access.role === "superadmin" ||
      (module !== "staff" && !access.revoked_modules.includes(module)))
  );
}
export const text = (row: Row, key: string): string =>
  typeof row[key] === "string" || typeof row[key] === "number"
    ? String(row[key])
    : "";
export const number = (row: Row, key: string): number => Number(row[key] ?? 0);
export const money = (amount: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    Object.is(amount, -0) ? 0 : amount,
  );
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export const labels: Record<string, string> = {
  registered: "Registrada",
  cancelled: "Cancelada",
  reserved: "Programado",
  attended: "Asistió",
  no_show: "NO SHOW",
  pending: "Pendiente",
  coordinated: "Coordinada",
  transferred: "Transferido",
  completed: "Completada",
  incident: "Incidencia",
  hotel: "Hotel",
  agency: "Agencia",
  driver: "Conductor",
  guide: "Guía",
  receivable: "Por cobrar",
  payable: "Por pagar",
  charge: "Cargo",
  payment: "Pago",
  advance: "Adelanto",
  adjustment: "Ajuste",
  unconfirmed: "Por confirmar",
  peru_andes: "Perú Andes",
  intermediary: "Intermediario",
  third_party: "Tercero",
  shared: "Compartida",
  single: "Simple",
  double: "Doble / matrimonial",
  triple: "Triple",
  sales: "Vendedora",
  superadmin: "Superadministrador",
};

export function dateInLima(value: string) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d)
    : "";
}
export function timeInLima(value: string) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d)
    : "";
}
