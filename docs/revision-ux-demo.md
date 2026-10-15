# Revisión UX/UI de la demostración

Fecha: 15 de octubre de 2026.

Objetivo: presentar un recorrido comprensible al cliente, facilitar las tareas del equipo de ventas y reducir errores de interpretación. Se conserva el lenguaje visual azul y blanco de la referencia aprobada.

## Diagnóstico y mejoras

| Área revisada | Fricción encontrada | Mejora aplicada |
| --- | --- | --- |
| Login | No identificaba la demostración; contraseña difícil de verificar | Aviso Demo, explicación breve del producto, mostrar/ocultar contraseña y composición móvil compacta |
| Navegación | Faltaba orientación para una persona nueva | Guía específica de cada módulo, acceso directo al contenido y estado expandido de navegación móvil |
| Dashboard | No explicaba cómo interpretar los indicadores | Orientación sobre fecha, pasajeros pendientes, conexiones y saldos |
| Intermediarios | “Registro activo” era ambiguo; revocar era inmediato | Etiqueta “Habilitado para recibir reservas”, explicación del efecto y confirmación de revocación con nombre del hotel |
| Tarifas y enlaces | No quedaba claro el orden de preparación | Secuencia intermediario → tarifas → enlace; ayuda específica por pestaña y conservación explícita del historial |
| Reservas y pasajeros | Faltaba una revisión previa; confirmación final genérica | Resumen de tour, fecha, pasajeros e importe; ayuda sobre tarifa faltante y confirmación con datos del envío; opción de registrar otra reserva con una nueva solicitud |
| Correcciones comerciales | Riesgo de confundir edición con ajuste financiero | Ayuda sobre motivo, historial y diferencia financiera; sin acción de creación ajena en la vista de historial |
| Operaciones | Dependencias entre catálogos, salidas y manifiesto poco evidentes | Guías para movilidad, personal, salidas, asignaciones, alojamiento e importes informativos de guías |
| Conexiones a Puno | La información pendiente podía parecer coordinación confirmada | Instrucciones para confirmar responsable, proveedor, punto, hora y estado, sin asignar responsables por defecto |
| Proveedores y endosos | Posible confusión entre costo del proveedor y deuda del hotel | Explicación de la obligación independiente y cuándo marcar cobertura de movilidad |
| Finanzas | Confusión entre saldo, crédito disponible y crédito aplicado | Ayudas diferenciadas para cuenta corriente, movimientos, aplicaciones y liquidación; no se alteran cálculos ni políticas |
| Configuración | No se distinguía catálogo de tarifas del hotel | Orientación para servicios y adicionales; tarifas por intermediario e importes históricos diferenciados |
| Vendedoras y auditoría | Creación y consulta del historial mezcladas visualmente | Explicación de permisos; historial sin una acción principal de creación ajena al contexto |
| Listados | Texto plano, búsquedas sensibles a tildes y listas largas | Insignias de estado, búsqueda sin tildes, orden visible, 20 filas por página y exportación/impresión de todos los resultados filtrados |
| Formularios compartidos | No había salida secundaria ni ayudas cuando faltaban opciones | Cancelar, indicación de obligatorios, mensajes de opciones vacías y etiquetas de guardado para creación/edición |
| Feedback | Todos los avisos tenían apariencia de éxito | Diferenciación de error y éxito, avisos descartables y confirmación antes de revocar |
| Estados vacíos | Mensaje genérico sin siguiente paso | Texto contextual y acción de inicio, sin introducir registros ficticios en la base |

## Comprobación

- Revisión en navegador de Dashboard, Conexiones y las 23 pestañas de Intermediarios, Reservas, Operaciones, Proveedores, Finanzas, Configuración y Vendedoras.
- Revisión del formulario público asociado al hotel existente, sin enviar reservas de prueba a la base remota.
- Login revisado en escritorio y a 390 px de ancho; el formulario queda accesible sin desbordamiento horizontal.
- Pruebas de reglas de negocio en PostgreSQL local y comprobaciones de código y compilación. Las interacciones de escritura no se repiten contra los datos remotos para esta revisión visual.

## Alcance del demo

La marca Demo es informativa: la aplicación continúa conectada a Supabase y los cambios se guardan. No implica un entorno aislado ni un reinicio automático de datos. El login lo explica expresamente.

La revisión es heurística y funcional; no sustituye una sesión de usabilidad con las vendedoras. El Excel de ejemplos operativos todavía no fue recibido y no se presume su contenido. Ajustar etiquetas y orden de campos a ese material cuando esté disponible.
