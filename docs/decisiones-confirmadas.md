# Decisiones funcionales confirmadas

Complementa la especificación original con aclaraciones posteriores del usuario. No implica que los permisos descritos ya estén implementados.

## Usuarios y permisos

El sistema interno está destinado al equipo de ventas de Perú Andes.

| Rol | Acceso |
| --- | --- |
| Superadministrador | Acceso a los módulos del sistema, incluyendo Vendedoras/Empleados; puede crear vendedoras y revocar permisos. |
| Vendedora | Acceso a Dashboard, Intermediarios, Reservas, Operaciones, Conexiones, Proveedores, Finanzas y Configuración, según los permisos vigentes. Sin acceso al módulo Vendedoras/Empleados. |

La revocación de permisos debe comprobarse en servidor y en las políticas de datos, además de reflejarse en la navegación. Las vendedoras no pueden gestionar cuentas del personal, permisos ni roles mediante URLs o llamadas directas al backend. Configuración no debe ofrecer una vía alternativa para acceder a estas funciones.

El acceso a un módulo no autoriza automáticamente cualquier acción sensible. Las reglas específicas de ajustes comerciales, salud y otras operaciones se mantienen según la especificación y deberán concretarse cuando corresponda. No crear nuevos roles o excepciones sin requisitos.

El mecanismo de acceso de hoteles y agencias al formulario de reservas sigue pendiente; no tratarlos como vendedoras ni darles acceso al sistema interno.

## Supabase

El usuario confirmó que existe un proyecto Supabase para Perú Andes y que configurará su URL y clave publicable en `.env.local`. No pedir claves privadas en el chat ni copiar credenciales de otros proyectos. La conexión y los permisos remotos todavía deben verificarse; esta confirmación no demuestra que el esquema o los usuarios iniciales existan.

## Reservas y movimientos financieros

- Cada intermediario tendrá un enlace exclusivo y revocable para registrar reservas sin entrar al panel interno.
- El cargo del tour al intermediario se genera al registrar la reserva, con su tarifa acordada y cantidad de pasajeros.
- Adicionales, cancelaciones y NO SHOW solo afectan las finanzas mediante movimientos explícitos y trazables. No añadir penalidades automáticas ni distribuir pagos de adicionales sin una regla confirmada.
- Los adelantos se aplican manualmente a cargos seleccionados. No consumir el mismo crédito más de una vez.
