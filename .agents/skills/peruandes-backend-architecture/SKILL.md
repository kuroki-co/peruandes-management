---
name: peruandes-backend-architecture
description: Implementar datos, validación, autenticación y autorización de Perú Andes con Supabase y servidor Next.js. Aplicar a persistencia, migraciones y RLS; no a diseño visual.
---

# Backend de Perú Andes

Adaptada de `tmb-backend-architecture`: conservar responsabilidades, transacciones, errores y seguridad sustituyendo NestJS/Sequelize/JWT propio por Supabase. No heredar notificaciones, PDFs o cronjobs de TMB sin requisitos concretos.

Respetar `AGENTS.md`, consultar Context7 y revisar versiones reales. La conexión externa y el esquema de negocio están pendientes hasta disponer de proyecto Supabase y requisitos.

## Responsabilidades y datos

Clientes SSR y navegador en `src/lib/supabase/`; operaciones específicas junto a su funcionalidad. Next.js puede coordinar operaciones privadas mediante Server Actions o Route Handlers. Mantener responsabilidades coherentes sin repositorios genéricos ni capas anticipadas. Astro es público y estático; no incluir secretos en páginas prerenderizadas o React.

- Versionar esquema y políticas mediante migraciones SQL al introducir tablas. Inspeccionar esquema existente antes de modificarlo.
- Usar restricciones PostgreSQL para unicidad, relaciones y valores válidos. Operaciones atómicas de varios pasos requieren una transacción real, por ejemplo una función PostgreSQL invocada por RPC; varias llamadas del SDK no son una transacción.
- Generar tipos desde el esquema real y usarlos en clientes Supabase. No editar tipos generados ni inventar tablas para resolver errores TypeScript.
- Validar entrada con Zod en el límite servidor y mapear solo campos autorizados.
- Comprobar `error` en cada consulta. Distinguir validación, permisos, conflicto y conectividad sin exponer detalles internos ni ocultar fallos como resultados vacíos.

## Auth, RLS y configuración

- Usar Supabase Auth y `@supabase/ssr`, creando el cliente servidor por petición y preservando cookies y cabeceras de renovación.
- `src/proxy.ts` renueva sesión; no autoriza operaciones. Verificar identidad con claims validados o API de usuario adecuada y comprobar permisos en cada operación privada. No confiar en sesiones sin verificar.
- Activar RLS y definir políticas explícitas para tablas expuestas. Aislar usuarios, organizaciones o roles según requisitos reales; ocultar controles UI no concede seguridad.
- Claves publicables pueden ir en `NEXT_PUBLIC_*`; claves secretas o `service_role` nunca. Clientes privilegiados omiten RLS y requieren autorización explícita en código servidor.
- Mantener `.env.local` fuera de Git y nombres sin valores privados en `.env.example`. No copiar credenciales de TMB.
- No cachear sesiones ni datos privados entre usuarios. Aplicar cabeceras de no-cache cuando se renueven cookies según integración SSR.

Verificar éxitos y denegaciones con identidades diferentes al cambiar políticas; rollback y conflictos para operaciones críticas. Compilar no demuestra Auth, RLS o persistencia remotas. No ejecutar migraciones externas sin conocer destino y alcance autorizado.
