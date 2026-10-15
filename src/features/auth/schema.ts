import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Ingresa un correo válido.")),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginValues = z.output<typeof loginSchema>;
