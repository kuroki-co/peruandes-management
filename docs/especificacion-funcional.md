# PROYECTO PERÚ ANDES — SISTEMA INTEGRAL DE GESTIÓN TURÍSTICA

## 1. Objetivo del proyecto

Desarrollar un sistema a medida para **Perú Andes**, una agencia operadora de turismo en Arequipa, Perú, que ofrece principalmente excursiones y trekkings al Cañón del Colca.

El sistema debe centralizar y optimizar los siguientes procesos:

- Recepción de reservas provenientes de hoteles y agencias.
- Registro y gestión de pasajeros.
- Administración de tarifas personalizadas por intermediario.
- Registro de servicios adicionales.
- Programación de tours y salidas.
- Asignación de movilidades, conductores y guías.
- Gestión de conexiones hacia Puno.
- Derivación de pasajeros a operadores externos.
- Organización de alojamientos para trekkings.
- Control financiero de cuentas por cobrar y por pagar.
- Registro de pagos parciales y adelantos.
- Generación de manifiestos operativos y reportes.

**El objetivo central es eliminar la transcripción manual de reservas y evitar que la misma información tenga que registrarse varias veces.**

La información ingresada originalmente debe alimentar automáticamente las diferentes áreas del sistema.

Este documento describe las reglas funcionales del negocio. No impone tecnologías ni decisiones de arquitectura técnica. Para esas decisiones se deben respetar las skills, instrucciones y convenciones existentes en el repositorio.

---

## 2. Contexto del negocio

Perú Andes trabaja principalmente con hoteles y agencias de viajes que venden servicios turísticos a sus clientes.

Estos intermediarios venden los tours y posteriormente los **endosan** a Perú Andes para que esta se encargue de realizar el servicio.

Ejemplo:

1. Un hotel ofrece un Full Day al Cañón del Colca a un pasajero.
2. El pasajero paga el tour al hotel.
3. El hotel registra la reserva con Perú Andes.
4. Perú Andes se encarga de realizar el servicio turístico.
5. El hotel queda debiendo a Perú Andes la tarifa previamente acordada.
6. El hotel realiza pagos a Perú Andes según su acuerdo comercial.

**Regla fundamental: Perú Andes no recibe directamente el dinero que pagan los pasajeros por la venta del tour. El intermediario realiza el cobro al cliente final y posteriormente paga a Perú Andes.**

El precio que cobra el hotel al pasajero no es necesariamente el precio que corresponde cobrar a Perú Andes.

No debe suponerse que existe una distribución fija de comisiones, como 50/50.

Cada intermediario tiene sus propios acuerdos comerciales.

---

## 3. Actores del sistema

### 3.1. Perú Andes

Agencia operadora encargada de:

- Administrar los intermediarios.
- Definir las tarifas acordadas.
- Recibir automáticamente las reservas.
- Supervisar las reservas registradas.
- Organizar las salidas turísticas.
- Distribuir pasajeros entre movilidades.
- Coordinar conductores, guías y proveedores.
- Gestionar solicitudes especiales.
- Controlar las deudas de hoteles y agencias.
- Registrar pagos, adelantos y gastos operativos.

### 3.2. Hotel intermediario

Establecimiento que vende un servicio turístico y endosa la reserva a Perú Andes.

Es responsable de ingresar la información correspondiente mediante el formulario de reservas.

### 3.3. Agencia intermediaria

Otra agencia de viajes que vende tours a sus clientes y los endosa a Perú Andes.

A nivel comercial cumple una función equivalente a la de los hoteles intermediarios.

### 3.4. Pasajero

Persona que realiza el servicio turístico.

Puede tener información personal, requerimientos especiales, servicios adicionales, condiciones de recojo y conexiones de transporte.

### 3.5. Proveedor externo

Empresa o persona que presta servicios a Perú Andes.

Ejemplo: Baby Llama, una empresa a la que Perú Andes puede derivar pasajeros cuando necesita cubrir una operación.

### 3.6. Personal de Perú Andes

Incluye personal administrativo, vendedores, responsables de operaciones, guías y otros trabajadores.

Las funciones y permisos específicos de cada rol deberán definirse sin asumir que todos necesitan acceso a información financiera o sensible.

---

## 4. Servicios turísticos

Perú Andes ofrece tres servicios principales:

| Servicio | Duración |
|---|---|
| Full Day | 1 día |
| 2D TREK | 2 días y 1 noche |
| 3D TREK | 3 días y 2 noches |

Además, el formato operativo actual incluye una sección denominada **OTROS TOURS**.

En ella aparecen conceptos como:

- IDA C/D.
- IDA S/D.
- RETORNO.

El significado exacto y las reglas comerciales de estos servicios adicionales todavía deben confirmarse.

No deben descartarse, pero tampoco deben inventarse sus características o tarifas.

---

## 5. Módulo: Intermediarios

Debe existir un módulo denominado **Intermediarios**, que agrupe hoteles y agencias de viajes.

No es necesario dividirlos en módulos independientes, ya que cumplen el mismo papel comercial.

### Información del intermediario

Cada registro debe contemplar:

- Nombre comercial.
- Tipo: Hotel o Agencia.
- Contacto principal.
- Número telefónico.
- Estado: activo o inactivo.
- Tarifas personalizadas de los servicios.
- Historial de reservas.
- Movimientos financieros.
- Saldo pendiente o a favor.

Los datos complementarios de identificación comercial podrán definirse según las necesidades del cliente.

### Tarifas personalizadas

**Cada intermediario tiene una tarifa diferente para cada servicio turístico.**

Ejemplo ilustrativo:

| Intermediario | Full Day | 2D TREK | 3D TREK |
|---|---:|---:|---:|
| Hotel A | S/ 60 | S/ 150 | S/ 250 |
| Hotel B | S/ 50 | S/ 130 | S/ 230 |
| Agencia C | S/ 55 | S/ 140 | S/ 240 |

Estos importes son ejemplos, no tarifas oficiales del negocio.

Reglas obligatorias:

1. Cada intermediario tiene sus propias tarifas.
2. No existe una tarifa única universal que deba aplicarse a todos.
3. Las tarifas pueden modificarse cuando cambien los acuerdos comerciales.
4. Las reservas previamente registradas deben conservar los importes acordados originalmente, salvo ajustes explícitos autorizados.
5. Al registrar una reserva, el sistema debe identificar la tarifa correspondiente al intermediario y al servicio seleccionado.
6. Los intermediarios no deben poder modificar sus tarifas unilateralmente.

---

## 6. Formulario de reservas mediante enlace

Actualmente, las reservas se envían por WhatsApp y el personal de Perú Andes transcribe la información.

**El nuevo sistema reemplazará ese proceso mediante un formulario accesible desde un enlace que Perú Andes enviará a los hoteles y agencias.**

### Funcionamiento

1. Perú Andes proporciona un enlace al intermediario.
2. El hotel o agencia abre el formulario.
3. Selecciona el servicio turístico.
4. Ingresa la fecha correspondiente.
5. Registra uno o varios pasajeros.
6. Completa los datos y requerimientos de cada pasajero.
7. Envía la reserva.
8. El sistema registra automáticamente la información.
9. La reserva aparece en el panel de Perú Andes.

### Regla importante

**Perú Andes NO aprueba manualmente las reservas.**

Una reserva enviada correctamente se registra directamente en el sistema.

No debe crearse un flujo obligatorio de aprobación o rechazo por parte de una vendedora.

Es válido que el personal revise, modifique o gestione posteriormente una reserva, pero esto es distinto de aprobarla.

El formulario debe identificar al intermediario que está registrando la reserva. Se propone facilitar enlaces asociados a cada intermediario, aunque el mecanismo exacto de identificación y acceso está pendiente de definición.

### Datos del pasajero

El formulario debe permitir registrar:

- Nombre completo.
- Número telefónico nacional o internacional.
- Hotel o lugar de recojo.
- Servicio contratado.
- Fecha de salida.
- Servicios adicionales.
- Observaciones generales.
- Requerimientos alimentarios.
- Información relevante de alergias o medicación, cuando corresponda.
- Solicitud de conexión a Puno.
- Información complementaria necesaria para la operación.

Debe contemplarse que una reserva pueda contener varios pasajeros.

Los pasajeros pueden compartir información, como hotel de recojo o fecha, pero cada persona debe conservar su propia identidad y sus requerimientos individuales.

### Condiciones especiales

Las alergias, medicaciones y requerimientos alimentarios no deben depender exclusivamente de un campo de observaciones generales.

Se deben diferenciar:

- Observaciones generales.
- Requerimientos alimentarios, por ejemplo vegetarianismo.
- Alergias relevantes para el servicio.
- Medicaciones o condiciones comunicadas voluntariamente que sean importantes para la seguridad durante el tour.

Los datos de salud deben tratarse como información sensible: solicitar únicamente lo necesario, restringir su acceso y evitar exponerlos en reportes financieros o vistas no autorizadas.

---

## 7. Catálogo de servicios adicionales

Perú Andes maneja servicios y conceptos adicionales a los tours.

Actualmente se identificaron los siguientes:

| Servicio adicional | Precio |
|---|---:|
| Par de bastones | S/ 20 |
| Baño privado para pasajero | S/ 20 |
| Boleto turístico para extranjeros | S/ 70 |
| Boleto turístico para latinoamericanos | S/ 40 |
| Boleto turístico para estudiantes extranjeros menores de 16 años | S/ 20 |
| Aguas termales | S/ 15 |
| Almuerzo buffet | S/ 50 |

Estos precios son los valores comunicados actualmente y deben poder actualizarse.

### Reglas

- Los adicionales deben manejarse como conceptos identificables, no exclusivamente como observaciones de texto.
- Cada pasajero puede tener varios adicionales.
- Debe poder registrarse la cantidad cuando corresponda, por ejemplo, número de pares de bastones.
- Cada adicional tiene su precio correspondiente.
- Los importes deben poder calcularse automáticamente.
- Los precios aplicados a reservas anteriores deben conservarse para fines históricos.
- Los adicionales deben aparecer en los detalles de reserva y en las listas operativas cuando sean relevantes.

### Consideración financiera pendiente

Todavía no se ha confirmado exactamente quién asume el pago de cada adicional.

No debe suponerse que todos son pagados por el hotel ni que todos son ingresos netos de Perú Andes.

El sistema debe distinguir los conceptos facturables al intermediario de otros cargos o gastos, conforme se definan las reglas comerciales.

---

## 8. Módulo: Reservas

Este módulo centraliza toda la información registrada por los intermediarios.

Cada reserva debe permitir identificar:

- Intermediario de origen.
- Fecha de registro.
- Fecha de salida.
- Servicio contratado.
- Pasajero o grupo de pasajeros.
- Lugar de recojo.
- Tarifa aplicada.
- Adicionales.
- Importe correspondiente.
- Observaciones y solicitudes especiales.
- Situación operativa de cada pasajero.

### Reglas funcionales

1. Las reservas se generan automáticamente desde el formulario.
2. No requieren aprobación manual.
3. Deben poder consultarse y filtrarse por fecha, servicio e intermediario.
4. Deben permitir correcciones controladas.
5. Debe conservarse la trazabilidad de cambios relevantes, especialmente importes.
6. Deben contemplarse cancelaciones.
7. Deben identificarse los pasajeros que no se presenten.
8. Una reserva puede incluir varios pasajeros.
9. Las modificaciones comerciales no deben alterar retroactivamente las tarifas históricas sin un ajuste explícito.
10. La información debe reutilizarse en Operaciones y Finanzas sin exigir una segunda transcripción.

### NO SHOW

En el documento actual de Perú Andes existe el estado **NO SHOW**.

Este estado identifica a un pasajero que no se presenta al servicio.

También aparece un control denominado «Monto de dinero por NO SHOWS».

Se conoce que podría existir una penalidad, pero no se ha confirmado su importe ni sus condiciones.

Por tanto:

- Debe poder registrarse un NO SHOW.
- Debe distinguirse de una cancelación.
- No debe inventarse una penalidad automática.
- El efecto financiero dependerá de las políticas que se confirmen posteriormente.

---

## 9. Módulo: Operaciones

Este módulo estará dedicado a la organización diaria de los servicios turísticos.

El formato actual de Perú Andes organiza la información en secciones:

- FULL DAY.
- 2D TREK.
- 3D TREK.
- OTROS TOURS.

Se trabajará inicialmente con la hipótesis de que Perú Andes utiliza un manifiesto por día, agrupando las salidas correspondientes a cada servicio.

Esta frecuencia debe confirmarse con el cliente.

### Listado operativo de pasajeros

El personal debe poder visualizar:

- Fecha de salida.
- Servicio turístico.
- Nombre del pasajero.
- Número de contacto.
- Intermediario de procedencia.
- Hotel o lugar de recojo.
- Movilidad asignada.
- Conductor.
- Guía.
- Adicionales relevantes.
- Observaciones operativas.
- Conexiones a Puno.
- Requerimientos especiales autorizados.
- Estado de asistencia.

El objetivo es disponer de una lista organizada de pasajeros sin volver a introducir la información registrada por el hotel.

### Asignación de movilidades

Perú Andes necesita distribuir pasajeros entre vehículos propios y operadores externos.

Cada asignación debe permitir conocer:

- Servicio.
- Fecha.
- Vehículo o movilidad.
- Capacidad disponible.
- Pasajeros asignados.
- Conductor, cuando corresponda.
- Guía responsable.
- Operador encargado.
- Estado de la operación.

Debe poder distinguirse entre pasajeros asignados y cupos disponibles.

Una reserva ya registrada no debe desaparecer ni quedar anulada automáticamente solo porque todavía no tenga una movilidad asignada.

### Manifiestos

Se necesita poder consultar un manifiesto operativo por fecha y servicio.

El manifiesto debe reunir los pasajeros y la información necesaria para ejecutar el tour.

Es conveniente permitir su exportación o impresión, tomando como referencia el formato actual de Perú Andes.

---

## 10. Gestión de guías

El formato de reservas actual incluye los campos:

- Nombre del guía.
- Número de pasajeros.
- Monto de dinero para guía.
- Monto de dinero por NO SHOWS.

Por tanto, Operaciones debe contemplar la relación entre salidas y guías.

También debe permitir controlar los importes asignados al guía cuando correspondan.

Todavía se deben confirmar las reglas financieras y operativas asociadas a esos montos.

No deben inventarse tarifas de guías ni reglas de pago.

---

## 11. Endosos salientes y proveedores externos

Es fundamental diferenciar dos tipos de endoso.

### A. Endoso entrante

Un hotel o agencia endosa pasajeros a Perú Andes.

Ejemplo:

Hotel A → Perú Andes.

Esto representa una reserva operada por Perú Andes y un importe que corresponde cobrar al intermediario.

### B. Endoso saliente

Perú Andes puede derivar pasajeros a otra empresa para que esta realice determinado servicio.

Ejemplo:

Perú Andes → Baby Llama.

Este proceso ocurre, entre otras situaciones, cuando una movilidad de Perú Andes no tiene capacidad suficiente.

### Ejemplo

Se tienen 20 pasajeros para una salida.

Perú Andes puede transportar a 15.

Los cinco restantes son derivados a Baby Llama.

El sistema debe permitir:

- Mantener las reservas originales de los 20 pasajeros.
- Identificar cuáles serán operados por Perú Andes.
- Identificar cuáles serán derivados a Baby Llama.
- Registrar el proveedor responsable.
- Registrar el concepto del servicio tercerizado.
- Registrar el importe acordado con el proveedor.
- Controlar la cuenta por pagar correspondiente.
- Mantener el historial de la derivación.

En el formato actual aparecen endosos a Baby Llama con montos de S/ 41 por registro, pero esto no significa que S/ 41 sea una tarifa universal.

El importe debe depender del acuerdo o servicio correspondiente.

### Múltiples derivaciones

El formato actual contempla más de un bloque de «Endosado a», «Monto de endose» y «Notas».

El sistema no debe asumir que un pasajero únicamente puede tener una derivación externa.

Debe poder distinguir diferentes servicios tercerizados asociados a la misma operación cuando corresponda.

---

## 12. Conexiones a Puno

Este es uno de los procesos operativos más importantes.

Algunos pasajeros realizan el tour al Colca, pero **no regresan a Arequipa**.

En su lugar, continúan su viaje hacia Puno desde Chivay o desde el punto de conexión que corresponda.

A esto lo denominan **CONEXIÓN PUNO**.

### Situaciones identificadas

**Escenario A: conexión coordinada por Perú Andes.**

Perú Andes se encarga de coordinar la continuación del viaje mediante el responsable u operador correspondiente.

**Escenario B: conexión coordinada por el hotel o agencia.**

El intermediario ya tiene una persona o empresa encargada de recoger al pasajero para continuar el viaje hacia Puno.

**Escenario C: conexión a cargo de un tercero.**

Se conoce que puede existir un responsable local o proveedor externo, pero todavía no se ha identificado exactamente quién presta el servicio ni cómo funciona el acuerdo comercial.

### Información que se debe contemplar

- Pasajero asociado.
- Tour contratado.
- Fecha del servicio.
- Destino de conexión.
- Responsable de coordinación.
- Proveedor o persona encargada, cuando se conozca.
- Punto de transferencia.
- Hora acordada, cuando exista.
- Observaciones de la coordinación.
- Estado de la conexión.
- Importes comerciales o costos asociados, cuando correspondan.

### Estados operativos propuestos

- Pendiente de coordinación.
- Coordinada.
- Pasajero transferido.
- Completada.
- Incidencia.

Estos estados son una propuesta funcional y pueden ajustarse con el cliente.

### Consideraciones importantes

- El pasajero con conexión a Puno no debe tratarse como un pasajero que regresará normalmente a Arequipa.
- La conexión debe ser visible para los responsables de Operaciones.
- El sistema debe evitar que la información se pierda entre observaciones generales.
- No se debe asumir automáticamente quién realiza la conexión.
- No se deben inventar tarifas ni destinatarios de pagos.

En el documento actual existen registros que suman S/ 120 por conexión a Puno y otros con un monto de endose de S/ 80.

Estos importes sirven como evidencia de que la conexión puede tener movimientos financieros, pero todavía es necesario confirmar sus reglas y destinatarios.

---

## 13. Alojamiento para trekkings

En los servicios 2D TREK y 3D TREK existen necesidades de alojamiento.

El formato operativo actual menciona lugares como:

- OASIS.
- SAN JUAN.

También registra categorías como:

- Camas compartidas.
- Habitaciones simples con baño.
- Habitaciones matrimoniales o dobles con baño.
- Habitaciones triples con baño.

El sistema debe contemplar la posibilidad de organizar estos requerimientos por salida.

### Objetivos

- Identificar los pasajeros que necesitarán alojamiento.
- Registrar el lugar correspondiente.
- Controlar las cantidades de camas y habitaciones requeridas.
- Diferenciar los tipos de habitación.
- Consultar las necesidades de alojamiento por tour y fecha.
- Facilitar la coordinación del personal operativo.

No se deben asumir políticas de asignación, precios, reservas de alojamiento ni capacidades que todavía no se hayan confirmado.

---

## 14. Módulo: Finanzas

Este módulo es fundamental para Perú Andes.

**Perú Andes no cobra directamente al pasajero por el tour vendido por el intermediario.**

Los hoteles y agencias reciben el pago y posteriormente transfieren a Perú Andes los importes que les corresponden.

### 14.1. Cuentas por cobrar

Cada intermediario debe disponer de una cuenta corriente.

Esta cuenta refleja:

- Importes por servicios endosados.
- Adicionales facturables al intermediario.
- Ajustes autorizados.
- Pagos recibidos.
- Adelantos.
- Saldos pendientes.
- Saldos a favor.

### Ejemplo

Un hotel tiene las siguientes operaciones:

| Concepto | Importe |
|---|---:|
| 10 Full Day × S/ 60 | S/ 600 |
| 4 2D TREK × S/ 150 | S/ 600 |
| 2 3D TREK × S/ 250 | S/ 500 |
| Total de cargos | S/ 1,700 |
| Pago realizado | S/ 1,000 |
| Saldo pendiente | S/ 700 |

Los montos son ilustrativos.

El sistema debe calcular automáticamente la deuda del intermediario utilizando las tarifas efectivamente aplicadas a sus reservas y los ajustes que correspondan.

### 14.2. Pagos parciales

No todos los intermediarios pagan exclusivamente a fin de mes.

Pueden realizar abonos en distintos momentos.

Ejemplo:

Hotel A tiene una deuda de S/ 1,700.

Realiza:

- Primer abono: S/ 500.
- Segundo abono: S/ 400.
- Tercer abono: S/ 300.

Total abonado: S/ 1,200.

Saldo pendiente: S/ 500.

Cada pago debe conservar su información y formar parte del historial financiero del intermediario.

### 14.3. Adelantos

Un hotel también puede adelantar dinero a Perú Andes.

Ejemplo:

Hotel B entrega S/ 500 por adelantado.

Posteriormente registra reservas por S/ 300.

El hotel conserva S/ 200 a favor, siempre que ese adelanto esté disponible para aplicarse a esas reservas.

El sistema debe distinguir claramente entre:

- Dinero adeudado.
- Pagos realizados.
- Adelantos disponibles.
- Saldo a favor.

Los pagos no deben perderse ni reemplazarse al registrar nuevos servicios.

### 14.4. Liquidaciones

Debe poder generarse una liquidación por intermediario y período.

Por ejemplo:

**Liquidación — Hotel Colca — Octubre 2026.**

El documento debe mostrar:

- Reservas correspondientes.
- Fechas.
- Pasajeros.
- Servicios realizados o facturables.
- Tarifas aplicadas.
- Adicionales facturables.
- Ajustes.
- Cargos del período.
- Abonos y adelantos aplicados.
- Saldo anterior, cuando exista.
- Saldo final.

Los intermediarios pueden pagar antes o después del cierre mensual.

La liquidación es un mecanismo de consulta y conciliación; no debe impedir registrar pagos en cualquier momento.

### 14.5. Cuentas por pagar

Perú Andes también tiene obligaciones hacia proveedores externos.

Ejemplos:

- Baby Llama por servicios tercerizados.
- Operadores de conexiones a Puno, cuando corresponda.
- Otros proveedores o responsables de servicios turísticos.

Las cuentas por pagar deben mantenerse separadas de las cuentas por cobrar.

Una deuda de un hotel hacia Perú Andes no es lo mismo que una deuda de Perú Andes hacia Baby Llama.

### 14.6. Diferenciación de importes

Se deben distinguir claramente:

1. Precio cobrado al pasajero por el hotel, cuando se conozca.
2. Tarifa acordada entre hotel y Perú Andes.
3. Adicionales facturables.
4. Importe total que debe el intermediario.
5. Pagos recibidos.
6. Costos de servicios tercerizados.
7. Obligaciones pendientes con proveedores.

No debe confundirse «monto cobrado» con dinero efectivamente recibido.

Tampoco debe calcularse rentabilidad sin disponer de los costos necesarios.

---

## 15. Dashboard principal

Al ingresar al sistema, el personal de Perú Andes debería disponer de un resumen de la actividad.

Indicadores propuestos:

- Reservas registradas para el día.
- Pasajeros programados.
- Pasajeros por servicio.
- Movilidades programadas.
- Pasajeros sin movilidad asignada.
- Conexiones a Puno pendientes.
- NO SHOWS registrados.
- Cuentas por cobrar.
- Pagos recibidos.
- Cuentas por pagar a proveedores.

Los indicadores deben diferenciar la actividad operativa de la información financiera.

Las vistas y acciones disponibles dependerán de los permisos del usuario.

---

## 16. Módulos funcionales previstos

La organización funcional propuesta es:

### Dashboard
Vista general del estado comercial, operativo y financiero.

### Intermediarios
Administración de hoteles, agencias, tarifas y cuentas corrientes.

### Reservas
Registro, consulta, modificación y seguimiento de reservas y pasajeros.

### Operaciones
Salidas, movilidades, guías, pasajeros, recojos, asistencia y manifiestos.

### Conexiones
Seguimiento de pasajeros que continúan hacia Puno y coordinación de transferencias.

### Proveedores
Registro de empresas externas, servicios derivados e importes por pagar.

### Finanzas
Cuentas por cobrar, pagos, adelantos, cuentas por pagar y liquidaciones.

### Configuración
Servicios turísticos, adicionales, condiciones comerciales y otros catálogos necesarios.

La gestión de alojamientos puede ser parte de Operaciones si resulta más coherente con el funcionamiento del negocio.

Esta división es funcional, no una imposición de arquitectura técnica.

---

## 17. Reportes necesarios

El sistema debería permitir consultar y generar:

### Reporte de reservas
Reservas por fecha, intermediario, pasajero y servicio.

### Manifiesto diario
Listado de pasajeros por fecha y tour, incluyendo información operativa.

### Reporte por intermediario
Servicios endosados por cada hotel o agencia.

### Estado de cuenta
Cargos, pagos, adelantos y saldo por intermediario.

### Liquidación por período
Detalle comercial y financiero de un intervalo seleccionado.

### Reporte de endosos salientes
Pasajeros derivados a proveedores externos e importes asociados.

### Reporte de NO SHOWS
Pasajeros ausentes y ajustes aplicados, cuando corresponda.

### Reporte de conexiones
Pasajeros que continúan hacia Puno, responsables y estado de coordinación.

### Reporte operativo
Pasajeros asignados por movilidad, conductor, guía y servicio.

Cuando corresponda, estos reportes deberían poder exportarse o imprimirse.

---

## 18. Reglas transversales obligatorias

1. Los hoteles y agencias registran sus reservas mediante un formulario accesible por enlace.
2. Las reservas no requieren aprobación manual de Perú Andes.
3. Cada intermediario tiene tarifas independientes para los tres servicios principales.
4. Los precios históricos de las reservas deben conservarse.
5. Una reserva puede contener varios pasajeros.
6. Cada pasajero puede tener sus propios adicionales y observaciones.
7. Los adicionales deben diferenciarse de las observaciones generales.
8. La información sensible de salud no debe exponerse indiscriminadamente.
9. Las reservas deben alimentar automáticamente las listas operativas.
10. Los pasajeros pueden distribuirse entre distintas movilidades.
11. Perú Andes puede derivar pasajeros a proveedores externos.
12. Un pasajero puede tener más de una relación operativa con terceros cuando corresponda.
13. Los pasajeros con conexión a Puno necesitan un seguimiento específico.
14. Se debe distinguir cancelación de NO SHOW.
15. Los hoteles y agencias generan cuentas por cobrar para Perú Andes.
16. Los intermediarios pueden pagar parcialmente o adelantar dinero.
17. Las cuentas corrientes deben mostrar saldos actualizados e historial.
18. Las cuentas por cobrar y por pagar son conceptos independientes.
19. Los ajustes financieros relevantes deben conservar trazabilidad.
20. No se debe solicitar al personal que vuelva a transcribir datos que ya están registrados.

---

## 19. Aspectos todavía pendientes de confirmar con Perú Andes

Los siguientes puntos NO son reglas definitivas. No deben resolverse inventando comportamientos comerciales.

### Reservas
- Si cada intermediario tendrá un enlace permanente exclusivo o algún otro mecanismo de acceso.
- Si los intermediarios podrán editar reservas enviadas.
- Cómo se gestionan reservas duplicadas o errores en datos.
- Cómo se tratan reservas cuando la capacidad operativa está completa.

### Adicionales
- Quién asume el pago de cada adicional.
- Cuáles se incluyen en la cuenta corriente del intermediario.
- Cuáles corresponden a costos de terceros.
- Cómo se aplican los boletos turísticos según la condición del pasajero.

### Conexión a Puno
- Quién ejecuta concretamente las conexiones.
- Quién recibe los pagos.
- Cómo se calculan los importes.
- Qué ocurre cuando la conexión la organiza el propio hotel.
- Cuál es el punto habitual de transferencia.

### NO SHOW
- Cuánto se penaliza.
- Quién debe pagar la penalidad.
- Si la penalidad depende del intermediario o servicio.
- Qué sucede con reservas canceladas antes de la salida.

### Operaciones
- Si existe exactamente un manifiesto por fecha.
- Quién asigna movilidades y guías.
- Si se manejan cupos por vehículo, salida u otro criterio.
- Cómo se gestionan los importes entregados a guías.
- Cómo se confirman las necesidades de alojamiento.

### Finanzas
- En qué momento se considera definitivamente facturable una reserva.
- Cómo afectan las cancelaciones a los cargos.
- Cómo se distribuyen los adelantos entre períodos o reservas.
- Si existen fechas de vencimiento diferentes por intermediario.
- Si hay condiciones especiales de pago por servicio.

Estos asuntos deberán identificarse como pendientes funcionales y no convertirse silenciosamente en reglas automáticas.

---

## 20. Criterios principales de aceptación

El sistema debe permitir completar los siguientes escenarios de negocio:

**Escenario 1: reserva normal**

Un hotel registra dos pasajeros en un Full Day. La reserva queda registrada automáticamente y ambos pasajeros aparecen en la programación correspondiente.

**Escenario 2: tarifas personalizadas**

Dos hoteles registran pasajeros para el mismo Full Day, pero cada reserva utiliza la tarifa previamente acordada con su respectivo hotel.

**Escenario 3: adicionales**

Un pasajero solicita bastones y almuerzo buffet. Los conceptos y sus importes quedan registrados individualmente, y el cálculo financiero considera únicamente aquellos cargos que correspondan al intermediario.

**Escenario 4: movilidad llena**

Perú Andes registra más pasajeros que los que puede transportar en una movilidad. El encargado puede distribuir pasajeros entre otras unidades o derivarlos a un proveedor externo sin perder la reserva original.

**Escenario 5: conexión a Puno**

Un pasajero registra que continuará hacia Puno. La información aparece en Operaciones, se identifica el responsable de la conexión y se puede realizar seguimiento de la transferencia.

**Escenario 6: pago parcial**

Un hotel acumula S/ 1,000 de deuda y paga S/ 400. El sistema conserva ambos movimientos y muestra S/ 600 pendientes.

**Escenario 7: adelanto**

Un intermediario adelanta S/ 500 y luego registra servicios facturables. El adelanto se puede aplicar a esos cargos según las reglas acordadas, conservando su trazabilidad.

**Escenario 8: NO SHOW**

Un pasajero no se presenta. El personal registra su inasistencia sin borrar la reserva. El efecto financiero queda sujeto a la política de penalidades definida por Perú Andes.

**Escenario 9: endoso saliente**

Perú Andes deriva pasajeros a Baby Llama y registra el importe que deberá pagar a ese proveedor, sin modificar la deuda original del hotel salvo que exista una regla comercial específica.

**Escenario 10: liquidación**

Administración consulta todos los servicios facturables de un hotel en un período, revisa los pagos recibidos y obtiene el saldo correspondiente.

---

## 21. Instrucciones para trabajar sobre el proyecto

Utiliza toda esta especificación como contexto funcional del sistema Perú Andes.

Antes de realizar cambios:

1. Revisa el estado actual del repositorio.
2. Lee y respeta las skills, instrucciones y convenciones existentes.
3. Identifica qué funcionalidades ya están desarrolladas y cuáles faltan.
4. Contrasta las funcionalidades existentes con las reglas de negocio descritas.
5. Organiza el trabajo en entregas funcionales coherentes que permitan validar progresivamente el sistema.

Durante el desarrollo:

- Prioriza que los procesos comerciales sean correctos.
- Mantén separados los conceptos de reserva, operación, cobro y pago a proveedores.
- Evita funcionalidades duplicadas y registros manuales innecesarios.
- No inventes precios, penalidades, comisiones o acuerdos comerciales.
- No conviertas propuestas pendientes en reglas definitivas.
- Mantén coherencia entre los distintos módulos.
- Considera los casos de múltiples pasajeros, pagos parciales, adelantos y tercerización.
- Asegura que una modificación relevante no produzca inconsistencias en las operaciones o finanzas.
- Aplica las directrices de calidad y desarrollo existentes en las skills del proyecto.

Si una regla funcional no está suficientemente definida, identifica la ambigüedad y solicita aclaración antes de establecer un comportamiento comercial que pueda afectar a Perú Andes.

**Prioridad funcional inicial:**

1. Intermediarios y tarifas personalizadas.
2. Formulario de reservas mediante enlace.
3. Gestión de reservas y pasajeros.
4. Programación de operaciones y asignación de movilidades.
5. Cuentas corrientes, pagos y liquidaciones.
6. Conexiones, proveedores, alojamiento y demás funcionalidades especializadas.

Esta prioridad es una propuesta de organización del alcance, no una limitación del sistema final.

El resultado esperado es un sistema integral que conecte el registro de reservas con la ejecución de los tours y el control financiero de Perú Andes, reduciendo el trabajo manual y proporcionando trazabilidad de todo el proceso.