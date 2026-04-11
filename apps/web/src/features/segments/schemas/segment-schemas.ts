import { z } from "zod";

export const createSegmentSchema = z.object({
  name: z.string().min(3, "El nombre del segmento debe tener al menos 3 caracteres"),
  description: z.string().max(280, "La descripcion no puede superar 280 caracteres").default(""),
  distanceM: z.coerce.number().positive("La distancia debe ser mayor a 0"),
  elevationGainM: z.coerce.number().min(0, "El desnivel no puede ser negativo"),
  visibility: z.enum(["public", "club", "private"]),
  startLat: z.coerce.number().min(-90).max(90),
  startLng: z.coerce.number().min(-180).max(180),
  endLat: z.coerce.number().min(-90).max(90),
  endLng: z.coerce.number().min(-180).max(180)
});

export type CreateSegmentValues = z.infer<typeof createSegmentSchema>;
