"use client";
import { useState } from "react";
export type Cell = string | number;
export type TableRow = { id: string; cells: Cell[]; action?: React.ReactNode };
export function DataTable({
  headers,
  rows,
  exportName,
  empty = "Todavía no hay registros.",
  searchable = true,
  emptyDescription = "Crea el primer registro para comenzar.",
  emptyAction,
}: {
  headers: string[];
  rows: TableRow[];
  exportName: string;
  empty?: string;
  searchable?: boolean;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const [sort, setSort] = useState<{ index: number; asc: boolean } | null>(
    null,
  );
  const visible = rows
    .filter((r) => normalize(r.cells.join(" ")).includes(normalize(query)))
    .sort((a, b) => {
      if (!sort) return 0;
      const x = a.cells[sort.index],
        y = b.cells[sort.index];
      const n =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "es", { numeric: true });
      return sort.asc ? n : -n;
    });
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const hasActions = rows.some((r) => r.action);
  function exportCsv() {
    const clean = (v: Cell) => {
      let s = String(v);
      if (/^\s*[=+@\-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const content =
      "\uFEFF" +
      [
        headers.map(clean).join(","),
        ...visible.map((r) => r.cells.map(clean).join(",")),
      ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="table-section">
      <div className="table-toolbar no-print">
        {searchable && (
          <div className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Buscar en el listado"
              placeholder="Buscar en el listado…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
        )}
        <span className="result-count" role="status">
          {visible.length} {visible.length === 1 ? "registro" : "registros"}
          {query && ` de ${rows.length}`}
        </span>
        <button
          className="btn"
          title="Exportar todos los registros que coinciden con la búsqueda"
          onClick={exportCsv}
          disabled={!visible.length}
        >
          ↓ Exportar CSV
        </button>
        <button
          className="btn"
          disabled={!visible.length}
          onClick={() => window.print()}
        >
          Imprimir
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  aria-sort={
                    sort?.index === i
                      ? sort.asc
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    aria-label={`Ordenar por ${h}`}
                    onClick={() => {
                      setPage(0);
                      setSort({
                        index: i,
                        asc: sort?.index === i ? !sort.asc : true,
                      });
                    }}
                  >
                    {h}
                    <span aria-hidden="true">
                      {" "}
                      {sort?.index === i ? (sort.asc ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              ))}
              {hasActions && (
                <th className="no-print" scope="col">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={
                  rowIndex < currentPage * pageSize ||
                  rowIndex >= (currentPage + 1) * pageSize
                    ? "pagination-hidden"
                    : undefined
                }
              >
                {row.cells.map((cell, i) => (
                  <td key={i}>
                    {typeof cell === "string" &&
                    [
                      "Activo",
                      "Activa",
                      "Registrada",
                      "Programado",
                      "Asistió",
                      "Coordinada",
                      "Completada",
                      "Transferido",
                      "Al día",
                      "Pendiente",
                      "Por confirmar",
                      "Saldo a favor",
                      "Inactivo",
                      "Inactiva",
                      "Revocado",
                      "Cancelada",
                      "Cancelado",
                      "Incidencia",
                      "NO SHOW",
                    ].includes(cell) ? (
                      <span
                        className={`status-badge ${["NO SHOW", "Revocado", "Incidencia", "Cancelada", "Cancelado"].includes(cell) ? "status-danger" : ["Pendiente", "Por confirmar"].includes(cell) ? "status-warning" : ["Inactivo", "Inactiva"].includes(cell) ? "status-neutral" : "status-success"}`}
                      >
                        {cell}
                      </span>
                    ) : cell === "" ? (
                      "—"
                    ) : (
                      cell
                    )}
                  </td>
                ))}
                {hasActions && (
                  <td className="row-actions no-print">{row.action}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty-state">
            <span className="empty-symbol" aria-hidden="true">
              ▤
            </span>
            <h3>{query ? "No encontramos coincidencias" : empty}</h3>
            <p>
              {query
                ? "Prueba con otro nombre, fecha o servicio."
                : emptyDescription}
            </p>
            {query && (
              <button className="btn" onClick={() => setQuery("")}>
                Limpiar búsqueda
              </button>
            )}
            {!query && emptyAction}
          </div>
        )}
      </div>
      {visible.length > pageSize && (
        <nav
          className="table-pagination no-print"
          aria-label="Páginas del listado"
        >
          <span>
            {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, visible.length)} de{" "}
            {visible.length} · Exportar e imprimir incluye todos los resultados
          </span>
          <div className="form-actions">
            <button
              className="btn"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </button>
            <span aria-live="polite">
              {currentPage + 1} / {pages}
            </span>
            <button
              className="btn"
              disabled={currentPage === pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
