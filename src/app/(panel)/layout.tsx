import Link from "next/link";
import { Suspense } from "react";
import { session } from "@/features/workspace/data";
import { Shell } from "@/features/workspace/shell";
import { LoadingIndicator } from "@/components/ui/loading";
async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const ctx = await session();
  if (ctx.status === "denied")
    return (
      <main className="standalone-card">
        <h1>Acceso no habilitado</h1>
        <p>
          Tu cuenta está inactiva o no tiene un perfil de Perú Andes. Solicita
          acceso al superadministrador.
        </p>
        <Link href="/login">Volver al acceso</Link>
      </main>
    );
  return (
    <Shell access={ctx.status === "ready" ? ctx.access : null}>
      {children}
    </Shell>
  );
}
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <LoadingIndicator label="Cargando tu espacio de trabajo…" fullscreen />
      }
    >
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
