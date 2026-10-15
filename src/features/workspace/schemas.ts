import { z } from "zod";
const id = z.uuid("Selecciona un registro válido.");
const optionalId = z.preprocess(
  (v) => (v === null ? "" : v),
  z.union([id, z.literal("")]).default(""),
);
const name = z
  .string()
  .trim()
  .min(2, "Ingresa al menos dos caracteres.")
  .max(150);
const notes = z.string().max(3000).default("");
const amount = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce
    .number({ error: "Ingresa un importe válido." })
    .finite()
    .min(0)
    .max(99999999)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
      "Usa como máximo dos decimales.",
    ),
);
const date = z.iso.date("Ingresa una fecha válida.");
const common = { id: optionalId, name, active: z.boolean().default(true) };
const contact = {
  contact: z.string().max(150).default(""),
  phone: z.string().max(40).default(""),
};
export const catalogSchemas = {
  intermediaries: z.object({
    ...common,
    ...contact,
    kind: z.enum(["hotel", "agency"]),
  }),
  providers: z.object({ ...common, ...contact }),
  vehicles: z.object({
    ...common,
    plate: name,
    capacity: z.coerce.number().int().min(1).max(200),
  }),
  crew: z.object({
    ...common,
    kind: z.enum(["driver", "guide"]),
    phone: contact.phone,
  }),
  services: z
    .object({
      ...common,
      code: z.string().trim().min(2).max(50),
      days: z.coerce.number().int().min(1).max(365),
      nights: z.coerce.number().int().min(0).max(364),
    })
    .refine(
      (v) => v.nights < v.days,
      "Las noches deben ser menores que la duración.",
    ),
  extras: z.object({ ...common, amount }),
};
export const passengerSchema = z.object({
  full_name: name,
  phone: contact.phone,
  pickup: z.string().trim().min(2, "Indica el lugar de recojo.").max(250),
  pickup_time: z
    .string()
    .regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, "Indica una hora válida (HH:mm).")
    .default(""),
  notes,
  dietary: notes,
  allergies: notes,
  medication: notes,
  puno: z.boolean().default(false),
  coordinator: z
    .enum(["unconfirmed", "peru_andes", "intermediary", "third_party"])
    .default("unconfirmed"),
  extras: z
    .array(
      z.object({
        extra_id: id,
        expected_price: amount.optional(),
        quantity: z.coerce.number().int().min(1).max(50),
      }),
    )
    .max(20)
    .default([]),
});
export const bookingSchema = z.object({
  request_id: id,
  intermediary_id: optionalId,
  service_id: id,
  expected_rate: amount.optional(),
  departure_date: date,
  notes,
  passengers: z.array(passengerSchema).min(1).max(50),
});
export type BookingInput = z.input<typeof bookingSchema>;
export type BookingValues = z.output<typeof bookingSchema>;
export const actionSchemas = {
  tariff: z.object({ intermediary_id: id, service_id: id, amount }),
  link: z.object({ intermediary_id: id, revoke_id: optionalId }),
  booking: bookingSchema.refine((v) => Boolean(v.intermediary_id), {
    message: "Selecciona el intermediario.",
    path: ["intermediary_id"],
  }),
  correction: z.object({
    id,
    service_id: id,
    amount,
    departure_date: date,
    reason: z.string().trim().min(3).max(250),
    request_id: id,
  }),
  bookingUpdate: z.object({
    id,
    departure_date: date,
    status: z.enum(["registered", "cancelled"]),
    notes,
  }),
  passenger: z.object({ id, ...passengerSchema.shape }),
  passengerExtra: z.object({
    passenger_id: id,
    extra_id: id,
    quantity: z.coerce.number().int().min(0).max(50),
  }),
  attendance: z.object({
    passenger_id: id,
    status: z.enum(["reserved", "attended", "no_show", "cancelled"]),
  }),
  departure: z.object({
    id: optionalId,
    service_id: id,
    departure_date: date,
    vehicle_id: id,
    driver_id: optionalId,
    guide_id: optionalId,
    notes,
  }),
  assignment: z.object({ passenger_id: id, departure_id: optionalId }),
  connection: z.object({
    passenger_id: id,
    coordinator: z.enum([
      "unconfirmed",
      "peru_andes",
      "intermediary",
      "third_party",
    ]),
    responsible: z.string().max(150).default(""),
    provider_id: optionalId,
    transfer_point: z.string().max(250).default(""),
    transfer_time: z
      .union([z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), z.literal("")])
      .default(""),
    status: z.enum([
      "pending",
      "coordinated",
      "transferred",
      "completed",
      "incident",
    ]),
    notes,
  }),
  guideFunds: z.object({
    departure_id: id,
    guide_amount: amount,
    no_show_amount: z
      .union([amount, z.literal("")])
      .transform((v) => (v === "" ? null : v)),
    notes,
  }),
  removeLodging: z.object({ id }),
  lodging: z.object({
    passenger_id: id,
    night: date,
    place: name,
    room_type: z.enum(["shared", "single", "double", "triple"]),
    room_reference: z
      .string()
      .trim()
      .min(1, "Ingresa una referencia de habitación o grupo.")
      .max(100),
    notes,
  }),
  outsourcing: z.object({
    request_id: id,
    covers_transport: z.boolean().default(false),
    passenger_id: id,
    provider_id: id,
    concept: z.string().trim().min(3).max(250),
    amount,
    notes,
  }),
  movement: z
    .object({
      request_id: id,
      booking_id: optionalId,
      direction: z.enum(["receivable", "payable"]),
      intermediary_id: optionalId,
      provider_id: optionalId,
      kind: z.enum(["charge", "payment", "advance", "adjustment"]),
      amount: z.coerce
        .number()
        .finite()
        .min(-99999999)
        .max(99999999)
        .refine(
          (n) => n !== 0 && Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
          "Ingresa un importe distinto de cero con máximo dos decimales.",
        ),
      concept: z.string().trim().min(3).max(250),
      effective_date: date,
      reference: z.string().max(250).default(""),
    })
    .refine(
      (v) =>
        v.direction === "receivable"
          ? Boolean(v.intermediary_id) && !v.provider_id
          : Boolean(v.provider_id) && !v.intermediary_id,
      "Selecciona únicamente la contraparte correspondiente.",
    )
    .refine(
      (v) => v.kind !== "charge" || v.amount > 0,
      "Un cargo debe ser positivo.",
    ),
  application: z.object({
    credit_id: id,
    charge_id: id,
    amount: amount.refine((n) => n > 0, "Ingresa un importe positivo."),
    request_id: id,
  }),
  staff: z.object({
    id,
    active: z.boolean(),
    revoked_modules: z
      .array(
        z.enum([
          "dashboard",
          "intermediaries",
          "bookings",
          "operations",
          "connections",
          "providers",
          "finance",
          "settings",
        ]),
      )
      .max(8),
  }),
  createStaff: z.object({
    full_name: name,
    email: z.email(),
    password: z.string().min(12, "Usa al menos doce caracteres.").max(128),
  }),
};
export type ActionKind =
  keyof typeof actionSchemas | keyof typeof catalogSchemas;
