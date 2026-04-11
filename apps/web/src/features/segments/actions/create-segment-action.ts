"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/features/auth/services/auth-server";

import { createSegmentSchema } from "../schemas/segment-schemas";
import { createSegmentsService } from "../services/segments-service";

export interface CreateSegmentActionState {
  error: string | null;
}

export const initialCreateSegmentActionState: CreateSegmentActionState = {
  error: null
};

export async function createSegmentAction(
  _: CreateSegmentActionState,
  formData: FormData
): Promise<CreateSegmentActionState> {
  const parsed = createSegmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    distanceM: formData.get("distanceM"),
    elevationGainM: formData.get("elevationGainM"),
    visibility: formData.get("visibility"),
    startLat: formData.get("startLat"),
    startLng: formData.get("startLng"),
    endLat: formData.get("endLat"),
    endLng: formData.get("endLng")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "No se pudo validar el formulario." };
  }

  try {
    const { client, user } = await requireUser();
    const segment = await createSegmentsService(client).create(user.id, parsed.data);
    redirect(`/segments/${segment.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el segmento.";
    return { error: message };
  }
}
