import { Suspense } from "react";
import { notFound } from "next/navigation";
import { modules } from "@/features/workspace/model";
import { loadWorkspace } from "@/features/workspace/data";
import { ModuleScreen } from "@/features/workspace/module-screen";
import { LoadingIndicator } from "@/components/ui/loading";
async function Content({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const targetModule = modules.find((m) => m.path === `/${section}`);
  if (!targetModule) notFound();
  const ctx = await loadWorkspace(targetModule.id);
  if (ctx.status === "denied")
    return (
      <section className="panel">
        <h1>Sin permiso para este módulo</h1>
        <p>El superadministrador puede revisar tus permisos.</p>
      </section>
    );
  if (ctx.status === "error")
    return (
      <section className="panel">
        <h1>No pudimos cargar la información</h1>
        <p>
          Revisa tu conexión y la migración de Supabase. Los datos no se
          reemplazaron por resultados vacíos.
        </p>
        <a href={targetModule.path} className="btn">
          Reintentar
        </a>
      </section>
    );
  return (
    <ModuleScreen
      key={targetModule.id}
      module={targetModule.id}
      data={ctx.status === "ready" ? ctx.data : {}}
      ready={ctx.status === "ready"}
      setupReason={ctx.status === "migration" ? "migration" : "credentials"}
    />
  );
}
export default function ModulePage(props: {
  params: Promise<{ section: string }>;
}) {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <Content {...props} />
    </Suspense>
  );
}
