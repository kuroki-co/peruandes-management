"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h1>No pudimos abrir este módulo</h1>
      <p>
        Verifica la conexión y vuelve a intentarlo. Tus datos guardados se
        conservan.
      </p>
      <button className="btn primary" onClick={reset}>
        Reintentar
      </button>
    </section>
  );
}
