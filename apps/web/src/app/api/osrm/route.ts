import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { waypoints } = body;

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 waypoints" },
        { status: 400 }
      );
    }

    // Build coordinates string for OSRM
    const coords = waypoints.map((wp: { lng: number; lat: number }) => `${wp.lng},${wp.lat}`).join(";");

    // Call OSRM from server (avoids CORS issues)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    
    const response = await fetch(osrmUrl, {
      method: "GET",
      headers: {
        // OSRM demo server may have rate limiting, but server-side should work better
        "User-Agent": "ApexRide/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`OSRM error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || !data.routes[0]) {
      // If OSRM fails, return waypoints directly as fallback
      return NextResponse.json({
        route: waypoints.map((wp: { lng: number; lat: number }) => [wp.lng, wp.lat]),
        isFallback: true,
        osrmError: data.code,
      });
    }

    return NextResponse.json({
      route: data.routes[0].geometry.coordinates,
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      isFallback: false,
    });
  } catch (error) {
    console.error("[OSRM API] Error:", error);
    return NextResponse.json(
      { error: "Error calculando ruta" },
      { status: 500 }
    );
  }
}
