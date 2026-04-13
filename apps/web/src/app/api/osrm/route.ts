import { NextRequest, NextResponse } from "next/server";
import { createRoutingEngine } from "@/features/maps/lib/routing/routing-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { waypoints, rolloutKey } = body;

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 waypoints" },
        { status: 400 }
      );
    }

    const engine = createRoutingEngine();
    const result = await engine.getIdealRoute(waypoints, {
      rolloutKey: typeof rolloutKey === "string" ? rolloutKey : undefined
    });

    return NextResponse.json({
      route: result.route,
      distance: result.distance,
      duration: result.duration,
      isFallback: result.isFallback,
      provider: result.provider,
      reason: result.reason,
    });
  } catch (error) {
    console.error("[Routing API] Error:", error);
    return NextResponse.json(
      { error: "Error calculando ruta" },
      { status: 500 }
    );
  }
}
