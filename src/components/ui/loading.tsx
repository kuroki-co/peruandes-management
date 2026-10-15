import type { ButtonHTMLAttributes } from "react";

export function Spinner() {
  return <span className="loading-spinner" aria-hidden="true" />;
}

export function LoadingIndicator({
  label = "Cargando información…",
  fullscreen = false,
}: {
  label?: string;
  fullscreen?: boolean;
}) {
  return (
    <div
      className={`loading-state ${fullscreen ? "loading-screen" : ""}`}
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <strong>{label}</strong>
      <span>Un momento, por favor.</span>
    </div>
  );
}

export function LoadingButton({
  pending,
  pendingLabel = "Procesando…",
  children,
  disabled,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  pending: boolean;
  pendingLabel?: string;
}) {
  return (
    <button
      {...props}
      className={`loading-button ${className}`}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending && <Spinner />}
      {pending ? pendingLabel : children}
    </button>
  );
}
