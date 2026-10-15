import type { ModuleId } from "./model";

export const moduleGuidance: Record<
  ModuleId,
  { title: string; description: string }
> = {
  dashboard: {
    title: "Empieza por la operación de hoy",
    description:
      "Elige una fecha y revisa pasajeros sin movilidad, conexiones pendientes y saldos por atender.",
  },
  intermediaries: {
    title: "Prepara el acceso de cada hotel o agencia",
    description:
      "1. Registra el intermediario. 2. Acuerda sus tarifas. 3. Crea y comparte su enlace exclusivo.",
  },
  bookings: {
    title: "Una reserva conecta ventas, operación y cobros",
    description:
      "Registra el tour y sus pasajeros. El cargo se genera al guardar; las correcciones comerciales conservan el historial.",
  },
  operations: {
    title: "Organiza cada salida",
    description:
      "Registra movilidades y personal, programa la salida y asigna pasajeros desde el manifiesto. Revisa también los alojamientos.",
  },
  connections: {
    title: "Confirma la continuación hacia Puno",
    description:
      "Revisa quién coordina, proveedor, punto y hora de transferencia. Actualiza el estado cuando se confirme la conexión.",
  },
  providers: {
    title: "Distingue el servicio contratado del cobro al hotel",
    description:
      "Registra al proveedor y el servicio derivado por pasajero. El importe acordado genera una cuenta por pagar independiente.",
  },
  finance: {
    title: "Primero elige qué cuenta revisar",
    description:
      "Separa cuentas por cobrar y por pagar. Registra abonos o adelantos y aplica los créditos manualmente a los cargos correspondientes.",
  },
  settings: {
    title: "Mantén el catálogo del equipo",
    description:
      "Configura servicios turísticos y adicionales. Las tarifas de cada hotel se gestionan en Intermediarios; los precios históricos se conservan.",
  },
  staff: {
    title: "Da a cada vendedora el acceso que necesita",
    description:
      "Crea su cuenta y ajusta los módulos permitidos. Solo el superadministrador puede administrar al equipo y sus permisos.",
  },
};

export const tabGuidance: Record<string, string> = {
  tariffs:
    "Cada tarifa pertenece a un intermediario y un tour. La última versión se utiliza en nuevas reservas; los importes históricos se conservan.",
  links:
    "Comparte el enlace solo con su hotel o agencia. Revocarlo bloquea nuevos envíos y conserva las reservas existentes.",
  history:
    "Consulta las reservas de un hotel o agencia y filtra por fecha, servicio o estado.",
  passengers:
    "Los pasajeros de la reserva se reutilizan en Operaciones; no necesitas registrarlos otra vez.",
  corrections:
    "Una corrección comercial requiere un motivo y puede generar un ajuste financiero por la diferencia.",
  manifest:
    "Selecciona la fecha, revisa los pasajeros y utiliza las acciones de cada fila para asignar una salida o marcar asistencia.",
  departures:
    "Una salida reúne fecha, tour y movilidad. Puedes asignar guía y conductor al confirmar la coordinación.",
  vehicles:
    "La capacidad de cada movilidad controla los cupos al asignar pasajeros.",
  crew: "Mantén aquí los datos de guías y conductores para asignarlos a las salidas.",
  lodgings:
    "Organiza noches y grupos de habitación por pasajero, según la duración del tour reservado.",
  guideFunds:
    "Registra lo comunicado al guía. Estos importes informativos no crean pagos ni penalidades automáticas.",
  outsourcings:
    "Registra el proveedor, pasajero y costo acordado. Marca la cobertura de movilidad únicamente si ese servicio la reemplaza.",
  balances:
    "El saldo neto resume la cuenta; los créditos disponibles todavía necesitan aplicarse a cargos concretos.",
  ledger:
    "Los movimientos conservan la trazabilidad. Una cancelación o NO SHOW no crea una penalidad automática.",
  applications:
    "Asocia un crédito disponible a un cargo de la misma cuenta, sin superar sus importes pendientes.",
  settlement:
    "Elige una cuenta y un período para revisar saldo anterior, cargos, abonos y saldo final. Exporta o imprime el resultado.",
  audit:
    "Consulta quién realizó cada cambio y cuándo. Este historial no se edita desde el panel.",
  extras:
    "El precio se guarda al reservar. El cobro de adicionales se registra mediante un movimiento explícito.",
};
