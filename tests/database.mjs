import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  bookingLinkPath,
  bookingTokenFromCode,
} from "../src/features/workspace/booking-link.ts";
for (const token of ["69b9ccf3988b8fb8e950bdab135d6fc6", "a".repeat(64)]) {
  const path = bookingLinkPath("Hôtel Sol / Andino", token);
  assert.ok(path.startsWith("/reservar/hotel-sol-andino/"));
  assert.equal(bookingTokenFromCode(path.split("/").at(-1)), token);
}
assert.equal(bookingTokenFromCode("corto"), null);
assert.equal(bookingTokenFromCode("A".repeat(21) + "B"), null);
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`,
);
for (const file of (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
}
const admin = randomUUID(),
  sales = randomUUID();
await db.query("insert into auth.users(id) values ($1),($2)", [admin, sales]);
await db.query(
  `insert into public.staff(id,full_name,role) values ($1,'Administrador','superadmin'),($2,'Vendedora','sales')`,
  [admin, sales],
);
async function user(id, role = "authenticated") {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
  await db.exec(`set role ${role}`);
}
async function rpc(name, args) {
  const keys = Object.keys(args);
  const result = await db.query(
    `select public.${name}(${keys.map((k, i) => `${k}=>$${i + 1}`).join(",")}) value`,
    Object.values(args),
  );
  return result.rows[0].value;
}
await user(admin);
const hotel = await rpc("save_catalog", {
  p_kind: "intermediaries",
  p_data: {
    name: "Hotel de prueba",
    kind: "hotel",
    contact: "Test",
    phone: "+51999999999",
  },
});
const snapshot = await rpc("workspace_data", { p_module: "settings" });
assert.ok(snapshot.services.length === 3);
const service = snapshot.services[0].id;
await rpc("save_tariff", {
  p_intermediary: hotel,
  p_service: service,
  p_amount: 60,
});
const token = "a".repeat(64);
const compactToken = "b".repeat(32);
const compactLink = await rpc("manage_link", {
  p_intermediary: hotel,
  p_token: compactToken,
});
await user("", "anon");
assert.equal(
  (await rpc("booking_context", { p_token: compactToken })).intermediary,
  "Hotel de prueba",
);
await user(admin);
await rpc("manage_link", {
  p_intermediary: hotel,
  p_token: "",
  p_revoke: compactLink,
});
await user("", "anon");
await assert.rejects(rpc("booking_context", { p_token: compactToken }));
await user(admin);
const link = await rpc("manage_link", {
  p_intermediary: hotel,
  p_token: token,
});
await user("", "anon");
assert.equal(
  (await rpc("booking_context", { p_token: token })).intermediary,
  "Hotel de prueba",
);
const request = randomUUID();
const booking = {
  request_id: request,
  service_id: service,
  departure_date: "2030-01-10",
  passengers: [
    {
      full_name: "Pasajero Uno",
      pickup: "Hotel de prueba",
      pickup_time: "05:30",
      extras: [{ extra_id: snapshot.extras[0].id, quantity: 1 }],
    },
    {
      full_name: "Pasajero Dos",
      pickup: "Hotel de prueba",
      puno: true,
      coordinator: "intermediary",
    },
  ],
};
const bid = await rpc("create_public_booking", {
  p_token: token,
  p_data: booking,
});
assert.equal(
  await rpc("create_public_booking", { p_token: token, p_data: booking }),
  bid,
);
await assert.rejects(
  () => db.query("select * from public.bookings"),
  /permission denied/,
);
await user(sales);
await assert.rejects(
  () => rpc("workspace_data", { p_module: "staff" }),
  /permiso/,
);
await assert.rejects(
  () => rpc("update_staff", { p_id: admin, p_active: false, p_revoked: [] }),
  /permiso/,
);
const reservations = await rpc("workspace_data", { p_module: "bookings" });
assert.equal(reservations.bookings.length, 1);
assert.equal(reservations.passengers.length, 2);
const pickupPassenger = reservations.passengers.find(
  (p) => p.full_name === "Pasajero Uno",
);
assert.equal(pickupPassenger.pickup_time, "05:30:00");
assert.equal(
  reservations.passengers.find((p) => p.full_name === "Pasajero Dos")
    .pickup_time,
  null,
);
await rpc("update_passenger", {
  p_id: pickupPassenger.id,
  p_data: { ...pickupPassenger, pickup_time: "06:15" },
});
assert.equal(
  (await rpc("workspace_data", { p_module: "operations" })).passengers.find(
    (p) => p.id === pickupPassenger.id,
  ).pickup_time,
  "06:15:00",
);
await assert.rejects(
  rpc("update_passenger", {
    p_id: pickupPassenger.id,
    p_data: { ...pickupPassenger, pickup_time: "24:00" },
  }),
);
await assert.rejects(
  rpc("create_public_booking", {
    p_token: token,
    p_data: {
      ...booking,
      request_id: randomUUID(),
      passengers: [
        { full_name: "Hora inválida", pickup: "Hotel", pickup_time: "25:99" },
      ],
    },
  }),
);
await rpc("update_passenger", {
  p_id: pickupPassenger.id,
  p_data: { ...pickupPassenger, pickup_time: "" },
});
assert.equal(
  (await rpc("workspace_data", { p_module: "bookings" })).passengers.find(
    (p) => p.id === pickupPassenger.id,
  ).pickup_time,
  null,
);
assert.equal(Number(reservations.bookings[0].tour_rate), 60);
await rpc("save_tariff", {
  p_intermediary: hotel,
  p_service: service,
  p_amount: 90,
});
assert.equal(
  Number(
    (await rpc("workspace_data", { p_module: "bookings" })).bookings[0]
      .tour_rate,
  ),
  60,
);
const finances = await rpc("workspace_data", { p_module: "finance" });
assert.equal(finances.ledger.length, 1);
assert.equal(Number(finances.ledger[0].amount), 120);
assert.ok(!("passenger_health" in finances));
const vehicle = await rpc("save_catalog", {
  p_kind: "vehicles",
  p_data: { name: "Van de prueba", plate: "TEST-01", capacity: 1 },
});
const departure = await rpc("save_departure", {
  p_data: {
    vehicle_id: vehicle,
    service_id: service,
    departure_date: "2030-01-10",
  },
});
await rpc("assign_passenger", {
  p_passenger: reservations.passengers[0].id,
  p_departure: departure,
});
await assert.rejects(
  () =>
    rpc("assign_passenger", {
      p_passenger: reservations.passengers[1].id,
      p_departure: departure,
    }),
  /sin cupos/,
);
await rpc("set_attendance", {
  p_passenger: reservations.passengers[0].id,
  p_status: "no_show",
});
assert.equal(
  (await rpc("workspace_data", { p_module: "finance" })).ledger.length,
  1,
);
const payment = await rpc("record_movement", {
  p_data: {
    direction: "receivable",
    intermediary_id: hotel,
    kind: "payment",
    amount: 40,
    concept: "Abono de prueba",
    effective_date: "2030-01-10",
    request_id: randomUUID(),
  },
});
await rpc("apply_credit", {
  p_credit: payment,
  p_charge: finances.ledger[0].id,
  p_amount: 40,
  p_request: randomUUID(),
});
await assert.rejects(
  () =>
    rpc("apply_credit", {
      p_credit: payment,
      p_charge: finances.ledger[0].id,
      p_amount: 1,
      p_request: randomUUID(),
    }),
  /supera/,
);
const balance = (
  await rpc("workspace_data", { p_module: "finance" })
).ledger.reduce((s, r) => s + Number(r.amount), 0);
assert.equal(balance, 80);
const provider = await rpc("save_catalog", {
  p_kind: "providers",
  p_data: { name: "Proveedor de prueba" },
});
await rpc("record_outsourcing", {
  p_data: {
    passenger_id: reservations.passengers[1].id,
    provider_id: provider,
    concept: "Servicio tercerizado",
    request_id: randomUUID(),
    amount: 41,
  },
});
const updated = await rpc("workspace_data", { p_module: "finance" });
assert.equal(
  updated.ledger
    .filter((r) => r.direction === "receivable")
    .reduce((s, r) => s + Number(r.amount), 0),
  80,
);
assert.equal(
  updated.ledger
    .filter((r) => r.direction === "payable")
    .reduce((s, r) => s + Number(r.amount), 0),
  41,
);
await user(admin);
await rpc("update_staff", {
  p_id: sales,
  p_active: true,
  p_revoked: ["finance"],
});
await user(sales);
await assert.rejects(
  () => rpc("workspace_data", { p_module: "finance" }),
  /permiso/,
);
assert.equal((await db.query("select * from public.ledger")).rows.length, 0);
await user(admin);
await rpc("manage_link", {
  p_intermediary: hotel,
  p_token: token,
  p_revoke: link,
});
await user("", "anon");
await assert.rejects(
  () =>
    rpc("create_public_booking", {
      p_token: token,
      p_data: { ...booking, request_id: randomUUID() },
    }),
  /revocado/,
);
await user(admin);
const invalid = {
  ...booking,
  intermediary_id: hotel,
  request_id: randomUUID(),
  passengers: [
    { full_name: "Persona válida", pickup: "Hotel" },
    { full_name: "X", pickup: "Hotel" },
  ],
};
await assert.rejects(() => rpc("create_internal_booking", { p_data: invalid }));
assert.equal(
  (await rpc("workspace_data", { p_module: "bookings" })).bookings.length,
  1,
);
// Precios de adicionales: una corrección de cantidad no cambia el precio original.
const extrasBefore = (await rpc("workspace_data", { p_module: "bookings" }))
  .passenger_extras;
const chosen = extrasBefore[0];
await rpc("save_catalog", {
  p_kind: "extras",
  p_data: { id: chosen.extra_id, name: "Adicional actualizado", amount: 99 },
});
await rpc("set_passenger_extra", {
  p_passenger: chosen.passenger_id,
  p_extra: chosen.extra_id,
  p_quantity: 2,
});
assert.equal(
  Number(
    (await rpc("workspace_data", { p_module: "bookings" })).passenger_extras[0]
      .unit_price,
  ),
  Number(chosen.unit_price),
);
// Un vehículo no puede reducirse por debajo de sus pasajeros asignados.
await assert.rejects(() =>
  rpc("save_catalog", {
    p_kind: "vehicles",
    p_data: { id: vehicle, name: "Van", plate: "TEST-01", capacity: 0 },
  }),
);
// Tarifas diferentes y adelantos disponibles con aplicación manual.
const hotel2 = await rpc("save_catalog", {
  p_kind: "intermediaries",
  p_data: { name: "Segundo hotel", kind: "hotel" },
});
await rpc("save_tariff", {
  p_intermediary: hotel2,
  p_service: service,
  p_amount: 50,
});
const second = await rpc("create_internal_booking", {
  p_data: {
    ...booking,
    intermediary_id: hotel2,
    request_id: randomUUID(),
    passengers: [{ full_name: "Tercer pasajero", pickup: "Segundo hotel" }],
  },
});
assert.equal(
  Number(
    (await rpc("workspace_data", { p_module: "bookings" })).bookings.find(
      (b) => b.id === second,
    ).tour_rate,
  ),
  50,
);
const advance = await rpc("record_movement", {
  p_data: {
    direction: "receivable",
    intermediary_id: hotel2,
    kind: "advance",
    amount: 500,
    concept: "Adelanto de prueba",
    effective_date: "2030-01-10",
    request_id: randomUUID(),
  },
});
const secondCharge = (
  await rpc("workspace_data", { p_module: "finance" })
).ledger.find((r) => r.booking_id === second);
await assert.rejects(
  () =>
    rpc("apply_credit", {
      p_credit: advance,
      p_charge: finances.ledger[0].id,
      p_amount: 1,
      p_request: randomUUID(),
    }),
  /incompatibles/,
);
await rpc("apply_credit", {
  p_credit: advance,
  p_charge: secondCharge.id,
  p_amount: 50,
  p_request: randomUUID(),
});
assert.equal(
  (await rpc("workspace_data", { p_module: "finance" })).applications
    .filter((a) => a.credit_id === advance)
    .reduce((n, a) => n + Number(a.amount), 0),
  50,
);
// Corrección autorizada conserva historial y registra solo la diferencia.
const correctionRequest = randomUUID();
await rpc("correct_booking", {
  p_id: second,
  p_service: service,
  p_rate: 55,
  p_date: "2030-01-10",
  p_reason: "Corrección acordada por ventas",
  p_request: correctionRequest,
});
await rpc("correct_booking", {
  p_id: second,
  p_service: service,
  p_rate: 55,
  p_date: "2030-01-10",
  p_reason: "Corrección acordada por ventas",
  p_request: correctionRequest,
});
assert.equal(
  (await rpc("workspace_data", { p_module: "bookings" })).booking_corrections
    .length,
  1,
);
assert.equal(
  Number(
    (await rpc("workspace_data", { p_module: "finance" })).ledger.find(
      (r) => r.request_id === correctionRequest,
    ).amount,
  ),
  5,
);
// Alojamiento conserva las noches de la reserva si luego cambia el catálogo.
const trek = snapshot.services.find((s) => s.nights === 1);
await rpc("save_tariff", {
  p_intermediary: hotel,
  p_service: trek.id,
  p_amount: 150,
});
const trekking = await rpc("create_internal_booking", {
  p_data: {
    ...booking,
    intermediary_id: hotel,
    service_id: trek.id,
    request_id: randomUUID(),
    passengers: [{ full_name: "Pasajero Trek", pickup: "Hotel" }],
  },
});
const trekPassenger = (
  await rpc("workspace_data", { p_module: "bookings" })
).passengers.find((p) => p.booking_id === trekking);
await rpc("save_catalog", {
  p_kind: "services",
  p_data: { ...trek, nights: 0 },
});
const lodging = await rpc("save_lodging", {
  p_data: {
    passenger_id: trekPassenger.id,
    night: "2030-01-10",
    place: "Oasis",
    room_type: "shared",
    room_reference: "Grupo A",
  },
});
await assert.rejects(
  () =>
    rpc("save_lodging", {
      p_data: {
        passenger_id: trekPassenger.id,
        night: "2030-01-12",
        place: "Oasis",
        room_type: "shared",
        room_reference: "Grupo A",
      },
    }),
  /noche/,
);
await rpc("remove_lodging", { p_id: lodging });
// Los importes de guías se registran, sin inventar una penalidad o deuda automática.
const guide = await rpc("save_catalog", {
  p_kind: "crew",
  p_data: { name: "Guía de prueba", kind: "guide" },
});
const guidedDeparture = await rpc("save_departure", {
  p_data: {
    vehicle_id: vehicle,
    service_id: service,
    departure_date: "2030-01-11",
    guide_id: guide,
  },
});
const ledgerCount = (await rpc("workspace_data", { p_module: "finance" }))
  .ledger.length;
await rpc("record_guide_funds", {
  p_data: {
    departure_id: guidedDeparture,
    guide_amount: 100,
    no_show_amount: null,
    notes: "Importe comunicado",
  },
});
assert.equal(
  (await rpc("workspace_data", { p_module: "finance" })).ledger.length,
  ledgerCount,
);
console.log(
  "OK: adicionales históricos, tarifas por hotel, adelantos manuales, correcciones idempotentes, noches históricas y control de guías.",
);

// Las tarifas actualizadas no se aceptan silenciosamente con una cotización anterior.
await assert.rejects(
  () =>
    rpc("create_internal_booking", {
      p_data: {
        ...booking,
        intermediary_id: hotel,
        request_id: randomUUID(),
        expected_rate: 1,
      },
    }),
  /tarifa cambió/,
);
// Reutilizar una solicitud con valores distintos no confirma un guardado inexistente.
await assert.rejects(
  async () =>
    rpc("create_internal_booking", {
      p_data: {
        ...booking,
        intermediary_id: hotel2,
        request_id: (
          await rpc("workspace_data", { p_module: "bookings" })
        ).bookings.find((b) => b.id === second).request_id,
        passengers: [{ full_name: "Otros datos", pickup: "Hotel" }],
      },
    }),
  /otros datos/,
);
const privateFinancial = await rpc("workspace_data", { p_module: "finance" });
assert.ok(privateFinancial.bookings.every((b) => !("notes" in b)));
assert.ok(
  privateFinancial.financial_passengers.every(
    (p) => !("allergies" in p) && !("phone" in p),
  ),
);
const changedDeparture = await rpc("save_departure", {
  p_data: {
    id: guidedDeparture,
    vehicle_id: vehicle,
    service_id: service,
    departure_date: "2030-01-11",
    guide_id: guide,
    notes: "Salida actualizada",
  },
});
assert.equal(changedDeparture, guidedDeparture);
console.log(
  "OK: cotizaciones verificadas, reintentos consistentes, datos mínimos de finanzas y salidas editables.",
);
await db.close();
console.log(
  "OK: migración, reservas atómicas, tarifas históricas, RLS, revocación, cupos, NO SHOW, pagos y endosos independientes.",
);
