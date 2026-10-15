import { LoginForm } from "@/features/auth/components/login-form";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-intro">
        <span className="eyebrow">PERÚ ANDES · AREQUIPA</span>
        <span className="demo-badge demo-badge-light">
          DEMO · PRESENTACIÓN AL CLIENTE
        </span>
        <h1>
          Cada viaje empieza
          <br />
          con una buena operación.
        </h1>
        <p>
          Reservas, pasajeros y cuentas conectados.
          <br />
          Un solo espacio para tu equipo.
        </p>
        <ol className="login-features">
          <li>
            <span>01</span> Recibe reservas de hoteles y agencias
          </li>
          <li>
            <span>02</span> Organiza pasajeros, salidas y conexiones
          </li>
          <li>
            <span>03</span> Consulta cobros, pagos y saldos
          </li>
        </ol>
        <div className="mountain-lines" aria-hidden="true">
          △ △ △
        </div>
      </div>
      <section className="login-card">
        <span className="eyebrow">EXPLORA EL SISTEMA</span>
        <h2>Bienvenida a Perú Andes</h2>
        <p className="muted">
          Ingresa con la cuenta asignada para recorrer la demostración.
        </p>
        <div className="demo-notice">
          <strong>Versión de demostración</strong>
          <p>
            Los cambios se guardan en la base conectada. Utiliza datos ficticios
            durante las pruebas.
          </p>
        </div>
        <LoginForm configured={Boolean(getSupabaseEnv())} />
      </section>
    </main>
  );
}
