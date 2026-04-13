import { NextRequest, NextResponse } from "next/server";

import { createRoutingEngine, type TracePoint } from "@/features/maps/lib/routing/routing-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const points = (Array.isArray(body?.points) ? body.points : []) as TracePoint[];
    const rolloutKey = typeof body?.rolloutKey === "string" ? body.rolloutKey : undefined;

    if (points.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 puntos para map matching" },
        { status: 400 }
      );
    }

    const engine = createRoutingEngine();
    const result = await engine.matchTrace(points, { rolloutKey });

    return NextResponse.json({
      points: result.points,
      provider: result.provider,
      isFallback: result.isFallback,
      reason: result.reason
    });
  } catch (error) {
    console.error("[MapMatching API] Error:", error);
    return NextResponse.json(
      { error: "Error ajustando traza GPS" },
      { status: 500 }
    );
  }
}
