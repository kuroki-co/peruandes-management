import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { BookingForm } from "@/features/workspace/booking-form";
import { bookingTokenFromCode } from "@/features/workspace/booking-link";
import { LoadingIndicator } from "@/components/ui/loading";
export const metadata = {
  title: "Reservas | Perú Andes",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
const contextSchema = z.object({
  intermediary: z.string(),
  services: z.array(z.record(z.string(), z.unknown())),
  extras: z.array(z.record(z.string(), z.unknown())),
});
async function PublicForm({
  params,
}: {
  params: Promise<{ token: string; code?: string }>;
}) {
  await connection();
  const route = await params;
  const token = route.code ? bookingTokenFromCode(route.code) : route.token;
  if (!token || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(token)) notFound();
  const env = getSupabaseEnv();
  if (!env)
    return (
      <div className="panel">
        <h1>Reservas temporalmente no disponibles</h1>
        <p>
          Contacta con Perú Andes para confirmar la habilitación del formulario.
        </p>
      </div>
    );
  const db = createClient(env.url, env.publishableKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("booking_context", { p_token: token });
  if (error)
    return (
      <div className="panel">
        <h1>Este enlace no está disponible</h1>
        <p>
          Puede haber sido revocado. Solicita un enlace vigente a Perú Andes.
        </p>
      </div>
    );
  const parsed = contextSchema.safeParse(data);
  if (!parsed.success) throw new Error("Respuesta de reservas inválida.");
  return (
    <>
      <header className="public-heading">
        <span className="eyebrow">PERÚ ANDES · RESERVAS</span>
        <h1>Organizamos el próximo viaje.</h1>
        <p>
          Registra a tus pasajeros. La información llega directamente a nuestro
          equipo.
        </p>
      </header>
      <section className="panel public-form">
        <BookingForm
          token={token}
          intermediaryName={parsed.data.intermediary}
          services={parsed.data.services}
          extras={parsed.data.extras}
          intermediaries={[]}
          ready
        />
      </section>
    </>
  );
}
export default function PublicBookingPage(props: {
  params: Promise<{ token: string; code?: string }>;
}) {
  return (
    <main className="public-booking">
      <Suspense
        fallback={
          <LoadingIndicator
            label="Cargando formulario de reserva…"
            fullscreen
          />
        }
      >
        <PublicForm {...props} />
      </Suspense>
    </main>
  );
}
