"use client";
import { useRouter } from "next/navigation";
import { useState, useId } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  bookingSchema,
  type BookingInput,
  type BookingValues,
} from "./schemas";
import { performAction, submitPublicBooking } from "./actions";
import { text, number, money, today, type Row } from "./model";
import { validationMessage } from "@/components/ui/validation-message";
import { LoadingButton } from "@/components/ui/loading";

const emptyPassenger = {
  full_name: "",
  phone: "",
  pickup: "",
  pickup_time: "",
  notes: "",
  dietary: "",
  allergies: "",
  medication: "",
  puno: false,
  coordinator: "unconfirmed" as const,
  extras: [],
};
export function BookingForm({
  intermediaries,
  services,
  extras,
  tariffs = [],
  token,
  intermediaryName,
  ready,
  onSaved,
  onCancel,
  initialDate,
}: {
  intermediaries: Row[];
  services: Row[];
  extras: Row[];
  tariffs?: Row[];
  token?: string;
  intermediaryName?: string;
  ready: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
  initialDate?: string;
}) {
  const router = useRouter();
  const formId = useId();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput, unknown, BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      request_id: crypto.randomUUID(),
      intermediary_id: "",
      service_id: "",
      departure_date: initialDate || today(),
      notes: "",
      passengers: [{ ...emptyPassenger }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });
  const iid = useWatch({ control, name: "intermediary_id" }),
    sid = useWatch({ control, name: "service_id" }),
    people = useWatch({ control, name: "passengers" });
  const departureDate = useWatch({ control, name: "departure_date" });
  const tariff = token
    ? services.find((s) => text(s, "id") === sid)
    : tariffs
        .filter(
          (t) =>
            text(t, "intermediary_id") === iid && text(t, "service_id") === sid,
        )
        .sort((a, b) => number(b, "version") - number(a, "version"))[0];
  const total = tariff ? number(tariff, "amount") * fields.length : null;
  const extrasTotal = people.reduce(
    (sum, p) =>
      sum +
      (p.extras ?? []).reduce(
        (s, e) =>
          s +
          number(
            extras.find((x) => text(x, "id") === e.extra_id) ?? {},
            "amount",
          ) *
            Number(e.quantity),
        0,
      ),
    0,
  );
  async function submit(values: BookingValues) {
    setMessage("");
    const quoted = token
      ? values
      : {
          ...values,
          expected_rate: tariff ? number(tariff, "amount") : undefined,
          passengers: values.passengers.map((p) => ({
            ...p,
            extras: p.extras.map((e) => ({
              ...e,
              expected_price: number(
                extras.find((x) => text(x, "id") === e.extra_id) ?? {},
                "amount",
              ),
            })),
          })),
        };
    const result = token
      ? await submitPublicBooking(token, quoted)
      : await performAction("booking", quoted);
    setMessage(result.message);
    setSuccess(result.ok);
    if (result.ok) onSaved?.();
    else router.refresh();
  }
  if (success)
    return (
      <div className="booking-success" role="status">
        <span>✓</span>
        <h2>Reserva registrada</h2>
        <p>{message}</p>
        <p>
          <strong>{intermediaryName}</strong> ·{" "}
          {services.find((s) => text(s, "id") === sid)?.name as string} ·{" "}
          {departureDate} · {fields.length} pasajero
          {fields.length !== 1 ? "s" : ""}
        </p>
        <p>
          Perú Andes ya puede coordinar el servicio. No necesitas volver a
          enviar esta reserva.
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            reset({
              request_id: crypto.randomUUID(),
              intermediary_id: "",
              service_id: "",
              departure_date: today(),
              notes: "",
              passengers: [{ ...emptyPassenger }],
            });
            setSuccess(false);
            setMessage("");
          }}
        >
          Registrar otra reserva
        </button>
      </div>
    );
  return (
    <form
      className="booking-form"
      onSubmit={handleSubmit(submit, (errors) =>
        setMessage(
          validationMessage(errors) ?? "Revisa los datos de los pasajeros.",
        ),
      )}
      noValidate
      aria-busy={isSubmitting}
    >
      <p className="form-instructions">
        Completa el servicio y los datos de cada pasajero. Los campos con * son
        obligatorios.
      </p>
      {services.filter((s) => s.active !== false).length === 0 && (
        <div className="demo-notice">
          <strong>No hay servicios disponibles para reservar</strong>
          <p>
            Solicita a Perú Andes que revise los servicios y las tarifas
            acordadas antes de continuar.
          </p>
        </div>
      )}
      <section className="form-section">
        <h3>Datos de la reserva</h3>
        <p className="muted">Selecciona el servicio y la fecha de salida.</p>
        <div className="form-grid">
          {token ? (
            <div className="form-field span-2">
              <label>Endosador</label>
              <strong>{intermediaryName}</strong>
            </div>
          ) : (
            <div className="form-field">
              <label htmlFor="booking-intermediary">Endosador *</label>
              <select
                id="booking-intermediary"
                {...register("intermediary_id")}
              >
                <option value="">Seleccionar…</option>
                {intermediaries
                  .filter((r) => r.active !== false)
                  .map((r) => (
                    <option key={text(r, "id")} value={text(r, "id")}>
                      {text(r, "name")}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="booking-service">Servicio turístico *</label>
            <select
              id="booking-service"
              {...register("service_id")}
              aria-invalid={Boolean(errors.service_id)}
            >
              <option value="">Seleccionar…</option>
              {services
                .filter((s) => s.active !== false)
                .map((s) => (
                  <option key={text(s, "id")} value={text(s, "id")}>
                    {text(s, "name")}
                  </option>
                ))}
            </select>
            {errors.service_id && (
              <small role="alert" className="field-error">
                {errors.service_id.message}
              </small>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="booking-date">Fecha de salida *</label>
            <input
              id="booking-date"
              type="date"

              {...register("departure_date")}
            />
            {errors.departure_date && (
              <small role="alert" className="field-error">
                {errors.departure_date.message}
              </small>
            )}
          </div>
          <details className="form-field span-2 sensitive-section">
            <summary>Observaciones generales de la reserva (opcional)</summary>
            <label htmlFor="booking-notes">Observaciones generales</label>
            <textarea id="booking-notes" {...register("notes")} rows={2} />
          </details>
        </div>
      </section>
      <section className="form-section">
        <div className="section-heading">
          <div>
            <h3>Pasajeros</h3>
            <p className="muted">
              Cada persona conserva sus datos y requerimientos.
            </p>
          </div>
          <button
            type="button"
            className="btn"
            disabled={fields.length >= 50}
            onClick={() => append({ ...emptyPassenger })}
          >
            ＋ Añadir pasajero
          </button>
        </div>
        {fields.map((field, index) => {
          const e = errors.passengers?.[index];
          const domId = `${formId}-passenger-${index}`;
          return (
            <fieldset className="passenger-card" key={field.id}>
              <legend>Pasajero {index + 1}</legend>
              {fields.length > 1 && (
                <button
                  type="button"
                  className="text-button remove-passenger"
                  onClick={() => remove(index)}
                >
                  Quitar
                </button>
              )}
              <div className="form-grid">
                {(
                  [
                    {
                      key: "full_name",
                      label: "Nombre completo",
                      required: true,
                    },
                    {
                      key: "phone",
                      label: "Teléfono nacional o internacional",
                    },
                    {
                      key: "pickup",
                      label: "Hotel o lugar de recojo",
                      required: true,
                    },
                    { key: "pickup_time", label: "Hora de recojo" },
                    { key: "dietary", label: "Requerimientos alimentarios" },
                  ] as const
                ).map((f) => (
                  <div className="form-field" key={f.key}>
                    <label htmlFor={`${domId}-${f.key}`}>
                      {f.label}
                      {"required" in f ? " *" : ""}
                    </label>
                    <input
                      id={`${domId}-${f.key}`}
                      type={f.key === "pickup_time" ? "time" : "text"}
                      {...register(`passengers.${index}.${f.key}`)}
                      aria-invalid={Boolean(e?.[f.key])}
                      aria-describedby={
                        e?.[f.key] ? `${domId}-${f.key}-error` : undefined
                      }
                    />
                    {f.key === "pickup_time" && (
                      <small>
                        Si aún no está confirmada, puedes dejarla pendiente.
                      </small>
                    )}
                    {e?.[f.key] && (
                      <small
                        id={`${domId}-${f.key}-error`}
                        role="alert"
                        className="field-error"
                      >
                        {e[f.key]?.message}
                      </small>
                    )}
                  </div>
                ))}
              </div>
              <details className="sensitive-section">
                <summary>Alergias y medicación relevantes para el tour</summary>
                <p className="muted">
                  Información voluntaria. Comparte únicamente lo necesario para
                  la seguridad del servicio; no aparece en reportes financieros.
                </p>
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor={`${domId}-allergies`}>Alergias</label>
                    <textarea
                      id={`${domId}-allergies`}
                      {...register(`passengers.${index}.allergies`)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${domId}-medication`}>
                      Medicación o condiciones comunicadas
                    </label>
                    <textarea
                      id={`${domId}-medication`}
                      {...register(`passengers.${index}.medication`)}
                    />
                  </div>
                </div>
              </details>
              <h4>Servicios adicionales</h4>
              <div className="extras-grid">
                {extras
                  .filter((x) => x.active !== false)
                  .map((extra) => {
                    const eid = text(extra, "id");
                    const selected = people[index]?.extras ?? [];
                    const entry = selected.find((x) => x.extra_id === eid);
                    return (
                      <div className="extra-choice" key={eid}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={Boolean(entry)}
                            onChange={(ev) =>
                              setValue(
                                `passengers.${index}.extras`,
                                ev.target.checked
                                  ? [
                                      ...selected,
                                      { extra_id: eid, quantity: 1 },
                                    ]
                                  : selected.filter((x) => x.extra_id !== eid),
                              )
                            }
                          />
                          <span>
                            {text(extra, "name")}
                            {!token && (
                              <small>{money(number(extra, "amount"))}</small>
                            )}
                          </span>
                        </label>
                        {entry && (
                          <input
                            aria-label={`Cantidad de ${text(extra, "name")} para pasajero ${index + 1}`}
                            type="number"
                            min="1"
                            max="50"
                            value={Number(entry.quantity)}
                            onChange={(ev) =>
                              setValue(
                                `passengers.${index}.extras`,
                                selected.map((x) =>
                                  x.extra_id === eid
                                    ? {
                                        ...x,
                                        quantity: Number(ev.target.value),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
              <div className="connection-choice">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    {...register(`passengers.${index}.puno`)}
                  />
                  Continuará hacia Puno
                </label>
                {people[index]?.puno && (
                  <div className="form-field">
                    <label htmlFor={`${domId}-coordinator`}>
                      ¿Quién coordina la conexión?
                    </label>
                    <select
                      id={`${domId}-coordinator`}
                      {...register(`passengers.${index}.coordinator`)}
                    >
                      <option value="unconfirmed">
                        Responsable por confirmar
                      </option>
                      <option value="peru_andes">Perú Andes</option>
                      <option value="intermediary">Hotel / agencia</option>
                      <option value="third_party">Un tercero</option>
                    </select>
                  </div>
                )}
              </div>
              <div
                className="form-field passenger-notes"
                style={{ marginTop: 24 }}
              >
                <label htmlFor={`${domId}-notes`}>Observaciones</label>
                <textarea
                  id={`${domId}-notes`}
                  {...register(`passengers.${index}.notes`)}
                  rows={2}
                />
              </div>
            </fieldset>
          );
        })}
      </section>
      <div className="booking-summary">
        <div>
          <span className="eyebrow">REVISA ANTES DE ENVIAR</span>
          <p>
            {(services.find((s) => text(s, "id") === sid)?.name as string) ||
              "Selecciona un servicio"}{" "}
            · {departureDate || "Selecciona una fecha"}
          </p>
          {!token && (
            <>
              <small>Cargo del tour al endosador</small>
              <strong>
                {total === null ? "Tarifa por seleccionar" : money(total)}
              </strong>
              <span>
                {fields.length} pasajero{fields.length !== 1 ? "s" : ""} · Los
                adicionales requieren un movimiento explícito.
              </span>
              <p className="extra-total">
                Adicionales solicitados: <b>{money(extrasTotal)}</b>. Este
                importe no se carga automáticamente al endosador.
              </p>
              {sid && total === null && (
                <p className="field-error">
                  No hay una tarifa acordada para este servicio. Solicita su
                  configuración en Endosadores → Tarifas.
                </p>
              )}
            </>
          )}
          {token && (
            <span>
              {fields.length} {fields.length === 1 ? "pasajero" : "pasajeros"}.
              Revisa la fecha, los datos de recojo y los adicionales solicitados
              antes de registrar.
            </span>
          )}
        </div>
      </div>
      <footer className="form-footer">
        <span className="field-error" role="alert">
          {message}
        </span>
        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
          )}
          <LoadingButton
            type="submit"
            pending={isSubmitting}
            pendingLabel="Registrando…"
            className="btn primary"
            disabled={
              !ready ||
              isSubmitting ||
              (Boolean((token || iid) && sid) && total === null) ||
              services.filter((s) => s.active !== false).length === 0
            }
          >
            Registrar reserva
          </LoadingButton>
        </div>
      </footer>
    </form>
  );
}
