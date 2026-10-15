"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  actionSchemas,
  catalogSchemas,
  type ActionKind,
} from "@/features/workspace/schemas";
import { performAction } from "@/features/workspace/actions";
import type { Row } from "@/features/workspace/model";
import { validationMessage } from "./validation-message";
export type Option = { value: string; label: string };
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "time"
    | "email"
    | "password"
    | "textarea"
    | "select"
    | "checkbox"
    | "permissions";
  options?: Option[];
  required?: boolean;
  hint?: string;
  wide?: boolean;
};
export function RecordForm({
  kind,
  fields,
  initial = {},
  ready,
  onSaved,
  onCancel,
}: {
  kind: ActionKind;
  fields: Field[];
  initial?: Row;
  ready: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const source =
    kind in catalogSchemas
      ? catalogSchemas[kind as keyof typeof catalogSchemas]
      : actionSchemas[kind as keyof typeof actionSchemas];
  const schema = z
    .record(z.string(), z.unknown())
    .superRefine((values, ctx) => {
      const parsed = source.safeParse(values);
      if (!parsed.success)
        for (const issue of parsed.error.issues)
          ctx.addIssue({
            code: "custom",
            message: issue.message,
            path: issue.path,
          });
    });
  const defaults: Row = { ...initial };
  for (const field of fields)
    if (defaults[field.key] === undefined)
      defaults[field.key] =
        field.type === "checkbox"
          ? true
          : field.type === "permissions"
            ? []
            : "";
  if (
    kind === "movement" ||
    kind === "application" ||
    kind === "outsourcing" ||
    kind === "correction"
  )
    defaults.request_id ??= crypto.randomUUID();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Row>({ resolver: zodResolver(schema), defaultValues: defaults });
  const values = useWatch({ control });
  async function submit(values: Row) {
    setMessage("");
    setSuccess(false);
    const result = await performAction(kind, values);
    setMessage(result.message);
    setSuccess(result.ok);
    if (result.ok) onSaved?.();
  }
  return (
    <form
      noValidate
      onSubmit={handleSubmit(submit, (errors) =>
        setMessage(
          validationMessage(errors) ?? "Revisa los campos del formulario.",
        ),
      )}
      className="record-form"
      aria-busy={isSubmitting}
    >
      <p className="form-instructions">Los campos con * son obligatorios.</p>
      <div className="form-grid">
        {fields.map((field) => {
          const fid = `${kind}-${field.key}`;
          const error = errors[field.key]?.message;
          const value = values[field.key];
          return (
            <div
              key={field.key}
              className={`form-field ${field.wide ? "span-2" : ""}`}
            >
              {field.type !== "checkbox" && (
                <label htmlFor={fid}>
                  {field.label}
                  {field.required && <span className="required"> *</span>}
                </label>
              )}
              {field.type === "select" ? (
                <select
                  id={fid}
                  {...register(field.key)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    [error && `${fid}-error`, field.hint && `${fid}-hint`]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  <option value="">Seleccionar…</option>
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={fid}
                  {...register(field.key)}
                  rows={3}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fid}-error` : undefined}
                />
              ) : field.type === "checkbox" ? (
                <label className="checkbox-label">
                  <input
                    id={fid}
                    type="checkbox"
                    {...register(field.key)}
                    aria-describedby={field.hint ? `${fid}-hint` : undefined}
                  />
                  {field.label}
                </label>
              ) : field.type === "permissions" ? (
                <fieldset className="permissions">
                  <legend className="sr-only">Permisos por módulo</legend>
                  {field.options?.map((o) => (
                    <label key={o.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={
                          !Array.isArray(value) || !value.includes(o.value)
                        }
                        onChange={(e) => {
                          const list = Array.isArray(value)
                            ? value.filter(
                                (v): v is string => typeof v === "string",
                              )
                            : [];
                          setValue(
                            field.key,
                            e.target.checked
                              ? list.filter((v) => v !== o.value)
                              : [...list, o.value],
                          );
                        }}
                      />
                      {o.label}
                    </label>
                  ))}
                </fieldset>
              ) : (
                <input
                  id={fid}
                  type={field.type ?? "text"}
                  {...register(field.key)}
                  step={field.type === "number" ? "0.01" : undefined}
                  autoComplete={
                    field.type === "password" ? "new-password" : "off"
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${fid}-error` : undefined}
                />
              )}
              {field.hint && <small id={`${fid}-hint`}>{field.hint}</small>}
              {field.type === "select" && !field.options?.length && (
                <small className="field-error">
                  No hay opciones disponibles. Registra primero la información
                  relacionada.
                </small>
              )}
              {error && (
                <small id={`${fid}-error`} role="alert" className="field-error">
                  {String(error)}
                </small>
              )}
            </div>
          );
        })}
      </div>
      <footer className="form-footer">
        <span
          role="status"
          className={success ? "text-success" : "field-error"}
        >
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
          <button className="btn primary" disabled={!ready || isSubmitting}>
            {isSubmitting
              ? "Guardando…"
              : initial.id
                ? "Guardar cambios"
                : "Guardar registro"}
          </button>
        </div>
      </footer>
    </form>
  );
}
