import Link from "next/link";
import type { ComponentProps, ButtonHTMLAttributes } from "react";
import { Spinner } from "./loading";

type IconName =
  | "eye"
  | "edit"
  | "history"
  | "copy"
  | "external"
  | "revoke"
  | "finance"
  | "extras"
  | "vehicle"
  | "attendance"
  | "remove";
const paths: Record<IconName, string> = {
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  edit: "m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z",
  history: "M4 5h16v15H4zM8 3v4m8-4v4M4 10h16m-12 4h3m2 0h3m-8 3h3",
  copy: "M9 9h11v11H9zM15 9V4H4v11h5",
  external: "M14 4h6v6m0-6L10 14M10 4H4v16h16v-6",
  revoke: "M5 5l14 14M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  finance: "M4 4h16v16H4zM8 8h8m-8 4h2m4 0h2m-8 4h2m4 0h2",
  extras: "M4 7h16v13H4zM7 7V4h10v3m-5 4v6m-3-3h6",
  vehicle:
    "M5 17H3V7h18v10h-2M7 17h10M3 11h18M8 7v4m8-4v4M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  attendance: "m8 12 3 3 5-6M5 3h14v18H5z",
  remove: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13m-8 4v5m4-5v5",
};
function ActionIcon({ name }: { name: IconName }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function TableAction({
  icon,
  label,
  children,
  pending = false,
  pendingLabel = "Procesando…",
  disabled,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  label?: string;
  children: string;
  pending?: boolean;
  pendingLabel?: string;
}) {
  const name = pending ? pendingLabel : (label ?? children);
  return (
    <span className="action-tooltip">
      <button
        {...props}
        type="button"
        disabled={disabled || pending}
        aria-label={name}
        aria-busy={pending}
        className={`row-action-button ${className}`}
      >
        {pending ? <Spinner /> : <ActionIcon name={icon} />}
      </button>
      <span className="action-tooltip-label" aria-hidden="true">
        {name}
      </span>
    </span>
  );
}

export function TableActionLink({
  icon,
  children,
  className = "",
  ...props
}: Omit<ComponentProps<typeof Link>, "children"> & {
  icon: IconName;
  children: string;
}) {
  return (
    <span className="action-tooltip">
      <Link
        {...props}
        aria-label={children}
        className={`row-action-button ${className}`}
      >
        <ActionIcon name={icon} />
      </Link>
      <span className="action-tooltip-label" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}
