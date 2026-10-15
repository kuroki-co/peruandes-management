# Perú Andes Management

Sistema de gestión turística con Next.js App Router, React, TypeScript, Tailwind CSS, Supabase, React Hook Form y Zod. El sitio público Astro vive en `apps/site/` y se compila por separado.

## Módulos

- Dashboard operativo y financiero, con datos de la fecha seleccionada y permisos del usuario.
- Intermediarios: hoteles/agencias, estado, tarifas versionadas, historial y enlaces exclusivos revocables.
- Reservas: grupos de pasajeros, precios históricos, adicionales, datos de salud separados, conexión Puno y correcciones comerciales trazables.
- Operaciones: movilidades, guías/conductores, salidas, asignación con cupos, asistencia, NO SHOW, alojamiento e importes comunicados para guías.
- Conexiones: coordinación y transferencia hacia Puno, sin asignar automáticamente un responsable desconocido.
- Proveedores: directorio y múltiples endosos salientes por pasajero, con obligaciones por pagar independientes.
- Finanzas: cargos del tour al reservar, abonos, adelantos, ajustes, créditos disponibles, aplicaciones manuales y liquidaciones por período.
- Configuración: servicios y adicionales, conservando los precios ya aplicados.
- Vendedoras: creación de cuentas, revocación de módulos/acceso e historial de cambios; exclusivo del superadministrador.

Los listados permiten búsqueda, ordenación, exportación CSV e impresión. El manifiesto incluye requerimientos sensibles únicamente cuando el usuario elige incluirlos. Finanzas no recibe los campos de salud.

## Puesta en marcha con Supabase

1. Copia `.env.example` a `.env.local` y completa la URL y clave publicable del proyecto existente.
2. Aplica el archivo `supabase/migrations/202610140001_core.sql` en el proyecto destino mediante el editor SQL de Supabase. La migración crea tablas, funciones, auditoría y RLS en una transacción. No está aplicada a ningún proyecto remoto por este trabajo.
3. Configura `SUPABASE_SECRET_KEY` en el servidor para crear cuentas del personal. Puede ser la clave secret o service_role del proyecto; nunca una variable `NEXT_PUBLIC_*`.
4. Para crear el primer superadministrador, define `BOOTSTRAP_ADMIN_PASSWORD` privadamente en la sesión de terminal (mínimo doce caracteres) y ejecuta:

```sh
npm run bootstrap:admin -- administrador@tu-dominio.com "Nombre del administrador"
```

El script crea una cuenta nueva, no envía correo y no reemplaza una cuenta Auth existente. Se detiene si ya hay un superadministrador activo. Retira `BOOTSTRAP_ADMIN_PASSWORD` del entorno después de usarlo.

5. Inicia Next.js e ingresa en `/login`. Desde Vendedoras, crea las cuentas de ventas y entrega sus credenciales por un canal privado.
6. Registra intermediarios y sus tarifas; crea y comparte el enlace correspondiente desde Intermediarios → Enlaces de reservas. El formulario está en `/reservar/<token>` y no requiere acceso al panel.

Las acciones privadas verifican sesión y permisos en servidor. Las funciones PostgreSQL repiten la autorización y las lecturas directas están protegidas por RLS. Las revocaciones se consultan desde la base de datos en cada operación. No dependen solo de ocultar la navegación.

Sin conexión, las pantallas se pueden revisar con una advertencia clara; guardado e inicio de sesión permanecen deshabilitados. No se reemplazan datos reales por muestras ni se simula un guardado correcto. Falta validar la conexión y Supabase Auth en tu entorno remoto.

## Reglas financieras implementadas

El cargo del tour se registra atómicamente junto con la reserva, con la tarifa del intermediario y cantidad de pasajeros. Los adicionales conservan precio y cantidad, pero solo generan un cargo mediante un movimiento explícito. Cancelaciones y NO SHOW no crean una penalidad ni un ajuste automático.

Una corrección comercial explícita conserva antes/después y motivo, y registra únicamente la diferencia de importe. Requiere acceso a Reservas y Finanzas. Para cambiar fecha o servicio de una reserva ya asignada, se retiran primero sus asignaciones operativas.

El saldo neto y los créditos disponibles son conceptos distintos. Registrar un adelanto no crea una aplicación automática: se eligen crédito, cargo e importe en Finanzas → Aplicaciones de créditos. Las aplicaciones están limitadas al saldo disponible y a la misma cuenta. El período de liquidación corresponde a la fecha de los movimientos; se incluyen saldo anterior, cargos, abonos, referencias y saldo final.

Los endosos salientes conservan la reserva original y crean una obligación independiente con el proveedor. Solo se consideran cobertura de movilidad si se marca explícitamente que cubren el transporte del tour. Los importes reportados para guías son registros operativos; no generan reglas de pago o penalidades no confirmadas.

## Desarrollo y comprobación

Requiere Node.js >=22.12.0 y npm. Desde la raíz:

```sh
npm install
npm run dev
```

Next.js: http://localhost:3000/dashboard. En otra terminal, `npm run dev:site` inicia Astro en http://localhost:4321. La URL pública del panel puede configurarse con `PUBLIC_MANAGEMENT_URL` en `apps/site/.env`; si falta, el sitio no muestra ese enlace.

```sh
npm run lint
npm run typecheck
npm test
npm run check:site
npm run build:all
```

Las pruebas ejecutan la migración en PostgreSQL mediante PGlite, con roles y contexto Auth locales. Cubren transacciones, RLS, precios históricos, cupos, pagos, adelantos, correcciones, conexiones y obligaciones independientes. No sustituyen la comprobación de Supabase Auth o configuración del proyecto remoto.

`tests/local-api.mjs` es un servidor de pruebas manual, limitado a loopback, con datos efímeros y autenticación simulada. Se utilizó para comprobar el flujo de la interfaz con PostgreSQL local; no debe desplegarse ni configurarse como backend del producto.

`npm run build` compila Next.js; `npm run build:site` genera `apps/site/dist/`. Ambas aplicaciones tienen despliegues independientes. npm workspaces conserva un único lockfile. El override de `@vitejs/plugin-react` 6.1.1 mantiene compatibilidad con `@astrojs/react` 7.0.1 y oxc 0.145; revisarlo al actualizar esas dependencias.

## Documentación y skills

Requisitos originales en `docs/especificacion-funcional.md`, aclaraciones posteriores en `docs/decisiones-confirmadas.md`, estado y entregas en `docs/plan-de-entregas.md`. `AGENTS.md` enlaza las tres skills locales adaptadas de TMB.

El diseño se inspira en la referencia FCA indicada: navegación lateral clara, fondo gris suave, paneles blancos, acentos azules y formularios por secciones. No se copiaron su marca, datos ni módulos.
