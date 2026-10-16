"use client";
import { useState } from "react";
import { today, text, type Row } from "./model";

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function BookingCalendar({
  bookings,
  passengers,
  services,
  onCreate,
  onSelectDate,
  initialDate,
}: {
  bookings: Row[];
  passengers: Row[];
  services: Row[];
  onCreate: (date: string) => void;
  onSelectDate: (date: string) => void;
  initialDate?: string;
}) {
  const [selected, setSelected] = useState(initialDate || today());
  const [month, setMonth] = useState(() =>
    (initialDate || today()).slice(0, 7),
  );
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, monthNumber, 0).getDate();
  const cells = Math.ceil((offset + count) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
  }).format(first);
  const people = (booking: Row) =>
    passengers.filter(
      (p) =>
        text(p, "booking_id") === text(booking, "id") &&
        text(p, "attendance") !== "cancelled",
    ).length;
  const color = (booking: Row) =>
    Math.max(
      0,
      services.findIndex((s) => text(s, "id") === text(booking, "service_id")),
    ) % 4;
  const dayBookings = bookings.filter(
    (b) => text(b, "departure_date") === selected,
  );
  const monthBookings = bookings.filter((b) =>
    text(b, "departure_date").startsWith(month),
  );
  function moveMonth(delta: number) {
    setMonth(dateKey(new Date(year, monthNumber - 1 + delta, 1)).slice(0, 7));
  }
  return (
    <section className="booking-calendar">
      <header className="calendar-toolbar">
        <div>
          <h2>{monthLabel}</h2>
          <p>
            {monthBookings
              .filter((b) => text(b, "status") !== "cancelled")
              .reduce((n, b) => n + people(b), 0)}{" "}
            pasajeros programados · por fecha de salida
          </p>
        </div>
        <div className="form-actions">
          <button
            className="btn"
            aria-label="Mes anterior"
            onClick={() => moveMonth(-1)}
          >
            ←
          </button>
          <button
            className="btn"
            onClick={() => {
              setMonth(today().slice(0, 7));
              setSelected(today());
              onSelectDate(today());
            }}
          >
            Hoy
          </button>
          <button
            className="btn"
            aria-label="Mes siguiente"
            onClick={() => moveMonth(1)}
          >
            →
          </button>
          <input
            aria-label="Ir a mes"
            type="month"
            value={month}
            onChange={(e) => {
              if (/^\d{4}-\d{2}$/.test(e.target.value))
                setMonth(e.target.value);
            }}
          />
        </div>
      </header>
      <div className="calendar-legend">
        {services.map((s, i) => (
          <span key={text(s, "id")}>
            <i className={`calendar-dot calendar-color-${i % 4}`} />
            {text(s, "name")}
          </span>
        ))}
        <span>Solo pasajeros de reservas activas</span>
      </div>
      <div className="calendar-layout">
        <div className="calendar-month">
          <div className="calendar-weekdays">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: cells }, (_, index) => {
              const date = new Date(year, monthNumber - 1, index - offset + 1);
              const key = dateKey(date);
              const current = date.getMonth() === monthNumber - 1;
              const records = bookings.filter(
                (b) => text(b, "departure_date") === key,
              );
              const active = records.filter(
                (b) => text(b, "status") !== "cancelled",
              );
              return (
                <button
                  key={key}
                  className={`calendar-day ${!current ? "outside-month" : ""} ${selected === key ? "selected-day" : ""} ${key === today() ? "today-day" : ""}`}
                  aria-pressed={selected === key}
                  aria-label={`${key}: ${records.length} reservas, ${active.reduce((n, b) => n + people(b), 0)} pasajeros activos`}
                  onClick={() => {
                    setSelected(key);
                    onSelectDate(key);
                    if (!current) setMonth(key.slice(0, 7));
                  }}
                >
                  <span className="calendar-day-number">{date.getDate()}</span>
                  {records.length > 0 && (
                    <>
                      <small className="calendar-day-count">
                        {active.reduce((n, b) => n + people(b), 0)} pasajeros
                      </small>
                      <span className="calendar-events">
                        {services
                          .filter((service) =>
                            active.some(
                              (b) =>
                                text(b, "service_id") === text(service, "id"),
                            ),
                          )
                          .slice(0, 2)
                          .map((service) => {
                            const group = active.filter(
                              (b) =>
                                text(b, "service_id") === text(service, "id"),
                            );
                            return (
                              <span
                                key={text(service, "id")}
                                className={`calendar-event calendar-color-${color(group[0])}`}
                              >
                                {text(service, "name")} ·{" "}
                                {group.reduce((n, b) => n + people(b), 0)} pax
                              </span>
                            );
                          })}
                      </span>
                      <span className="calendar-mobile-count">
                        {active.reduce((n, b) => n + people(b), 0)}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="calendar-detail" aria-label="Reservas del día">
          <h3>
            {new Intl.DateTimeFormat("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(selected + "T12:00:00"))}
          </h3>
          <p className="muted">
            {dayBookings
              .filter((b) => text(b, "status") !== "cancelled")
              .reduce((n, b) => n + people(b), 0)}{" "}
            pasajeros programados
          </p>
          <button className="btn primary" onClick={() => onCreate(selected)}>
            ＋ Nueva reserva
          </button>
          <p className="calendar-empty">
            El listado completo de pasajeros de este día aparece debajo del
            calendario, con hora y lugar de recojo.
          </p>
          {services.map((service) => {
            const count = dayBookings
              .filter(
                (b) =>
                  text(b, "status") !== "cancelled" &&
                  text(b, "service_id") === text(service, "id"),
              )
              .reduce((n, b) => n + people(b), 0);
            return count ? (
              <p className="calendar-booking" key={text(service, "id")}>
                <strong>{text(service, "name")}</strong>
                <span>{count} pasajeros</span>
              </p>
            ) : null;
          })}
        </aside>
      </div>
    </section>
  );
}
