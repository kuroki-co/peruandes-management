# Estado y entregas de Perú Andes

Este plan aplica la [especificación funcional](especificacion-funcional.md) y las [aclaraciones confirmadas](decisiones-confirmadas.md) al repositorio actual. Las decisiones técnicas siguen `AGENTS.md` y las skills locales. Los estados corresponden a una revisión del código, no a validación de un sistema en producción.

## Estado actual

Se implementó el código de los módulos y la migración de PostgreSQL. No se ha aplicado la migración ni validado la conexión con el proyecto Supabase remoto: todavía se requiere configurar el entorno real y crear la primera cuenta.

| Área | Implementado localmente | Pendiente de puesta en marcha |
| --- | --- | --- |
| Base técnica | Next.js, Astro, TypeScript, npm workspaces y diseño inspirado en la referencia FCA | Despliegues y variables de entorno |
| Acceso | Login, cierre de sesión, superadministrador/vendedora, creación de cuentas y revocación de módulos | Supabase Auth real y primer superadministrador |
| Intermediarios | Directorio, tarifas versionadas, enlaces revocables e historial de reservas | Cargar acuerdos comerciales reales |
| Reservas | Formulario público/interno, grupos, adicionales y salud separados, precios históricos y correcciones trazables | Probar enlaces reales con intermediarios |
| Operaciones | Salidas editables, vehículos, guías/conductores, asignaciones con cupos, asistencia, manifiestos, alojamientos e importes para guías | Cargar recursos y confirmar formato operativo final |
| Conexiones y proveedores | Coordinación Puno sin responsable supuesto, endosos múltiples y obligaciones independientes | Responsables y acuerdos reales |
| Finanzas | Cargos al reservar, pagos, adelantos, ajustes, aplicaciones manuales, saldos y liquidaciones | Conciliación con registros del cliente |
| Datos y seguridad | Migración transaccional, RLS, RPCs con autorización, auditoría y protección ante reintentos | Aplicar migración y comprobar políticas en Supabase |
| Reportes | Búsqueda, filtros, ordenación, CSV e impresión; salud excluida de finanzas | Ajustar formatos adicionales requeridos por el cliente |

Las pruebas ejecutan PostgreSQL local mediante PGlite. Se comprobaron reservas atómicas, tarifas y adicionales históricos, roles/RLS, enlaces revocados, cupos, NO SHOW sin penalidad automática, pagos, adelantos, correcciones y endosos. También se probó la interfaz con un servidor local efímero: hotel con tarifa S/ 60, dos pasajeros, cargo S/ 120 y abono S/ 40, conservando S/ 80 pendientes. Estos datos son exclusivamente de prueba.

La generación de tipos desde el proyecto remoto y la validación de Supabase Auth siguen vinculadas a su puesta en marcha; el código no presenta archivos de tipos generados ficticios.

La referencia visual `https://rebranding-fca.vercel.app/` debe orientar el diseño futuro, conforme al encargo previo. El usuario pidió tenerla en mente y no realizar cambios de diseño en ese momento. No se considera aprobado copiar su marca, módulos, datos o permisos.

## Reglas que rigen todas las entregas

- Identificadores estables vinculan reservas, pasajeros, operación y movimientos financieros; los módulos reutilizan la información original.
- Hoteles y agencias se administran juntos como Intermediarios. Cada intermediario tiene tarifas propias por servicio.
- Conservar los importes aplicados en cada reserva y adicional. Cambiar un catálogo no actualiza reservas históricas; los ajustes explícitos conservan trazabilidad.
- Una reserva enviada correctamente se registra sin aprobación manual. Registro comercial, asignación operativa y situación financiera son conceptos separados.
- Admitir varios pasajeros por reserva y adicionales, requerimientos, conexiones y asistencia por persona.
- NO SHOW no equivale a cancelación y no genera una penalidad inventada.
- Cuentas por cobrar a intermediarios y cuentas por pagar a proveedores permanecen independientes. El importe facturado no es dinero recibido.
- No aplicar automáticamente pagos o adelantos con una política aún no definida, ni facturar adicionales cuyo responsable de pago no esté confirmado.
- Restringir datos de salud y evitar que aparezcan en reportes financieros. Definir permisos antes de exponer información privada.
- Los ejemplos de tarifas, endosos y conexiones no son tarifas oficiales ni valores por defecto.

## Entregas funcionales

### 1. Intermediarios y tarifas personalizadas

Crear y consultar hoteles/agencias, datos de contacto, estado y tarifas de Full Day, 2D TREK y 3D TREK. Identificar servicios por catálogo; no añadir una tarifa universal. Mantener historial de cambios de tarifas, evitando cambios unilaterales del intermediario.

Incluye la base de acceso necesaria: conexión al proyecto Supabase existente, usuarios iniciales, autorización en servidor y políticas RLS. Generar tipos desde el esquema efectivamente aplicado. Roles confirmados: superadministrador y vendedora. Solo el superadministrador gestiona vendedoras y revoca permisos; las vendedoras acceden a los demás módulos según sus permisos vigentes. Incluir Vendedoras/Empleados para administrar cuentas y permisos, sin acceso para vendedoras mediante UI ni API. No conceder permisos por el mero hecho de estar autenticado.

**Aceptación:** dos intermediarios conservan tarifas diferentes para el mismo servicio; un cambio autorizado queda trazado; un usuario sin permisos no puede leer ni cambiar datos mediante la API, aunque conozca la URL. Los ejemplos monetarios no se cargan como tarifas oficiales.

### 2. Formulario mediante enlace, reservas y pasajeros

Implementar identificación segura del intermediario, servicio, fecha y uno o varios pasajeros. Compartir valores comunes cuando corresponda conservando identidad y requerimientos por persona. Registrar adicionales identificables con cantidad y precio aplicado; separar observaciones, alimentación, alergias y condiciones comunicadas voluntariamente.

Registrar reserva, pasajeros y precios de forma atómica, obteniendo las tarifas en servidor. No aceptar del navegador un intermediario arbitrario ni importes manipulados. Mecanismo confirmado: enlace exclusivo revocable. Los reintentos se protegen mediante identificadores de solicitud; la política de reservas duplicadas intencionales sigue pendiente. Mostrar confirmación de registro, sin estados de aprobación.

Consultar y filtrar reservas por fecha de salida, servicio e intermediario. Permitir correcciones autorizadas y trazadas. Separar cancelación y asistencia/NO SHOW. Cambios comerciales relevantes requieren ajustes explícitos; la cuenta corriente no se actualiza con reglas no confirmadas.

**Aceptación:** un hotel envía dos pasajeros, ambos aparecen en Reservas y en la programación pendiente de asignación. Cada reserva conserva su tarifa histórica y sus adicionales. Un fallo no deja una reserva incompleta. Validar los escenarios 1, 2 y 3 de la especificación; el efecto financiero del escenario 3 requiere confirmar quién paga cada concepto.

### 3. Operaciones y asignación de movilidades

Consultar pasajeros desde las reservas originales y organizar salidas por fecha y servicio. Asignar movilidades, conductor y guía según capacidades conocidas. Mantener visibles los pasajeros todavía sin asignación y distinguir cupos disponibles de pasajeros asignados. No cancelar reservas por falta de movilidad.

Preparar manifiestos consultables e imprimibles por fecha y servicio; confirmar frecuencia y formato con el cliente. Controlar concurrencia de asignación para no superar capacidades. Registrar asistencia/NO SHOW sin borrar historial ni inventar montos para guías o ausencias.

**Aceptación:** distribuir un grupo entre vehículos conservando la reserva original; impedir asignaciones incompatibles o exceso de capacidad según las reglas acordadas; reflejar correcciones sin transcripción adicional. Validar escenarios 4 y 8, con tercerización del escenario 4 completada en la entrega 5.

### 4. Cuentas corrientes, pagos y liquidaciones

Registrar cargos facturables, ajustes, pagos parciales, adelantos y aplicaciones con historial. Conservar movimientos originales; aplicar correcciones trazables. Calcular saldos desde los movimientos, diferenciando deuda, pago y crédito disponible. Separar información financiera de datos sensibles de salud.

Reglas confirmadas: el tour es facturable al registrar la reserva; adicionales, cancelaciones y NO SHOW requieren movimientos explícitos; los adelantos se aplican manualmente a cargos seleccionados. Definir permisos financieros y operaciones atómicas para evitar aplicaciones duplicadas. La liquidación concilia un período; no impide pagos fuera del cierre mensual.

**Aceptación:** deuda de S/ 1,000 y abono de S/ 400 conservan ambos movimientos y muestran S/ 600 pendientes. Un adelanto conserva el crédito restante después de una aplicación autorizada y no puede consumirse dos veces. La liquidación reconcilia saldo anterior, cargos, ajustes y abonos. Validar escenarios 6, 7 y 10 con las políticas confirmadas.

### 5. Proveedores, endosos salientes y conexiones

Registrar proveedores y servicios tercerizados, importe acordado y pasajeros asociados sin alterar la reserva original. Permitir múltiples servicios derivados por pasajero. Generar obligaciones por pagar conforme al acuerdo confirmado, separadas de las cuentas por cobrar originales.

Conexiones a Puno con responsable de coordinación, proveedor cuando se conozca, punto, hora, observaciones y estado. Distinguir quién coordina de quién ejecuta; no asignar automáticamente destinatarios o tarifas. Los estados propuestos por el documento requieren validación antes de tratarlos como flujo definitivo.

**Aceptación:** una derivación conserva deuda del hotel y genera una obligación independiente cuando corresponda. Un pasajero con conexión se distingue de quienes regresan a Arequipa y conserva seguimiento de transferencia. Validar escenarios 5 y 9; completar la derivación del escenario 4.

### 6. Alojamientos, dashboard y reportes completos

Organizar necesidades de camas y habitaciones por pasajero, salida, noche y lugar según reglas confirmadas. No asumir capacidad, precio o asignación automática.

El dashboard se amplía progresivamente desde cada entrega con indicadores basados en datos reales. Diferenciar fecha de registro de reserva de fecha de salida, actividad operativa de finanzas y las vistas autorizadas por usuario. No simular ingresos o rentabilidad sin costos completos.

Completar reportes de reservas, intermediarios, operaciones, NO SHOW, conexiones, endosos, estados de cuenta y liquidaciones, con exportación/impresión cuando corresponda. Confirmar el formato del manifiesto actual antes de reproducirlo.

**Aceptación:** métricas, reportes y detalles concilian con sus datos de origen; sus filtros y permisos son consistentes; información de salud no se filtra hacia finanzas ni exportaciones no autorizadas.

## Decisiones pendientes y su impacto

La sección 19 de la especificación es el registro completo de pendientes. Esta tabla indica cuándo resolverlos; no establece una política provisional.

| Decisión | Necesaria para |
| --- | --- |
| Configurar conexión al proyecto Supabase existente y preparar usuarios iniciales; implementar los roles confirmados y permisos revocables | Persistencia y acceso de la entrega 1 |
| Edición por intermediarios, duplicados y reservas cuando no hay capacidad | Flujo de reservas y correcciones |
| Quién paga cada adicional y condición aplicable de boleto turístico | Cálculo facturable y políticas comerciales |
| Momento de facturabilidad, cancelaciones, adelantos y vencimientos | Automatización financiera de la entrega 4 |
| Penalidades de NO SHOW y responsables de pago | Cargos o ajustes por inasistencia |
| Responsables de asignación, criterio de cupos, manifiesto y montos para guías | Operaciones y reportes diarios |
| Ejecutor, cobro, costo y punto de conexión Puno | Seguimiento completo y movimientos asociados |
| Asignación, confirmación y capacidades de alojamiento | Organización de alojamientos |
| Significado y reglas de IDA C/D, IDA S/D y RETORNO | Incorporación operativa/comercial de otros tours |

## Comprobación por entrega

Ejecutar lint, tipos y compilación de las aplicaciones modificadas. Verificar comportamientos relevantes: precios históricos, atomicidad de reservas, capacidad concurrente, aplicaciones de pagos y aislamiento de datos. Para RLS, comprobar lecturas y mutaciones permitidas y denegadas con identidades distintas, incluidos intentos directos al backend.

No declarar completados escenarios con datos ficticios, persistencia local del navegador o conexiones no probadas. La comprobación de UI no sustituye la validación de negocio y permisos.
