# Perú Andes Management

## Stack

- Raíz: Next.js App Router, React, TypeScript y Tailwind CSS para gestión.
- `apps/site/`: Astro con integración React para sitio público estático. Compilación y despliegue independientes de Next.js.
- Supabase para PostgreSQL y Auth; React Hook Form con Zod y `@hookform/resolvers` para formularios.
- npm workspaces con un único `package-lock.json`; consultar manifiestos para versiones reales.
- Clientes Supabase en `src/lib/supabase/`. `src/proxy.ts` renueva sesiones, pero no autoriza rutas. Verificar identidad y permisos en cada operación privada y aplicar RLS.
- La conexión externa requiere `.env.local`. El esquema implementado está en `supabase/migrations/202610140001_core.sql`; no simular datos o tipos generados de una base remota sin comprobarla.

## Contexto funcional

La fuente de requisitos es `docs/especificacion-funcional.md`, proporcionada por el usuario, complementada por `docs/decisiones-confirmadas.md` para aclaraciones posteriores. Consultar `docs/plan-de-entregas.md` para el inventario inicial, secuencia y criterios de aceptación. Leer las secciones del negocio pertinentes antes de implementar; la sección 19 distingue decisiones pendientes de reglas confirmadas.

Roles confirmados: superadministrador gestiona vendedoras y revoca permisos; vendedoras acceden a los demás módulos, sin acceso a Vendedoras/Empleados ni gestión de roles o permisos. Comprobar estas restricciones en servidor y RLS, no solo ocultar navegación. El usuario confirmó un proyecto Supabase existente; configurará `.env.local`.

No crear aprobación obligatoria de reservas, tarifas universales, penalidades automáticas de NO SHOW ni políticas comerciales pendientes. Mantener separados reserva, operación, cuenta por cobrar y cuenta por pagar. Conservar precios históricos y trazabilidad; reutilizar los pasajeros originales en Operaciones y Finanzas, restringiendo datos de salud.

## Skills del proyecto

Adaptadas de TMB. Leer la que corresponda al cambio:

- `.agents/skills/peruandes-frontend-architecture/SKILL.md`: funcionalidades, límites Next.js/Astro, estado y formularios.
- `.agents/skills/peruandes-ui-design/SKILL.md`: componentes, tokens, responsive y accesibilidad.
- `.agents/skills/peruandes-backend-architecture/SKILL.md`: Supabase, datos, permisos y validación servidor.

## Reglas confirmadas de registro

Enlace exclusivo y revocable por intermediario; cargo del tour al registrar la reserva. Adicionales, cancelaciones y NO SHOW solo generan movimientos explícitos. Los adelantos se aplican manualmente a cargos seleccionados. No establecer responsables de Puno ni penalidades por defecto.

## Documentación y verificación

Usar Context7 para sintaxis, configuración, instalación, migración y depuración específicas de librerías, frameworks, SDKs, APIs, CLIs o servicios cloud. Resolver primero con `resolve-library-id`, salvo ID exacto proporcionado; consultar `query-docs` por concepto. No hace falta para refactorización, lógica de negocio, code review o conceptos generales.

Next.js: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Las pruebas ejecutan la migración y las reglas de negocio con PostgreSQL local. Astro: `npm run check:site`, `npm run build:site`. Ejecutar las comprobaciones de las aplicaciones modificadas. Compilar sin credenciales no demuestra autenticación o persistencia remotas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
