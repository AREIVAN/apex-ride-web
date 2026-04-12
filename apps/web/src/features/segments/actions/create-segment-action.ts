"use server";

import { requireUser } from "@/features/auth/services/auth-server";

import { createSegmentSchema } from "../schemas/segment-schemas";
import { createSegmentsService } from "../services/segments-service";

export interface CreateSegmentActionState {
  error: string | null;
  success?: boolean;
  segmentId?: string;
}

export async function createSegmentAction(
  prevState: CreateSegmentActionState | null,
  formData: FormData
): Promise<CreateSegmentActionState> {
  // Extract waypoints from form data
  const waypointsJson = formData.get("waypoints") as string;
  let waypoints: Array<{ lat: number; lng: number }> = [];
  
  if (waypointsJson) {
    try {
      waypoints = JSON.parse(waypointsJson);
    } catch {
      // Invalid waypoints data
    }
  }

  if (waypoints.length < 2) {
    return { error: "Necesitas al menos un punto de inicio y uno de fin en el mapa" };
  }

  const routeGeometry = formData.get("routeGeometry") as string;
  const distanceM = formData.get("distanceM") ? Number(formData.get("distanceM")) : 0;

  const parsed = createSegmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    distanceM: distanceM,
    elevationGainM: formData.get("elevationGainM") ? Number(formData.get("elevationGainM")) : 0,
    visibility: formData.get("visibility") ?? "public",
    startLat: waypoints[0].lat,
    startLng: waypoints[0].lng,
    endLat: waypoints[waypoints.length - 1].lat,
    endLng: waypoints[waypoints.length - 1].lng,
    routeGeometry: routeGeometry || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "No se pudo validar el formulario." };
  }

  try {
    const { client, user } = await requireUser();
    const service = createSegmentsService(client);
    const segment = await service.create(user.id, parsed.data);
    return { success: true, segmentId: segment.id, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el segmento.";
    return { error: message };
  }
}