"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { modules, canAccess, type Access } from "./model";
import { logout } from "./actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
export function Shell({
  access,
  children,
}: {
  access: Access | null;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const available = modules.filter(
    (m) =>
      !["operations", "connections", "providers"].includes(m.id) &&
      (!access || canAccess(access, m.id)),
  );
  const current = modules.find((m) => m.path === path);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link className="brand" href="/dashboard">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <path
                d="M5 30 17 9l6 10 5-7 9 18H5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path
                d="m12 18 5 5 6-4M25 18l3 4 3-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
          <span>
            PERÚ ANDES<small>GESTIÓN TURÍSTICA</small>
          </span>
        </Link>
        <div className="nav-section-label">ESPACIO DE TRABAJO</div>
        <nav aria-label="Navegación principal">
          {available.map((m) => (
            <Link
              href={m.path}
              key={m.id}
              className={`nav-item ${path === m.path ? "selected" : ""}`}
              aria-current={path === m.path ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon" aria-hidden="true">
                {m.icon}
              </span>
              {m.name}
              {m.id === "connections" && <span className="nav-hint">PUNO</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          <span>
            Arequipa, Perú<small>Operación y ventas</small>
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir navegación"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              ☰
            </button>
            <span className="workspace-selector">
              ◫ <span>{current?.name ?? "Perú Andes"}</span>
            </span>
          </div>
          <div className="topbar-right">
            <span
              className="demo-badge"
              title="Demostración: los cambios se guardan. Utiliza datos ficticios."
            >
              Demo
            </span>
            <span className="location-label">Perú Andes / Arequipa</span>
            <span className="user-avatar">
              {access?.full_name
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("") ?? "PA"}
            </span>
            <div className="user-identity">
              <strong>{access?.full_name ?? "Perú Andes"}</strong>
              <small>
                {access
                  ? access.role === "superadmin"
                    ? "Superadministrador"
                    : "Ventas"
                  : "Configuración pendiente"}
              </small>
            </div>
            {access && (
              <form action={logout}>
                <FormSubmitButton
                  pendingLabel="Saliendo…"
                  className="icon-button"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                >
                  ↪
                </FormSubmitButton>
              </form>
            )}
          </div>
        </header>
        <main id="main-content" className="page-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          Perú Andes <span>Endosadores · Reservas · Liquidación</span>
        </footer>
      </div>
    </div>
  );
}
