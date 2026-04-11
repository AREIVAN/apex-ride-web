import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "El nombre es obligatorio").max(80),
  username: z
    .string()
    .min(3, "El username debe tener al menos 3 caracteres")
    .max(30)
    .regex(/^[a-z0-9._-]+$/, "Usa minusculas, numeros, punto, guion o guion bajo"),
  city: z.string().max(60).default(""),
  country: z.string().max(60).default(""),
  bio: z.string().max(240).default(""),
  preferredVehicleType: z.enum(["motorcycle", "scooter", "mixed"]),
  vehicleModel: z.string().max(80).default(""),
  vehicleYear: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().min(1980).max(2100).nullable()
  ),
  vehicleEngineCc: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().min(50).max(2500).nullable()
  )
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
