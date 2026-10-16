"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DataTable, type TableRow } from "@/components/ui/data-table";
import {
  RecordForm,
  type Field,
  type Option,
} from "@/components/ui/record-form";
import { BookingForm } from "./booking-form";
import { bookingLinkPath } from "./booking-link";
import { moduleGuidance, tabGuidance } from "./experience";
import { LoadingButton } from "@/components/ui/loading";
import { TableAction, TableActionLink } from "@/components/ui/table-action";
import { BookingCalendar } from "./booking-calendar";
import { LiquidationScreen } from "./liquidation-screen";
import { performAction } from "./actions";
import {
  modules,
  labels,
  text,
  number,
  money,
  today,
  dateInLima,
  timeInLima,
  type Row,
  type Snapshot,
  type ModuleId,
} from "./model";
import type { ActionKind } from "./schemas";

type Editor = {
  title: string;
  kind: ActionKind | "newBooking";
  fields: Field[];
  initial?: Row;
};
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  options?: Option[],
  required = false,
): Field => ({ key, label, type, options, required });
const choices = (...values: string[]): Option[] =>
  values.map((value) => ({ value, label: labels[value] ?? value }));
const activeField = f("active", "Registro activo", "checkbox");
const notesField = { ...f("notes", "Observaciones", "textarea"), wide: true };

function EditorDialog({
  editor,
  close,
  children,
}: {
  editor: Editor;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!previousFocus.current && document.activeElement instanceof HTMLElement)
      previousFocus.current = document.activeElement;
    const previous = previousFocus.current;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`editor-dialog ${editor.kind === "newBooking" ? "large-dialog" : ""}`}
      aria-labelledby="editor-title"
      onClose={close}
    >
      <header className="dialog-heading">
        <div>
          <span className="eyebrow">PERÚ ANDES</span>
          <h2 id="editor-title">{editor.title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Cerrar formulario"
          onClick={close}
        >
          ×
        </button>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon?: string;
}) {
  return (
    <div
      className="inline-metric"
      title={hint}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 9,
        fontSize: 12,
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ModuleScreen({
  module,
  data,
  ready,
  setupReason,
}: {
  module: ModuleId;
  data: Snapshot;
  ready: boolean;
  setupReason: string;
}) {
  const config = modules.find((m) => m.id === module)!;
  const [tab, setTab] = useState("");
  const [passengerDate, setPassengerDate] = useState(today());
  const [calendarOpen, setCalendarOpen] = useState(true);
  function changePassengerDay(delta: number) {
    const date = new Date(`${passengerDate}T12:00:00`);
    date.setDate(date.getDate() + delta);
    setPassengerDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    );
    setCalendarOpen(false);
  }

  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<Row | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [removingLodging, setRemovingLodging] = useState("");
  const [copyingLink, setCopyingLink] = useState("");
  const [dateFilter, setDateFilter] = useState(today());
  const [serviceFilter, setServiceFilter] = useState("");
  const [intermediaryFilter, setIntermediaryFilter] = useState("");
  const [includeHealth, setIncludeHealth] = useState(false);
  const list = (key: string) => data[key] ?? [];
  const options = (key: string, label = "name"): Option[] =>
    list(key)
      .filter((r) => r.active !== false)
      .map((r) => ({ value: text(r, "id"), label: text(r, label) }));
  const intermediaryOptions = options("intermediary_options"),
    serviceOptions = options("service_options"),
    providerOptions = options("provider_options");
  const allIntermediaries = list("intermediary_options").map((r) => ({
    value: text(r, "id"),
    label: text(r, "name") + (r.active === false ? " · Inactivo" : ""),
  }));
  const allProviders = list("provider_options").map((r) => ({
    value: text(r, "id"),
    label: text(r, "name") + (r.active === false ? " · Inactivo" : ""),
  }));
  const lookup = (key: string, id: string, label = "name") =>
    text(list(key).find((r) => text(r, "id") === id) ?? {}, label);
  const serviceName = (id: string) => lookup("service_options", id);
  const intermediaryName = (id: string) => lookup("intermediary_options", id);
  const providerName = (id: string) => lookup("provider_options", id);
  const bookingById = (id: string) =>
    list("bookings").find((b) => text(b, "id") === id) ?? {};
  const passengerName = (id: string) => lookup("passengers", id, "full_name");
  const bookingOptions = list("passengers").map((p) => {
    const b = bookingById(text(p, "booking_id"));
    return {
      value: text(p, "id"),
      label: `${text(p, "full_name")} · ${text(b, "departure_date")} · ${serviceName(text(b, "service_id"))}`,
    };
  });
  const bookingMatches = (b: Row) =>
    (!dateFilter || text(b, "departure_date") === dateFilter) &&
    (!serviceFilter || text(b, "service_id") === serviceFilter) &&
    (!intermediaryFilter || text(b, "intermediary_id") === intermediaryFilter);
  const matchingBookings = list("bookings").filter(bookingMatches);
  const filteredPassengers = list("passengers").filter((p) =>
    matchingBookings.some((b) => text(b, "id") === text(p, "booking_id")),
  );
  const open = (
    title: string,
    kind: Editor["kind"],
    fields: Field[],
    initial?: Row,
  ) => setEditor({ title, kind, fields, initial });
  const edit = (
    title: string,
    kind: ActionKind,
    fields: Field[],
    initial: Row,
  ) => (
    <TableAction
      icon="edit"
      label={title}
      onClick={() => open(title, kind, fields, initial)}
    >
      Editar
    </TableAction>
  );
  const intermediaryFields = [
    f("name", "Nombre comercial", "text", undefined, true),
    f("kind", "Tipo", "select", choices("hotel", "agency"), true),
    f("contact", "Contacto principal"),
    f("phone", "Teléfono"),
    {
      ...activeField,
      label: "Habilitado para recibir reservas",
      hint: "Al desactivarlo se bloquean nuevas reservas y su enlace. El historial y los saldos se conservan.",
    },
  ];
  const providerFields = [
    f("name", "Nombre comercial", "text", undefined, true),
    f("contact", "Contacto principal"),
    f("phone", "Teléfono"),
    activeField,
  ];
  const vehicleFields = [
    f("name", "Nombre de la movilidad", "text", undefined, true),
    f("plate", "Placa", "text", undefined, true),
    f("capacity", "Capacidad de pasajeros", "number", undefined, true),
    activeField,
  ];
  const crewFields = [
    f("name", "Nombre completo", "text", undefined, true),
    f("kind", "Función", "select", choices("driver", "guide"), true),
    f("phone", "Teléfono"),
    activeField,
  ];
  const departureFields = [
    f("service_id", "Servicio", "select", serviceOptions, true),
    f("departure_date", "Fecha de salida", "date", undefined, true),
    f("vehicle_id", "Movilidad", "select", options("vehicles"), true),
    f(
      "driver_id",
      "Conductor",
      "select",
      list("crew")
        .filter((c) => text(c, "kind") === "driver" && c.active !== false)
        .map((c) => ({ value: text(c, "id"), label: text(c, "name") })),
    ),
    f(
      "guide_id",
      "Guía",
      "select",
      list("crew")
        .filter((c) => text(c, "kind") === "guide" && c.active !== false)
        .map((c) => ({ value: text(c, "id"), label: text(c, "name") })),
    ),
    notesField,
  ];
  const connectionFields = [
    f("passenger_id", "Pasajero", "select", bookingOptions, true),
    f(
      "coordinator",
      "Coordinación a cargo de",
      "select",
      choices("unconfirmed", "peru_andes", "intermediary", "third_party"),
      true,
    ),
    f("responsible", "Persona responsable"),
    f("provider_id", "Proveedor encargado", "select", providerOptions),
    f("transfer_point", "Punto de transferencia"),
    f("transfer_time", "Hora acordada", "time"),
    f(
      "status",
      "Estado operativo",
      "select",
      choices("pending", "coordinated", "transferred", "completed", "incident"),
      true,
    ),
    notesField,
  ];
  const lodgingFields = [
    f("passenger_id", "Pasajero", "select", bookingOptions, true),
    f("night", "Noche de alojamiento", "date", undefined, true),
    f("place", "Lugar / establecimiento", "text", undefined, true),
    f(
      "room_type",
      "Tipo de habitación",
      "select",
      choices("shared", "single", "double", "triple"),
      true,
    ),
    {
      ...f(
        "room_reference",
        "Referencia de habitación / grupo",
        "text",
        undefined,
        true,
      ),
      hint: "Usa la misma referencia para quienes comparten una habitación en la misma noche.",
    },
    notesField,
  ];
  const passengerFields = [
    f("full_name", "Nombre completo", "text", undefined, true),
    f("phone", "Teléfono"),
    f("pickup", "Hotel o lugar de recojo", "text", undefined, true),
    {
      ...f("pickup_time", "Hora de recojo", "time"),
      hint: "Déjala vacía si aún está por coordinar.",
    },
    notesField,
  ];
  const movementFields = [
    f(
      "direction",
      "¿Qué cuenta deseas registrar?",
      "select",
      [
        { value: "receivable", label: "Cobro a un endosador" },
        { value: "payable", label: "Pago a un proveedor" },
      ],
      true,
    ),
    f("intermediary_id", "Endosador", "select", allIntermediaries),
    f("provider_id", "Proveedor", "select", allProviders),
    f(
      "kind",
      "¿Qué deseas registrar?",
      "select",
      [
        { value: "payment", label: "Pago / abono" },
        { value: "advance", label: "Adelanto" },
        { value: "charge", label: "Cargo adicional" },
        { value: "adjustment", label: "Corrección de importe" },
      ],
      true,
    ),
    {
      ...f("amount", "Importe en soles", "number", undefined, true),
      hint: "Pagos y adelantos se registran como abonos. En ajustes, usa el signo correspondiente.",
    },
    f("effective_date", "Fecha del pago o cargo", "date", undefined, true),
    f("concept", "Motivo", "text", undefined, true),
    f("reference", "Referencia del pago o comprobante"),
    f(
      "booking_id",
      "Reserva relacionada (opcional)",
      "select",
      list("bookings").map((b) => ({
        value: text(b, "id"),
        label: `PA-${text(b, "code").padStart(5, "0")} · ${intermediaryName(text(b, "intermediary_id"))}`,
      })),
    ),
  ];
  const serviceFields = [
    f("name", "Nombre del servicio", "text", undefined, true),
    f("code", "Código", "text", undefined, true),
    f("days", "Días de duración", "number", undefined, true),
    f("nights", "Noches", "number", undefined, true),
    activeField,
  ];
  const extraFields = [
    f("name", "Concepto adicional", "text", undefined, true),
    f("amount", "Precio en soles", "number", undefined, true),
    activeField,
  ];
  const staffFields = [
    activeField,
    {
      ...f(
        "revoked_modules",
        "Módulos autorizados",
        "permissions",
        modules
          .filter((m) => m.id !== "staff")
          .map((m) => ({ value: m.id, label: m.name })),
      ),
      wide: true,
    },
  ];
  async function revokeLink(row: Row) {
    if (revoking) return;
    setRevoking(true);
    try {
      const result = await performAction("link", {
        intermediary_id: row.intermediary_id,
        revoke_id: row.id,
      });
      setNoticeError(!result.ok);
      setNotice(result.message);
      setPendingRevoke(null);
    } catch {
      setNoticeError(true);
      setNotice(
        "No se pudo revocar el enlace. Comprueba tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setRevoking(false);
    }
  }
  async function copyLink(row: Row) {
    if (copyingLink) return;
    setCopyingLink(text(row, "id"));
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${bookingLinkPath(intermediaryName(text(row, "intermediary_id")), text(row, "token"))}`,
      );
      setNotice("Enlace copiado. Compártelo únicamente con su endosador.");
      setNoticeError(false);
    } catch {
      setNoticeError(true);
      setNotice(
        "No se pudo copiar el enlace. Puedes abrir el formulario y copiar su dirección.",
      );
    } finally {
      setCopyingLink("");
    }
  }
  let tabs: { id: string; name: string }[] = [];
  if (module === "intermediaries")
    tabs = [
      { id: "directory", name: "Directorio" },
      { id: "tariffs", name: "Tarifas" },
      { id: "links", name: "Enlaces de reservas" },
      { id: "history", name: "Historial de reservas" },
    ];
  if (module === "bookings")
    tabs = [
      { id: "bookings", name: "Reservas" },
      { id: "corrections", name: "Correcciones comerciales" },
    ];
  if (module === "operations")
    tabs = [
      { id: "manifest", name: "Manifiesto diario" },
      { id: "departures", name: "Salidas" },
      { id: "vehicles", name: "Movilidades" },
      { id: "crew", name: "Guías y conductores" },
      { id: "lodgings", name: "Alojamientos" },
      { id: "guideFunds", name: "Importes para guías" },
    ];
  if (module === "providers")
    tabs = [
      { id: "providers", name: "Directorio" },
      { id: "outsourcings", name: "Endosos salientes" },
    ];
  if (module === "staff")
    tabs = [
      { id: "staff", name: "Equipo y permisos" },
      { id: "audit", name: "Historial de cambios" },
    ];
  if (module === "settings")
    tabs = [
      { id: "services", name: "Servicios turísticos" },
      { id: "extras", name: "Adicionales" },
    ];
  const selected = tab || tabs[0]?.id || module;
  let primaryLabel = "";
  let primary: () => void = () => {};
  if (module === "intermediaries") {
    primaryLabel =
      selected === "tariffs"
        ? "Nueva tarifa"
        : selected === "links"
          ? "Crear enlace"
          : "Nuevo endosador";
    primary = () =>
      selected === "tariffs"
        ? open("Tarifa personalizada", "tariff", [
            f(
              "intermediary_id",
              "Endosador",
              "select",
              intermediaryOptions,
              true,
            ),
            f(
              "service_id",
              "Servicio turístico",
              "select",
              serviceOptions,
              true,
            ),
            f(
              "amount",
              "Tarifa acordada por pasajero",
              "number",
              undefined,
              true,
            ),
          ])
        : selected === "links"
          ? open("Crear enlace exclusivo", "link", [
              f(
                "intermediary_id",
                "Endosador",
                "select",
                intermediaryOptions,
                true,
              ),
            ])
          : open("Nuevo endosador", "intermediaries", intermediaryFields, {
              kind: "hotel",
            });
  }
  if (module === "bookings") {
    primaryLabel = "Nueva reserva";
    primary = () =>
      open("Registrar reserva", "newBooking", [], {
        departure_date: passengerDate,
      });
  }
  if (module === "operations") {
    primaryLabel =
      selected === "vehicles"
        ? "Nueva movilidad"
        : selected === "crew"
          ? "Nuevo integrante"
          : selected === "lodgings"
            ? "Asignar alojamiento"
            : selected === "guideFunds"
              ? "Registrar importes"
              : "Programar salida";
    primary = () =>
      selected === "vehicles"
        ? open("Nueva movilidad", "vehicles", vehicleFields)
        : selected === "crew"
          ? open("Guía o conductor", "crew", crewFields, { kind: "guide" })
          : selected === "lodgings"
            ? open("Organizar alojamiento", "lodging", lodgingFields)
            : selected === "guideFunds"
              ? open(
                  "Importes reportados para el guía",
                  "guideFunds",
                  [
                    f(
                      "departure_id",
                      "Salida con guía",
                      "select",
                      list("departures")
                        .filter((d) => Boolean(d.guide_id))
                        .map((d) => ({
                          value: text(d, "id"),
                          label: `${text(d, "departure_date")} · ${serviceName(text(d, "service_id"))} · ${lookup("crew", text(d, "guide_id"))}`,
                        })),
                      true,
                    ),
                    f(
                      "guide_amount",
                      "Monto reportado para guía (soles)",
                      "number",
                      undefined,
                      true,
                    ),
                    f(
                      "no_show_amount",
                      "Monto comunicado por NO SHOW (soles)",
                      "number",
                    ),
                    notesField,
                  ],
                  { no_show_amount: "" },
                )
              : open("Programar salida", "departure", departureFields, {
                  departure_date: dateFilter || today(),
                });
  }
  if (module === "connections") {
    primaryLabel = "Coordinar conexión";
    primary = () =>
      open("Conexión a Puno", "connection", connectionFields, {
        status: "pending",
        coordinator: "unconfirmed",
      });
  }
  if (module === "providers") {
    primaryLabel =
      selected === "outsourcings" ? "Registrar endoso" : "Nuevo proveedor";
    primary = () =>
      selected === "outsourcings"
        ? open(
            "Endoso saliente",
            "outsourcing",
            [
              f("passenger_id", "Pasajero", "select", bookingOptions, true),
              f("provider_id", "Proveedor", "select", providerOptions, true),
              f("concept", "Servicio tercerizado", "text", undefined, true),
              f(
                "amount",
                "Importe acordado en soles",
                "number",
                undefined,
                true,
              ),
              f(
                "covers_transport",
                "Este servicio cubre la movilidad del tour",
                "checkbox",
              ),
              notesField,
            ],
            { covers_transport: false },
          )
        : open("Nuevo proveedor", "providers", providerFields);
  }
  if (module === "settings") {
    primaryLabel = selected === "extras" ? "Nuevo adicional" : "Nuevo servicio";
    primary = () =>
      selected === "extras"
        ? open("Servicio adicional", "extras", extraFields)
        : open("Servicio turístico", "services", serviceFields, {
            days: 1,
            nights: 0,
          });
  }
  if (module === "staff") {
    primaryLabel = "Crear vendedora";
    primary = () =>
      open("Nueva cuenta de ventas", "createStaff", [
        f("full_name", "Nombre completo", "text", undefined, true),
        f("email", "Correo electrónico", "email", undefined, true),
        {
          ...f("password", "Contraseña inicial", "password", undefined, true),
          hint: "Mínimo doce caracteres. Entrega las credenciales por un canal privado.",
        },
      ]);
  }

  const ledger = list("ledger");
  const sum = (rows: Row[]) =>
    rows.reduce((s, r) => s + Math.round(number(r, "amount") * 100), 0) / 100;
  const pending = (side: string) => {
    const groups = new Map<string, number>();
    for (const r of ledger.filter((r) => text(r, "direction") === side)) {
      const key = text(
        r,
        side === "receivable" ? "intermediary_id" : "provider_id",
      );
      groups.set(
        key,
        (groups.get(key) ?? 0) + Math.round(number(r, "amount") * 100),
      );
    }
    return [...groups.values()].reduce((s, n) => s + Math.max(0, n), 0) / 100;
  };
  const accountName = (r: Row) =>
    text(r, "direction") === "receivable"
      ? intermediaryName(text(r, "intermediary_id"))
      : providerName(text(r, "provider_id"));
  const applied = (id: string, field: "charge_id" | "credit_id") =>
    list("applications")
      .filter((a) => text(a, field) === id)
      .reduce((s, a) => s + number(a, "amount"), 0);
  const ledgerLabel = (r: Row) =>
    `${accountName(r)} · ${labels[text(r, "kind")]} · ${text(r, "concept")} · ${money(Math.abs(number(r, "amount")))}`;
  const filters = (
    <div className="filter-panel no-print">
      <div className="form-field">
        <label htmlFor="filter-date">Fecha de salida</label>
        <input
          id="filter-date"
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor="filter-service">Servicio</label>
        <select
          id="filter-service"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        >
          <option value="">Todos los servicios</option>
          {serviceOptions.map((o) => (
            <option value={o.value} key={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="filter-intermediary">Endosador</label>
        <select
          id="filter-intermediary"
          value={intermediaryFilter}
          onChange={(e) => setIntermediaryFilter(e.target.value)}
        >
          <option value="">Todos los endosadores</option>
          {intermediaryOptions.map((o) => (
            <option value={o.value} key={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        className="btn"
        onClick={() => {
          setDateFilter("");
          setServiceFilter("");
          setIntermediaryFilter("");
        }}
      >
        Limpiar filtros
      </button>
    </div>
  );
  let headers: string[] = [];
  let rows: TableRow[] = [];
  if (module === "intermediaries" && selected === "directory") {
    headers = ["Nombre comercial", "Tipo", "Contacto", "Teléfono", "Estado"];
    rows = list("intermediaries").map((r) => ({
      id: text(r, "id"),
      cells: [
        text(r, "name"),
        labels[text(r, "kind")],
        text(r, "contact"),
        text(r, "phone"),
        r.active ? "Activo" : "Inactivo",
      ],
      action: (
        <>
          {edit("Editar endosador", "intermediaries", intermediaryFields, r)}
          <TableAction
            icon="history"
            onClick={() => {
              setIntermediaryFilter(text(r, "id"));
              setDateFilter("");
              setTab("history");
            }}
          >
            Reservas
          </TableAction>
        </>
      ),
    }));
  }
  if (module === "intermediaries" && selected === "tariffs") {
    headers = [
      "Endosador",
      "Servicio",
      "Tarifa por pasajero",
      "Versión",
      "Registrada el",
    ];
    rows = list("tariffs")
      .sort((a, b) => number(b, "version") - number(a, "version"))
      .map((r) => ({
        id: text(r, "id"),
        cells: [
          intermediaryName(text(r, "intermediary_id")),
          serviceName(text(r, "service_id")),
          money(number(r, "amount")),
          number(r, "version"),
          dateInLima(text(r, "created_at")),
        ],
      }));
  }
  if (module === "intermediaries" && selected === "links") {
    headers = ["Endosador", "Creado el", "Estado"];
    rows = list("booking_links").map((r) => ({
      id: text(r, "id"),
      cells: [
        intermediaryName(text(r, "intermediary_id")),
        dateInLima(text(r, "created_at")),
        r.active ? "Activo" : "Revocado",
      ],
      action: r.active ? (
        <>
          <TableAction
            icon="copy"
            type="button"
            pending={copyingLink === text(r, "id")}
            disabled={Boolean(copyingLink)}
            pendingLabel="Copiando…"
            onClick={() => copyLink(r)}
          >
            Copiar enlace
          </TableAction>
          <TableActionLink
            icon="external"
            target="_blank"
            rel="noreferrer"
            href={bookingLinkPath(
              intermediaryName(text(r, "intermediary_id")),
              text(r, "token"),
            )}
          >
            Ver formulario
          </TableActionLink>
          <TableAction
            icon="revoke"
            className="danger"
            onClick={() => setPendingRevoke(r)}
          >
            Revocar
          </TableAction>
        </>
      ) : undefined,
    }));
  }
  if (
    (module === "bookings" && selected === "bookings") ||
    (module === "intermediaries" && selected === "history")
  ) {
    headers = [
      "Reserva",
      "Salida",
      "Servicio",
      "Endosador",
      "Pasajeros",
      "Tarifa histórica",
      "Estado",
      "Observaciones",
    ];
    rows = matchingBookings.map((b) => ({
      id: text(b, "id"),
      cells: [
        `PA-${text(b, "code").padStart(5, "0")}`,
        text(b, "departure_date"),
        serviceName(text(b, "service_id")),
        intermediaryName(text(b, "intermediary_id")),
        list("passengers").filter(
          (p) => text(p, "booking_id") === text(b, "id"),
        ).length,
        money(number(b, "tour_rate")),
        labels[text(b, "status")],
        text(b, "notes"),
      ],
      action:
        module === "bookings" ? (
          <>
            {edit(
              "Gestionar reserva",
              "bookingUpdate",
              [
                f("departure_date", "Fecha de salida", "date", undefined, true),
                f(
                  "status",
                  "Situación comercial",
                  "select",
                  choices("registered", "cancelled"),
                  true,
                ),
                notesField,
              ],
              b,
            )}
            <TableAction
              icon="finance"
              onClick={() =>
                open(
                  "Corrección comercial explícita",
                  "correction",
                  [
                    f(
                      "service_id",
                      "Servicio corregido",
                      "select",
                      serviceOptions,
                      true,
                    ),
                    f(
                      "departure_date",
                      "Fecha de salida",
                      "date",
                      undefined,
                      true,
                    ),
                    {
                      ...f(
                        "amount",
                        "Tarifa autorizada por pasajero (soles)",
                        "number",
                        undefined,
                        true,
                      ),
                      hint: "La diferencia respecto de la tarifa anterior genera un ajuste trazable. Requiere permisos de Reservas y Liquidación.",
                    },
                    f("reason", "Motivo del ajuste", "text", undefined, true),
                  ],
                  {
                    id: b.id,
                    service_id: b.service_id,
                    departure_date: b.departure_date,
                    amount: b.tour_rate,
                  },
                )
              }
            >
              Corregir tarifa / servicio
            </TableAction>
          </>
        ) : undefined,
    }));
  }
  if (module === "bookings" && selected === "corrections") {
    headers = [
      "Reserva",
      "Fecha",
      "Tarifa anterior",
      "Tarifa corregida",
      "Motivo",
    ];
    rows = list("booking_corrections").map((r) => {
      const before =
        typeof r.before_data === "object" && r.before_data !== null
          ? (r.before_data as Row)
          : {};
      const after =
        typeof r.after_data === "object" && r.after_data !== null
          ? (r.after_data as Row)
          : {};
      return {
        id: text(r, "id"),
        cells: [
          `PA-${text(bookingById(text(r, "booking_id")), "code").padStart(5, "0")}`,
          dateInLima(text(r, "created_at")),
          money(number(before, "tour_rate")),
          money(number(after, "tour_rate")),
          text(r, "reason"),
        ],
      };
    });
  }
  if (module === "bookings" && selected === "bookings") {
    headers = [
      "Pasajero",
      "Salida",
      "Servicio",
      "Endosador",
      "Teléfono",
      "Recojo",
      "Hora de recojo",
      "Adicionales",
      "Asistencia",
      "Observaciones",
    ];
    rows = list("passengers")
      .filter((p) => {
        const b = bookingById(text(p, "booking_id"));
        return (
          text(b, "departure_date") === passengerDate &&
          text(b, "status") !== "cancelled" &&
          text(p, "attendance") !== "cancelled" &&
          (!serviceFilter || text(b, "service_id") === serviceFilter) &&
          (!intermediaryFilter ||
            text(b, "intermediary_id") === intermediaryFilter)
        );
      })
      .sort((a, b) =>
        (text(a, "pickup_time") || "99:99").localeCompare(
          text(b, "pickup_time") || "99:99",
        ),
      )
      .map((p) => {
        const b = bookingById(text(p, "booking_id"));
        const health =
          list("passenger_health").find(
            (h) => text(h, "passenger_id") === text(p, "id"),
          ) ?? {};
        return {
          id: text(p, "id"),
          cells: [
            text(p, "full_name"),
            text(b, "departure_date"),
            serviceName(text(b, "service_id")),
            intermediaryName(text(b, "intermediary_id")),
            text(p, "phone"),
            text(p, "pickup"),
            text(p, "pickup_time").slice(0, 5) || "Por coordinar",
            list("passenger_extras")
              .filter((e) => text(e, "passenger_id") === text(p, "id"))
              .map(
                (e) =>
                  `${text(e, "quantity")} × ${text(e, "name")} (subtotal ${money(number(e, "unit_price") * number(e, "quantity"))})`,
              )
              .join("; "),
            labels[text(p, "attendance")],
            text(p, "notes"),
          ],
          action: (
            <>
              {edit(
                "Corregir datos del pasajero",
                "passenger",
                passengerFields,
                {
                  ...p,
                  ...health,
                  pickup_time: text(p, "pickup_time").slice(0, 5),
                  id: p.id,
                },
              )}
              <TableAction
                icon="extras"
                onClick={() =>
                  open(
                    "Adicionales del pasajero",
                    "passengerExtra",
                    [
                      f(
                        "extra_id",
                        "Concepto adicional",
                        "select",
                        list("extra_options").map((e) => ({
                          value: text(e, "id"),
                          label: text(e, "name"),
                        })),
                        true,
                      ),
                      {
                        ...f("quantity", "Cantidad", "number", undefined, true),
                        hint: "Usa cero para retirar el concepto. Al cambiar la cantidad se conserva el precio histórico.",
                      },
                    ],
                    { passenger_id: p.id, quantity: 1 },
                  )
                }
              >
                Adicionales
              </TableAction>
            </>
          ),
        };
      });
  }
  if (module === "operations" && selected === "vehicles") {
    headers = ["Movilidad", "Placa", "Capacidad", "Estado"];
    rows = list("vehicles").map((r) => ({
      id: text(r, "id"),
      cells: [
        text(r, "name"),
        text(r, "plate"),
        number(r, "capacity"),
        r.active ? "Activa" : "Inactiva",
      ],
      action: edit("Editar movilidad", "vehicles", vehicleFields, r),
    }));
  }
  if (module === "operations" && selected === "crew") {
    headers = ["Nombre", "Función", "Teléfono", "Estado"];
    rows = list("crew").map((r) => ({
      id: text(r, "id"),
      cells: [
        text(r, "name"),
        labels[text(r, "kind")],
        text(r, "phone"),
        r.active ? "Activo" : "Inactivo",
      ],
      action: edit("Editar integrante", "crew", crewFields, r),
    }));
  }
  if (module === "operations" && selected === "departures") {
    headers = [
      "Salida",
      "Servicio",
      "Movilidad",
      "Conductor",
      "Guía",
      "Asignados",
      "Cupos disponibles",
    ];
    rows = list("departures")
      .filter((d) => !dateFilter || text(d, "departure_date") === dateFilter)
      .map((d) => {
        const v =
          list("vehicles").find(
            (v) => text(v, "id") === text(d, "vehicle_id"),
          ) ?? {};
        const assigned = list("assignments").filter(
          (a) =>
            text(a, "departure_id") === text(d, "id") &&
            list("passengers").some(
              (p) =>
                text(p, "id") === text(a, "passenger_id") &&
                text(p, "attendance") !== "cancelled" &&
                text(bookingById(text(p, "booking_id")), "status") !==
                  "cancelled",
            ),
        ).length;
        return {
          id: text(d, "id"),
          cells: [
            text(d, "departure_date"),
            serviceName(text(d, "service_id")),
            text(v, "plate"),
            lookup("crew", text(d, "driver_id")),
            lookup("crew", text(d, "guide_id")),
            assigned,
            Math.max(0, number(v, "capacity") - assigned),
          ],
          action: edit("Editar salida", "departure", departureFields, d),
        };
      });
  }
  if (module === "operations" && selected === "manifest") {
    headers = [
      "Salida",
      "Pasajero",
      "Servicio",
      "Endosador",
      "Teléfono",
      "Recojo",
      "Hora de recojo",
      "Movilidad",
      "Conductor",
      "Guía",
      "Adicionales",
      "Puno",
      "Servicios externos",
      "Asistencia",
      "Observaciones",
    ];
    if (includeHealth)
      headers.push("Alimentación", "Alergias", "Medicación comunicada");
    rows = filteredPassengers
      .filter(
        (p) =>
          text(p, "attendance") !== "cancelled" &&
          text(bookingById(text(p, "booking_id")), "status") !== "cancelled",
      )
      .map((p) => {
        const b = bookingById(text(p, "booking_id"));
        const a = list("assignments").find(
          (a) => text(a, "passenger_id") === text(p, "id"),
        );
        const d =
          list("departures").find(
            (d) => text(d, "id") === text(a ?? {}, "departure_id"),
          ) ?? {};
        const c = list("connections").find(
          (c) => text(c, "passenger_id") === text(p, "id"),
        );
        const health =
          list("passenger_health").find(
            (h) => text(h, "passenger_id") === text(p, "id"),
          ) ?? {};
        const cells = [
          text(b, "departure_date"),
          text(p, "full_name"),
          serviceName(text(b, "service_id")),
          intermediaryName(text(b, "intermediary_id")),
          text(p, "phone"),
          text(p, "pickup"),
          text(p, "pickup_time").slice(0, 5) || "Por coordinar",
          lookup("vehicles", text(d, "vehicle_id"), "plate") || "Sin asignar",
          lookup("crew", text(d, "driver_id")),
          lookup("crew", text(d, "guide_id")),
          list("passenger_extras")
            .filter((e) => text(e, "passenger_id") === text(p, "id"))
            .map((e) => `${text(e, "quantity")} × ${text(e, "name")}`)
            .join("; "),
          c
            ? `${labels[text(c, "status")]} · ${text(c, "responsible") || "Responsable por confirmar"}`
            : "No",
          list("operational_outsourcings")
            .filter((o) => text(o, "passenger_id") === text(p, "id"))
            .map((o) => providerName(text(o, "provider_id")))
            .join("; "),
          text(b, "status") === "cancelled"
            ? "Reserva cancelada"
            : labels[text(p, "attendance")],
          text(p, "notes"),
        ];
        if (includeHealth)
          cells.push(
            text(p, "dietary"),
            text(health, "allergies"),
            text(health, "medication"),
          );
        return {
          id: text(p, "id"),
          cells,
          action: (
            <>
              <TableAction
                icon="vehicle"
                onClick={() =>
                  open(
                    "Asignar movilidad",
                    "assignment",
                    [
                      f(
                        "departure_id",
                        "Salida programada",
                        "select",
                        list("departures")
                          .filter(
                            (d) =>
                              text(d, "service_id") === text(b, "service_id") &&
                              text(d, "departure_date") ===
                                text(b, "departure_date"),
                          )
                          .map((d) => ({
                            value: text(d, "id"),
                            label: `${text(d, "departure_date")} · ${lookup("vehicles", text(d, "vehicle_id"), "plate")}`,
                          })),
                      ),
                    ],
                    { passenger_id: p.id, departure_id: a?.departure_id ?? "" },
                  )
                }
              >
                Asignar
              </TableAction>
              <TableAction
                icon="attendance"
                onClick={() =>
                  open(
                    "Registrar asistencia",
                    "attendance",
                    [
                      f(
                        "status",
                        "Asistencia",
                        "select",
                        choices("reserved", "attended", "no_show", "cancelled"),
                        true,
                      ),
                    ],
                    { passenger_id: p.id, status: p.attendance },
                  )
                }
              >
                Asistencia
              </TableAction>
            </>
          ),
        };
      });
  }
  if (module === "operations" && selected === "guideFunds") {
    headers = [
      "Salida",
      "Servicio",
      "Guía",
      "Monto reportado",
      "Monto NO SHOW comunicado",
      "Observaciones",
    ];
    rows = list("guide_funds").map((r) => {
      const d =
        list("departures").find(
          (d) => text(d, "id") === text(r, "departure_id"),
        ) ?? {};
      return {
        id: text(r, "id"),
        cells: [
          text(d, "departure_date"),
          serviceName(text(d, "service_id")),
          lookup("crew", text(r, "guide_id")),
          money(number(r, "guide_amount")),
          r.no_show_amount == null
            ? "Por confirmar"
            : money(number(r, "no_show_amount")),
          text(r, "notes"),
        ],
      };
    });
  }
  if (module === "operations" && selected === "lodgings") {
    headers = [
      "Pasajero",
      "Noche",
      "Lugar",
      "Habitación",
      "Grupo / referencia",
      "Notas",
    ];
    rows = list("lodgings").map((r) => ({
      id: text(r, "id"),
      cells: [
        passengerName(text(r, "passenger_id")),
        text(r, "night"),
        text(r, "place"),
        labels[text(r, "room_type")],
        text(r, "room_reference"),
        text(r, "notes"),
      ],
      action: (
        <>
          {edit("Modificar alojamiento", "lodging", lodgingFields, r)}
          <TableAction
            icon="remove"
            className="danger"
            pending={removingLodging === text(r, "id")}
            disabled={Boolean(removingLodging)}
            pendingLabel="Retirando…"
            onClick={async () => {
              if (removingLodging) return;
              setRemovingLodging(text(r, "id"));
              try {
                const result = await performAction("removeLodging", {
                  id: r.id,
                });
                setNoticeError(!result.ok);
                setNotice(result.message);
              } catch {
                setNoticeError(true);
                setNotice(
                  "No se pudo retirar la asignación. Inténtalo de nuevo.",
                );
              } finally {
                setRemovingLodging("");
              }
            }}
          >
            Retirar asignación
          </TableAction>
        </>
      ),
    }));
  }
  if (module === "connections") {
    headers = [
      "Pasajero",
      "Salida",
      "Coordinación",
      "Responsable",
      "Proveedor",
      "Transferencia",
      "Hora",
      "Estado",
      "Notas",
    ];
    rows = list("connections")
      .filter((c) =>
        filteredPassengers.some(
          (p) => text(p, "id") === text(c, "passenger_id"),
        ),
      )
      .map((c) => {
        const p =
          list("passengers").find(
            (p) => text(p, "id") === text(c, "passenger_id"),
          ) ?? {};
        const b = bookingById(text(p, "booking_id"));
        return {
          id: text(c, "id"),
          cells: [
            text(p, "full_name"),
            text(b, "departure_date"),
            labels[text(c, "coordinator")],
            text(c, "responsible") || "Por confirmar",
            providerName(text(c, "provider_id")),
            text(c, "transfer_point"),
            text(c, "transfer_time"),
            labels[text(c, "status")],
            text(c, "notes"),
          ],
          action: edit(
            "Gestionar conexión a Puno",
            "connection",
            connectionFields,
            c,
          ),
        };
      });
  }
  if (module === "providers" && selected === "providers") {
    headers = ["Proveedor", "Contacto", "Teléfono", "Estado"];
    rows = list("providers").map((r) => ({
      id: text(r, "id"),
      cells: [
        text(r, "name"),
        text(r, "contact"),
        text(r, "phone"),
        r.active ? "Activo" : "Inactivo",
      ],
      action: edit("Editar proveedor", "providers", providerFields, r),
    }));
  }
  if (module === "providers" && selected === "outsourcings") {
    headers = [
      "Pasajero",
      "Proveedor",
      "Servicio tercerizado",
      "Importe acordado",
      "Fecha",
      "Notas",
    ];
    rows = list("outsourcings").map((r) => ({
      id: text(r, "id"),
      cells: [
        passengerName(text(r, "passenger_id")),
        providerName(text(r, "provider_id")),
        text(r, "concept"),
        money(number(r, "amount")),
        dateInLima(text(r, "created_at")),
        text(r, "notes"),
      ],
    }));
  }
  if (module === "settings" && selected === "services") {
    headers = ["Servicio", "Código", "Días", "Noches", "Estado"];
    rows = list("services").map((r) => ({
      id: text(r, "id"),
      cells: [
        text(r, "name"),
        text(r, "code"),
        number(r, "days"),
        number(r, "nights"),
        r.active ? "Activo" : "Inactivo",
      ],
      action: edit("Editar servicio", "services", serviceFields, r),
    }));
  }
  if (module === "settings" && selected === "extras") {
    headers = ["Concepto", "Precio actual", "Estado"];
    rows = list("extras").map((r) => ({
      id: text(r, "id"),
      cells: [
        text(r, "name"),
        money(number(r, "amount")),
        r.active ? "Activo" : "Inactivo",
      ],
      action: edit("Editar adicional", "extras", extraFields, r),
    }));
  }
  if (module === "staff" && selected === "staff") {
    headers = [
      "Nombre",
      "Correo de acceso",
      "Rol",
      "Estado",
      "Permisos revocados",
    ];
    rows = list("staff").map((r) => ({
      id: text(r, "id"),
      cells: [
        text(r, "full_name"),
        text(r, "email"),
        labels[text(r, "role")],
        r.active ? "Activa" : "Revocada",
        Array.isArray(r.revoked_modules)
          ? r.revoked_modules
              .map((v) => modules.find((m) => m.id === v)?.name ?? String(v))
              .join(", ")
          : "",
      ],
      action:
        text(r, "role") === "sales"
          ? edit("Permisos de la vendedora", "staff", staffFields, r)
          : undefined,
    }));
  }
  if (module === "staff" && selected === "audit") {
    headers = ["Fecha", "Entidad", "Acción", "Responsable", "Registro"];
    rows = list("audit")
      .sort((a, b) => number(b, "id") - number(a, "id"))
      .map((r) => ({
        id: text(r, "id"),
        cells: [
          timeInLima(text(r, "created_at")),
          text(r, "entity"),
          text(r, "operation"),
          lookup("staff", text(r, "actor"), "full_name") ||
            "Registro automático / enlace",
          text(r, "record_id"),
        ],
      }));
  }
  const metricValue = (v: string | number) => (ready ? v : "—");
  const dateBookings = list("bookings").filter(
    (b) =>
      text(b, "departure_date") === dateFilter &&
      text(b, "status") !== "cancelled",
  );
  const dayPeople = list("passengers").filter(
    (p) =>
      dateBookings.some((b) => text(b, "id") === text(p, "booking_id")) &&
      text(p, "attendance") !== "cancelled",
  );
  const unassigned = dayPeople.filter(
    (p) =>
      !list("assignments").some(
        (a) => text(a, "passenger_id") === text(p, "id"),
      ) &&
      !list("operational_outsourcings").some(
        (o) =>
          text(o, "passenger_id") === text(p, "id") &&
          o.covers_transport === true,
      ),
  );
  const secondaryMetric = {
    intermediaries: {
      label: "Endosadores activos",
      value: list("intermediaries").filter((r) => r.active === true).length,
      hint: "Habilitados para nuevas reservas",
    },
    bookings: {
      label: "Pasajeros en la selección",
      value: filteredPassengers.length,
      hint: "Según los filtros de reservas",
    },
    operations: {
      label: "Pasajeros en la selección",
      value: filteredPassengers.length,
      hint: "Para coordinar la operación",
    },
    connections: {
      label: "Conexiones pendientes",
      value: list("connections").filter((r) => text(r, "status") === "pending")
        .length,
      hint: "Total pendiente de coordinación",
    },
    providers: {
      label: "Proveedores activos",
      value: list("providers").filter((r) => r.active === true).length,
      hint: "Disponibles para contratar servicios",
    },
    finance: {
      label: "Saldo neto de la selección",
      value: money(pending("receivable")),
      hint: "Según el tipo de cuenta y titular",
    },
    settings: {
      label: "Servicios activos",
      value: list("services").filter((r) => r.active === true).length,
      hint: "Disponibles en el catálogo",
    },
    staff: {
      label: "Cuentas activas",
      value: list("staff").filter((r) => r.active === true).length,
      hint: "Personal habilitado para ingresar",
    },
    dashboard: { label: "", value: "", hint: "" },
  }[module];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            Perú Andes <span>/</span> {config.name}
          </div>
          <h1>
            {module === "dashboard" ? "Resumen de la operación" : config.name}
          </h1>
          <p>{config.description}</p>
        </div>
        {primaryLabel &&
          !["history", "audit", "corrections", "settlement"].includes(
            selected,
          ) && (
            <button className="btn primary no-print" onClick={primary}>
              ＋ {primaryLabel}
            </button>
          )}
        {module === "dashboard" && (
          <Link href="/reservas" className="btn primary no-print">
            Ver reservas ↗
          </Link>
        )}
      </div>
      {!ready && (
        <div className="setup-banner" role="status">
          <span className="setup-icon">i</span>
          <div>
            <strong>Conexión pendiente</strong>
            <p>
              {setupReason === "migration"
                ? "La base de datos necesita la migración del sistema."
                : "Configura el proyecto Supabase para comenzar a registrar información."}{" "}
              Puedes revisar las pantallas; guardar permanecerá deshabilitado
              hasta completar la conexión.
            </p>
          </div>
        </div>
      )}
      {notice && (
        <p
          className={`notice ${noticeError ? "notice-error" : ""}`}
          role={noticeError ? "alert" : "status"}
        >
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </p>
      )}
      <aside
        className="workflow-guide no-print"
        aria-label="Orientación del módulo"
      >
        <span className="workflow-icon" aria-hidden="true">
          ↗
        </span>
        <div>
          <strong>{moduleGuidance[module].title}</strong>
          <p>{moduleGuidance[module].description}</p>
        </div>
      </aside>
      {module === "dashboard" ? (
        <>
          <div className="dashboard-date">
            <span className="eyebrow">TU OPERACIÓN DEL DÍA</span>
            <label>
              Fecha de salida{" "}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </label>
          </div>
          <div className="metric-summary stats-grid operational-stats">
            <Stat
              label="Reservas con salida"
              value={metricValue(dateBookings.length)}
              hint="Por fecha de salida"
              icon="▤"
            />
            <Stat
              label="Reservas recibidas"
              value={metricValue(
                list("bookings").filter(
                  (b) =>
                    text(b, "created_at") &&
                    dateInLima(text(b, "created_at")) === dateFilter,
                ).length,
              )}
              hint="Por fecha de registro"
              icon="▤"
            />
            <Stat
              label="Pasajeros programados"
              value={metricValue(dayPeople.length)}
              hint="Reservas activas"
              icon="♧"
            />
            <Stat
              label="Movilidades programadas"
              value={metricValue(
                new Set(
                  list("departures")
                    .filter((d) => text(d, "departure_date") === dateFilter)
                    .map((d) => text(d, "vehicle_id")),
                ).size,
              )}
              hint="Unidades para la fecha seleccionada"
              icon="◈"
            />
            <Stat
              label="Sin movilidad asignada"
              value={metricValue(unassigned.length)}
              hint="Requieren coordinación"
              icon="◈"
            />
            <Stat
              label="Conexiones pendientes"
              value={metricValue(
                list("connections").filter(
                  (c) =>
                    text(c, "status") === "pending" &&
                    dayPeople.some(
                      (p) => text(p, "id") === text(c, "passenger_id"),
                    ),
                ).length,
              )}
              hint="Continuación hacia Puno"
              icon="↗"
            />
            <Stat
              label="NO SHOW del día"
              value={metricValue(
                dayPeople.filter((p) => text(p, "attendance") === "no_show")
                  .length,
              )}
              hint="Sin penalidad automática"
              icon="▤"
            />
            <Stat
              label="Movilidad tercerizada"
              value={metricValue(
                dayPeople.filter((p) =>
                  list("operational_outsourcings").some(
                    (o) =>
                      text(o, "passenger_id") === text(p, "id") &&
                      o.covers_transport === true,
                  ),
                ).length,
              )}
              hint="Pasajeros cubiertos por proveedor"
              icon="◇"
            />
          </div>
          <div className="dashboard-panels">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Pasajeros por servicio</h2>
                  <p className="muted">
                    Programación de {dateFilter || "la fecha seleccionada"}
                  </p>
                </div>
                <Link href="/operaciones" className="text-button">
                  Ver operaciones ↗
                </Link>
              </div>
              <div className="service-breakdown">
                {list("service_options").length ? (
                  list("service_options").map((s) => {
                    const count = dayPeople.filter(
                      (p) =>
                        text(
                          bookingById(text(p, "booking_id")),
                          "service_id",
                        ) === text(s, "id"),
                    ).length;
                    return (
                      <div className="service-row" key={text(s, "id")}>
                        <div>
                          <strong>{text(s, "name")}</strong>
                          <span>
                            {number(s, "days")} día
                            {number(s, "days") !== 1 ? "s" : ""} ·{" "}
                            {number(s, "nights")} noche
                            {number(s, "nights") !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="progress-track">
                          <span
                            style={{
                              width: `${dayPeople.length ? (count / dayPeople.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <b>{count}</b>
                      </div>
                    );
                  })
                ) : (
                  <div className="small-empty">
                    La programación aparecerá al conectar el sistema.
                  </div>
                )}
              </div>
            </section>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Prioridades operativas</h2>
                  <p className="muted">Lo que necesita atención</p>
                </div>
              </div>
              <div className="priority-list">
                <Link href="/operaciones">
                  <span className="priority-icon">◈</span>
                  <div>
                    <strong>Asignación de movilidades</strong>
                    <small>
                      {ready
                        ? `${unassigned.length} pasajeros pendientes`
                        : "Sin información todavía"}
                    </small>
                  </div>
                  <span>→</span>
                </Link>
                <Link href="/conexiones">
                  <span className="priority-icon">↗</span>
                  <div>
                    <strong>Conexiones a Puno</strong>
                    <small>Responsables y puntos de transferencia</small>
                  </div>
                  <span>→</span>
                </Link>
                <Link href="/operaciones">
                  <span className="priority-icon">▤</span>
                  <div>
                    <strong>Manifiesto de pasajeros</strong>
                    <small>Consultar, exportar e imprimir</small>
                  </div>
                  <span>→</span>
                </Link>
              </div>
            </section>
          </div>
          {(data.ledger || !ready) && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Resumen financiero</h2>
                  <p className="muted">
                    Saldos acumulados y pagos del día. Acceso sujeto a tus
                    permisos.
                  </p>
                </div>
                <Link className="text-button" href="/finanzas">
                  Ver liquidación ↗
                </Link>
              </div>
              <div className="metric-summary stats-grid">
                <Stat
                  label="Cuentas por cobrar"
                  value={metricValue(money(pending("receivable")))}
                  hint="Saldos pendientes por endosador"
                />
                <Stat
                  label="Pagos en la fecha"
                  value={metricValue(
                    money(
                      -sum(
                        ledger.filter(
                          (r) =>
                            text(r, "direction") === "receivable" &&
                            ["payment", "advance"].includes(text(r, "kind")) &&
                            text(r, "effective_date") === dateFilter,
                        ),
                      ),
                    ),
                  )}
                  hint="Abonos y adelantos registrados"
                />
                <Stat
                  label="Cuentas por pagar"
                  value={metricValue(money(pending("payable")))}
                  hint="Saldos pendientes por proveedor"
                />
                <Stat
                  label="Adelantos disponibles"
                  value={metricValue(
                    money(
                      ledger
                        .filter((r) => text(r, "kind") === "advance")
                        .reduce(
                          (s, r) =>
                            s +
                            Math.max(
                              0,
                              -number(r, "amount") -
                                applied(text(r, "id"), "credit_id"),
                            ),
                          0,
                        ),
                    ),
                  )}
                  hint="Pendientes de aplicación manual"
                />
              </div>
            </>
          )}
        </>
      ) : module === "finance" ? (
        <LiquidationScreen
          data={data}
          ready={ready}
          onRegister={(party, kind) =>
            open(
              (kind === "payment"
                ? "Registrar pago"
                : kind === "advance"
                  ? "Registrar adelanto"
                  : kind === "charge"
                    ? "Agregar cargo"
                    : "Corregir importe") + ` · ${intermediaryName(party)}`,
              "movement",
              movementFields
                .filter(
                  (field) =>
                    ![
                      "direction",
                      "provider_id",
                      "intermediary_id",
                      "kind",
                    ].includes(field.key),
                )
                .map((field) =>
                  field.key === "booking_id"
                    ? {
                        ...field,
                        options: list("bookings")
                          .filter((b) => text(b, "intermediary_id") === party)
                          .map((b) => ({
                            value: text(b, "id"),
                            label: `PA-${text(b, "code").padStart(5, "0")} · ${serviceName(text(b, "service_id"))}`,
                          })),
                      }
                    : field,
                ),
              {
                direction: "receivable",
                intermediary_id: party,
                provider_id: "",
                kind,
                effective_date: today(),
                concept:
                  kind === "payment"
                    ? "Pago recibido"
                    : kind === "advance"
                      ? "Adelanto recibido"
                      : "",
              },
            )
          }
          onAssign={(credit) =>
            open(
              "Asignar pago a deuda",
              "application",
              [
                f(
                  "charge_id",
                  "Deuda que deseas cubrir",
                  "select",
                  ledger
                    .filter(
                      (row) =>
                        text(row, "direction") === "receivable" &&
                        text(row, "intermediary_id") ===
                          text(credit, "intermediary_id") &&
                        number(row, "amount") > 0 &&
                        number(row, "amount") -
                          applied(text(row, "id"), "charge_id") >
                          0,
                    )
                    .map((row) => ({
                      value: text(row, "id"),
                      label:
                        ledgerLabel(row) +
                        ` · Pendiente ${money(number(row, "amount") - applied(text(row, "id"), "charge_id"))}`,
                    })),
                  true,
                ),
                {
                  ...f(
                    "amount",
                    "Importe a asignar",
                    "number",
                    undefined,
                    true,
                  ),
                  hint: `Pago disponible: ${money(-number(credit, "amount") - applied(text(credit, "id"), "credit_id"))}. Esta asignación no crea un nuevo abono.`,
                },
              ],
              { credit_id: text(credit, "id") },
            )
          }
        />
      ) : (
        <>
          {module === "intermediaries" || module === "bookings" ? (
            <div
              className="directory-summary no-print"
              hidden={module === "bookings" && selected === "bookings"}
              aria-label={
                module === "bookings"
                  ? "Resumen de reservas"
                  : "Resumen de endosadores"
              }
            >
              <span>
                {module === "bookings" && selected === "bookings"
                  ? "Reservas en la selección"
                  : "Registros del listado"}{" "}
                <strong>{metricValue(rows.length)}</strong>
              </span>
              <span>
                {secondaryMetric.label}{" "}
                <strong>{metricValue(secondaryMetric.value)}</strong>
              </span>
              <span className="directory-trace">
                Trazabilidad <strong>{ready ? "Activa" : "Pendiente"}</strong>
              </span>
            </div>
          ) : (
            <div className="metric-summary stats-grid compact-stats">
              <Stat
                label="Registros del listado"
                value={metricValue(rows.length)}
                hint="Según filtros actuales"
              />
              <Stat
                label={secondaryMetric.label}
                value={metricValue(secondaryMetric.value)}
                hint={secondaryMetric.hint}
              />
              <Stat
                label="Trazabilidad"
                value={ready ? "Activa" : "Pendiente"}
                hint="Cambios y movimientos conservados"
              />
            </div>
          )}
          {tabs.length > 0 && (
            <div
              className="tabs no-print"
              role="tablist"
              aria-label="Secciones del módulo"
            >
              {tabs.map((t, index) => (
                <button
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-controls="module-records"
                  tabIndex={selected === t.id ? 0 : -1}
                  aria-selected={selected === t.id}
                  className={selected === t.id ? "active" : ""}
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === "ArrowRight"
                        ? (index + 1) % tabs.length
                        : event.key === "ArrowLeft"
                          ? (index - 1 + tabs.length) % tabs.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? tabs.length - 1
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    setTab(tabs[next].id);
                    document.getElementById(`tab-${tabs[next].id}`)?.focus();
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {tabGuidance[selected] && (
            <p className="tab-guidance">{tabGuidance[selected]}</p>
          )}
          {module === "bookings" && selected === "bookings" && (
            <div className="filter-panel no-print">
              <label className="form-field">
                Servicio
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                >
                  <option value="">Todos los servicios</option>
                  {serviceOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Endosador
                <select
                  value={intermediaryFilter}
                  onChange={(e) => setIntermediaryFilter(e.target.value)}
                >
                  <option value="">Todos los endosadores</option>
                  {intermediaryOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {((module === "bookings" && !(selected === "bookings")) ||
            module === "connections" ||
            (module === "intermediaries" && selected === "history") ||
            (module === "operations" &&
              ["manifest", "departures"].includes(selected))) &&
            filters}
          {module === "operations" && selected === "manifest" && (
            <h2 className="report-heading">
              Manifiesto operativo · {dateFilter || "Todas las fechas"} ·{" "}
              {serviceFilter
                ? serviceName(serviceFilter)
                : "Todos los servicios"}
            </h2>
          )}
          {module === "operations" && selected === "manifest" && (
            <div className="inline-action no-print">
              <p>
                Las reservas sin asignación se conservan. NO SHOW y cancelación
                no generan ajustes automáticos.
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeHealth}
                  onChange={(e) => setIncludeHealth(e.target.checked)}
                />
                Incluir requerimientos sensibles en este manifiesto
              </label>
            </div>
          )}
          {module === "operations" && selected === "lodgings" && (
            <div className="inline-action">
              <p>
                {rows.length} pasajeros con alojamiento ·{" "}
                {
                  new Set(
                    list("lodgings").map((r) =>
                      [r.night, r.place, r.room_type, r.room_reference].join(
                        "|",
                      ),
                    ),
                  ).size
                }{" "}
                habitaciones / grupos registrados. No se presumen capacidades ni
                precios.
              </p>
            </div>
          )}
          {module === "settings" && (
            <p className="section-note">
              Los precios de adicionales se conservan al reservar. Su efecto
              financiero requiere un movimiento explícito. OTROS TOURS se
              incorporarán cuando se confirmen sus reglas.
            </p>
          )}
          <div
            id="module-records"
            role={tabs.length ? "tabpanel" : undefined}
            aria-labelledby={tabs.length ? `tab-${selected}` : undefined}
            tabIndex={0}
          >
            {module === "bookings" && selected === "bookings" ? (
              <>
                {!calendarOpen && (
                  <div className="passenger-day-toolbar">
                    <div>
                      <span className="eyebrow">
                        PASAJEROS POR FECHA DE SALIDA
                      </span>
                      <h2>
                        {new Intl.DateTimeFormat("es-PE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }).format(new Date(`${passengerDate}T12:00:00`))}
                      </h2>
                      <p className="muted">
                        {rows.length}{" "}
                        {rows.length === 1
                          ? "pasajero programado"
                          : "pasajeros programados"}
                      </p>
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn"
                        aria-label="Día anterior"
                        onClick={() => changePassengerDay(-1)}
                      >
                        ←
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setPassengerDate(today());
                          setCalendarOpen(false);
                        }}
                      >
                        Hoy
                      </button>
                      <button
                        className="btn"
                        aria-label="Día siguiente"
                        onClick={() => changePassengerDay(1)}
                      >
                        →
                      </button>
                      <button
                        className={`btn ${calendarOpen ? "primary" : ""}`}
                        aria-expanded={calendarOpen}
                        aria-controls="booking-date-picker"
                        onClick={() => setCalendarOpen(!calendarOpen)}
                      >
                        Desplegar calendario ▾
                      </button>
                    </div>
                  </div>
                )}
                <div
                  id="booking-date-picker"
                  className={`calendar-collapse ${calendarOpen ? "is-expanded" : ""}`}
                  inert={!calendarOpen}
                  aria-hidden={!calendarOpen}
                >
                  <div className="calendar-collapse-inner">
                    <BookingCalendar
                      key={passengerDate}
                      initialDate={passengerDate}
                      bookings={list("bookings").filter(
                        (b) =>
                          (!serviceFilter ||
                            text(b, "service_id") === serviceFilter) &&
                          (!intermediaryFilter ||
                            text(b, "intermediary_id") === intermediaryFilter),
                      )}
                      passengers={list("passengers")}
                      services={list("service_options")}
                      onCreate={(date) =>
                        open("Registrar reserva", "newBooking", [], {
                          departure_date: date,
                        })
                      }
                      onSelectDate={(date) => {
                        setPassengerDate(date);
                        setCalendarOpen(false);
                      }}
                    />
                  </div>
                </div>
                <section
                  id="booking-passenger-detail"
                  className="panel booking-passenger-detail"
                  style={{ marginTop: calendarOpen ? 32 : 0 }}
                  aria-label="Pasajeros del día"
                >
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        OPERACIÓN DEL DÍA · {passengerDate}
                      </span>
                      <h2>Todos los pasajeros del día</h2>
                      <p className="muted">
                        {rows.length} pasajeros por trasladar · Todas las
                        reservas de la fecha, según los filtros. Ordenados por
                        hora de recojo; los pendientes aparecen al final.
                      </p>
                    </div>
                  </div>
                  <DataTable
                    key={passengerDate + serviceFilter + intermediaryFilter}
                    headers={headers}
                    rows={rows}
                    exportName={`pasajeros-${passengerDate}`}
                    empty="No hay pasajeros programados para esta fecha"
                    emptyDescription="Selecciona otro día del calendario o registra una nueva reserva."
                  />
                </section>
              </>
            ) : (
              <DataTable
                searchable={selected !== "settlement"}
                key={`${module}-${selected}`}
                headers={headers}
                rows={rows}
                exportName={`peruandes-${module}-${selected}`}
                emptyDescription={
                  ready
                    ? (tabGuidance[selected] ??
                      moduleGuidance[module].description)
                    : "Completa la conexión para consultar y registrar información."
                }
                emptyAction={
                  primaryLabel &&
                  ready &&
                  !["history", "audit", "corrections", "settlement"].includes(
                    selected,
                  ) ? (
                    <button className="btn primary" onClick={primary}>
                      ＋ {primaryLabel}
                    </button>
                  ) : undefined
                }
                empty={
                  ready
                    ? "Todavía no hay registros"
                    : "La información aparecerá al conectar Supabase"
                }
              />
            )}
          </div>
        </>
      )}
      {editor && (
        <EditorDialog editor={editor} close={() => setEditor(null)}>
          {editor.kind === "newBooking" ? (
            <BookingForm
              initialDate={
                editor.initial
                  ? text(editor.initial, "departure_date")
                  : undefined
              }
              onCancel={() => setEditor(null)}
              ready={ready}
              intermediaries={list("intermediary_options")}
              services={list("service_options")}
              extras={list("extra_options")}
              tariffs={list("booking_tariffs")}
              onSaved={() => {
                setNoticeError(false);
                setEditor(null);
                setNotice(
                  "Reserva registrada. Los pasajeros ya aparecen en Operaciones y el cargo del tour en Liquidación.",
                );
              }}
            />
          ) : (
            <RecordForm
              onCancel={() => setEditor(null)}
              ready={ready}
              kind={editor.kind}
              fields={editor.fields}
              initial={editor.initial}
              onSaved={() => {
                setNoticeError(false);
                setEditor(null);
                setNotice("Guardado correctamente.");
              }}
            />
          )}
        </EditorDialog>
      )}
      {pendingRevoke && (
        <EditorDialog
          editor={{ title: "¿Revocar este enlace?", kind: "link", fields: [] }}
          close={() => {
            if (!revoking) setPendingRevoke(null);
          }}
        >
          <p>
            El enlace de{" "}
            <strong>
              {intermediaryName(text(pendingRevoke, "intermediary_id"))}
            </strong>{" "}
            dejará de aceptar nuevas reservas. Las reservas existentes y sus
            cargos se conservarán.
          </p>
          <p className="section-note">
            Para volver a recibir reservas por enlace, podrás generar uno nuevo
            y compartirlo con el endosador.
          </p>
          <div className="form-footer">
            <button
              className="btn"
              disabled={revoking}
              onClick={() => setPendingRevoke(null)}
            >
              Conservar enlace
            </button>
            <LoadingButton
              className="btn danger-button"
              pending={revoking}
              pendingLabel="Revocando…"
              onClick={() => revokeLink(pendingRevoke)}
            >
              Revocar enlace
            </LoadingButton>
          </div>
        </EditorDialog>
      )}
    </>
  );
}
