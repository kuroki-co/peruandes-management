"use client";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { TableAction } from "@/components/ui/table-action";
import {
  text,
  number,
  money,
  labels,
  dateInLima,
  type Snapshot,
  type Row,
} from "./model";

const total = (rows: Row[]) =>
  rows.reduce((sum, row) => sum + Math.round(number(row, "amount") * 100), 0) /
  100;
export function LiquidationScreen({
  data,
  ready,
  onRegister,
  onAssign,
}: {
  data: Snapshot;
  ready: boolean;
  onRegister: (
    party: string,
    kind: "payment" | "advance" | "charge" | "adjustment",
  ) => void;
  onAssign: (credit: Row) => void;
}) {
  const [party, setParty] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const list = (key: string) => data[key] ?? [];
  const ledger = list("ledger").filter(
    (row) => text(row, "direction") === "receivable",
  );
  const parties = list("intermediary_options");
  const name = (id: string) =>
    text(parties.find((row) => text(row, "id") === id) ?? {}, "name");
  const account = ledger.filter(
    (row) => text(row, "intermediary_id") === party,
  );
  const period = account.filter(
    (row) =>
      (!from || text(row, "effective_date") >= from) &&
      (!to || text(row, "effective_date") <= to),
  );
  const opening = total(
    account.filter(
      (row) => Boolean(from) && text(row, "effective_date") < from,
    ),
  );
  const closing = total(
    account.filter((row) => !to || text(row, "effective_date") <= to),
  );
  const current = total(account);
  const applied = (id: string) =>
    total(list("applications").filter((row) => text(row, "credit_id") === id));
  const available = (credit: Row) =>
    Math.max(
      0,
      Math.round(
        (-number(credit, "amount") - applied(text(credit, "id"))) * 100,
      ) / 100,
    );
  const credits = account.filter((row) => number(row, "amount") < 0);
  const allBalances = parties.map((row) => ({
    row,
    balance: total(
      ledger.filter(
        (entry) => text(entry, "intermediary_id") === text(row, "id"),
      ),
    ),
  }));
  const assignedRows = list("applications").filter((row) =>
    credits.some((credit) => text(credit, "id") === text(row, "credit_id")),
  );
  return (
    <section className="liquidation-workspace">
      {!party ? (
        <>
          <div className="directory-summary">
            <span>
              Deuda total{" "}
              <strong>
                {ready
                  ? money(
                      allBalances.reduce(
                        (sum, p) => sum + Math.max(0, p.balance),
                        0,
                      ),
                    )
                  : "—"}
              </strong>
            </span>
            <span>
              Saldos a favor{" "}
              <strong>
                {ready
                  ? money(
                      allBalances.reduce(
                        (sum, p) => sum + Math.max(0, -p.balance),
                        0,
                      ),
                    )
                  : "—"}
              </strong>
            </span>
          </div>
          <p className="tab-guidance">
            Abre el ojito de un endosador para ver su deuda e historial de
            pagos.
          </p>
          <DataTable
            headers={[
              "Endosador",
              "Deuda pendiente",
              "Saldo a favor",
              "Estado",
            ]}
            rows={allBalances.map(({ row, balance }) => ({
              id: text(row, "id"),
              cells: [
                text(row, "name"),
                money(Math.max(0, balance)),
                money(Math.max(0, -balance)),
                balance > 0
                  ? "Pendiente"
                  : balance < 0
                    ? "Saldo a favor"
                    : "Al día",
              ],
              action: (
                <TableAction
                  icon="eye"
                  label={`Ver deuda e historial de ${text(row, "name")}`}
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setParty(text(row, "id"));
                  }}
                >
                  Ver deuda e historial
                </TableAction>
              ),
            }))}
            exportName="deuda-endosadores"
            empty="Todavía no hay endosadores"
            emptyDescription="Registra primero un hotel o agencia en Endosadores."
          />
        </>
      ) : (
        <>
          <div className="form-actions no-print">
            <button
              className="btn"
              onClick={() => {
                setParty("");
                setFrom("");
                setTo("");
              }}
            >
              ← Volver a endosadores
            </button>
          </div>
          <header className="section-heading">
            <div>
              <span className="eyebrow">DEUDA E HISTORIAL</span>
              <h2>{name(party)}</h2>
              <p className="muted">
                {from || "Desde el primer registro"} — {to || "Sin fecha final"}
              </p>
            </div>
            <div className="form-actions no-print">
              <button className="btn" onClick={() => window.print()}>
                Imprimir estado de cuenta
              </button>
              <button
                className="btn primary"
                disabled={!ready}
                onClick={() => onRegister(party, "payment")}
              >
                ＋ Registrar pago
              </button>
            </div>
          </header>
          <div className="directory-summary">
            <span>
              Deuda actual <strong>{money(Math.max(0, current))}</strong>
            </span>
            <span>
              Saldo a favor actual{" "}
              <strong>{money(Math.max(0, -current))}</strong>
            </span>
          </div>
          <div className="filter-panel no-print">
            <label className="form-field">
              Desde
              <input
                type="date"
                aria-label="Desde"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="form-field">
              Hasta
              <input
                type="date"
                aria-label="Hasta"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              className="btn"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Todo el historial
            </button>
          </div>
          <div className="liquidation-period-summary">
            <h3>Resumen del período</h3>
            <div className="settlement-totals">
              <span>
                Saldo anterior <b>{money(opening)}</b>
              </span>
              <span>
                Cargos{" "}
                <b>
                  {money(
                    total(period.filter((row) => number(row, "amount") > 0)),
                  )}
                </b>
              </span>
              <span>
                Pagos y ajustes a favor{" "}
                <b>
                  {money(
                    -total(period.filter((row) => number(row, "amount") < 0)),
                  )}
                </b>
              </span>
              <span>
                Saldo al cierre{" "}
                <b>
                  {money(Math.abs(closing))}
                  {closing < 0 ? " a favor" : closing > 0 ? " por cobrar" : ""}
                </b>
              </span>
            </div>
            <p className="muted">
              La deuda actual incluye todo el historial. El saldo al cierre
              corresponde al período elegido.
            </p>
          </div>
          <h3 className="report-heading">Detalle de cargos y pagos</h3>
          <DataTable
            key={`${party}-${from}-${to}`}
            searchable={false}
            headers={[
              "Fecha",
              "Tipo",
              "Motivo / reserva",
              "Pasajeros",
              "Cargo",
              "Pago / abono",
              "Referencia",
            ]}
            rows={[...period]
              .sort(
                (a, b) =>
                  text(a, "effective_date").localeCompare(
                    text(b, "effective_date"),
                  ) ||
                  text(a, "created_at").localeCompare(text(b, "created_at")),
              )
              .map((row) => {
                const booking = list("bookings").find(
                  (b) => text(b, "id") === text(row, "booking_id"),
                );
                const reference = booking
                  ? `PA-${text(booking, "code").padStart(5, "0")} · ${text(booking, "service_name")}`
                  : "";
                return {
                  id: text(row, "id"),
                  cells: [
                    text(row, "effective_date"),
                    labels[text(row, "kind")] ?? text(row, "kind"),
                    [text(row, "concept"), reference]
                      .filter(Boolean)
                      .join(" · "),
                    list("financial_passengers")
                      .filter(
                        (p) =>
                          text(p, "booking_id") === text(row, "booking_id"),
                      )
                      .map((p) => text(p, "full_name"))
                      .join("; "),
                    number(row, "amount") > 0
                      ? money(number(row, "amount"))
                      : "",
                    number(row, "amount") < 0
                      ? money(-number(row, "amount"))
                      : "",
                    text(row, "reference"),
                  ],
                  action:
                    number(row, "amount") < 0 && available(row) > 0 ? (
                      <TableAction
                        icon="finance"
                        label={`Asignar pago a deuda: disponible ${money(available(row))}`}
                        onClick={() => onAssign(row)}
                      >
                        Asignar pago a deuda
                      </TableAction>
                    ) : undefined,
                };
              })}
            exportName={`estado-cuenta-${party}-${from || "inicio"}-${to || "actual"}`}
            empty="No hay cargos ni pagos en este período"
            emptyDescription="Prueba otro período o registra un pago cuando lo recibas."
          />
          <details className="finance-secondary no-print">
            <summary>Otras acciones: adelantos, cargos y correcciones</summary>
            <p className="muted">
              El cargo del tour ya se genera con la reserva. Registra otro cargo
              únicamente si corresponde a un concepto adicional.
            </p>
            <div className="form-actions">
              <button
                className="btn"
                disabled={!ready}
                onClick={() => onRegister(party, "advance")}
              >
                Registrar adelanto
              </button>
              <button
                className="btn"
                disabled={!ready}
                onClick={() => onRegister(party, "charge")}
              >
                Agregar cargo
              </button>
              <button
                className="btn"
                disabled={!ready}
                onClick={() => onRegister(party, "adjustment")}
              >
                Corregir importe
              </button>
            </div>
          </details>
          <details className="finance-secondary no-print">
            <summary>
              Detalle de asignación de pagos ({assignedRows.length})
            </summary>
            <p className="muted">
              Asignar indica qué deuda cubre un pago existente; no vuelve a
              descontarlo del saldo. Usa el icono junto al pago para asignarlo.
            </p>
            <p>
              Pagos y adelantos disponibles para asignar:{" "}
              <strong>
                {money(credits.reduce((sum, row) => sum + available(row), 0))}
              </strong>
            </p>
            <DataTable
              headers={["Pago utilizado", "Deuda cubierta", "Importe", "Fecha"]}
              rows={assignedRows.map((row) => ({
                id: text(row, "id"),
                cells: [
                  text(
                    ledger.find(
                      (l) => text(l, "id") === text(row, "credit_id"),
                    ) ?? {},
                    "concept",
                  ),
                  text(
                    ledger.find(
                      (l) => text(l, "id") === text(row, "charge_id"),
                    ) ?? {},
                    "concept",
                  ),
                  money(number(row, "amount")),
                  dateInLima(text(row, "created_at")),
                ],
              }))}
              exportName="asignaciones-pagos"
              empty="Todavía no hay pagos asignados"
              emptyDescription="Un pago ya reduce la deuda del endosador aunque aún no esté asignado a una reserva concreta."
            />
          </details>
        </>
      )}
    </section>
  );
}
