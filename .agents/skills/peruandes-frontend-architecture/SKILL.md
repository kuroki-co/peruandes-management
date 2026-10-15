---
name: peruandes-frontend-architecture
description: Organizar funcionalidades de Perú Andes con Next.js, Astro, React y TypeScript; aplicar al decidir responsabilidades, servidor/cliente, estado o formularios. No usar para cambios exclusivamente visuales.
---

# Arquitectura frontend de Perú Andes

Adaptada de `tmb-frontend-architecture`. Priorizar Single Responsibility y Open/Closed mediante responsabilidades coherentes y composición. No imponer clases, capas genéricas o carpetas vacías. Respetar `AGENTS.md` y consultar Context7 para APIs específicas.

## Aplicaciones y dependencias

- Next.js vive en la raíz. Rutas en `src/app/` componen funcionalidades; componentes, esquemas y operaciones específicos en `src/features/<feature>/`.
- Primitivas reutilizables en `src/components/ui/` cuando exista una necesidad real. Infraestructura en `src/lib/`; clientes Supabase en `src/lib/supabase/`.
- Astro vive en `apps/site/`, con rutas en `src/pages/`. Usar `.astro` para contenido público y React con `client:*` para interacción necesaria. Su salida es estática: sesiones servidor requieren adapter y configuración explícitos.
- Configuraciones TypeScript independientes. No importar componentes dependientes de Next.js ni módulos servidor desde Astro. Crear paquetes compartidos solo con consumidores reales.
- npm workspaces y lockfile raíz. No heredar pnpm, NestJS o contratos OpenAPI de TMB; este proyecto utiliza Supabase.

## Servidor, cliente y estado

Antes de modificar Next.js, leer la guía instalada pertinente en `node_modules/next/dist/docs/`. Mantener Server Components por defecto y limitar `use client` a eventos, formularios y APIs navegador. Crear el cliente Supabase servidor por petición. Pasar props serializables y mantener secretos fuera de importaciones del cliente.

Estado local para interacción; URL para filtros y paginación compartibles; datos remotos pertenecen a Supabase. No instalar estado global por costumbre. Elegir caché e invalidación según frescura y privacidad. No compartir respuestas privadas ni cachear sesión en `use cache`. Con Cache Components, usar Suspense para datos de petición según documentación instalada.

## Formularios y contratos

Usar React Hook Form con `zodResolver`, esquemas junto a su funcionalidad y tipos inferidos. Distinguir `z.input` y `z.output` si hay transformaciones. Separar valores de formulario, datos persistidos y presentación cuando difieran.

Las operaciones específicas pertenecen a su funcionalidad; primitivas visuales no conocen tablas o transporte. El cliente navegador usa clave publicable bajo RLS. Server Actions o Route Handlers validan entrada y permisos antes de mutar; validación de navegador no sustituye controles servidor ni restricciones PostgreSQL.

Generar tipos desde el esquema Supabase real cuando exista; no inventar tipos generados ni usar `any` para simularlos. Comprobar errores de consultas y no convertir fallos en arrays vacíos. Evitar reintentos de mutaciones sin considerar idempotencia.

Verificar comportamiento afectado y comprobaciones de la aplicación modificada. Consultar `peruandes-ui-design` para UI y `peruandes-backend-architecture` para persistencia o permisos.
