import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(8, "La clave debe tener al menos 8 caracteres")
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "El nombre es obligatorio"),
    email: z.string().email("Ingresa un email valido"),
    password: z.string().min(8, "La clave debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirma tu clave")
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las claves no coinciden",
    path: ["confirmPassword"]
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
