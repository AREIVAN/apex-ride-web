import { buildStaticMapUrl } from "@/features/rides/lib/ride-share-static-map";
import { buildSpeedColoredSegments, type SpeedSegmentPoint } from "@/features/rides/lib/speed-colored-segments";

export type RideRouteCoordinate = [number, number];
export type RideRoutePoint = SpeedSegmentPoint;

export interface RideShareData {
  title: string;
  startedAt: string;
  endedAt: string | null;
  distanceKm: number;
  movingTimeSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainM: number;
  pointCount: number;
  routeCoordinates: RideRouteCoordinate[];
  routePoints?: RideRoutePoint[];
}

interface ProjectedPoint {
  x: number;
  y: number;
}

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;
const MIME_TYPE = "image/png";

export function formatRideDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatRideDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function buildRideShareSummary(data: RideShareData): string {
  return [
    "Rodada completada · Apex Ride",
    data.title,
    formatRideDateTime(data.startedAt),
    `${data.distanceKm.toFixed(1)} km · ${formatRideDuration(data.movingTimeSec)} · ${data.avgSpeedKmh.toFixed(1)} km/h prom.`,
    `Max ${data.maxSpeedKmh.toFixed(1)} km/h · Elevación ${data.elevationGainM.toFixed(0)} m · ${data.pointCount} puntos GPS`,
    "Compartido desde Apex Ride"
  ].join("\n");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function generateRideSharePng(data: RideShareData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");

  const staticMapImage = await loadRideStaticMapImage(data.routeCoordinates);
  drawShareCard(ctx, data, staticMapImage);

  const blob = await canvasToBlob(canvas);
  if (blob) return blob;

  if (staticMapImage) {
    ctx.clearRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
    drawShareCard(ctx, data, null);
    const fallbackBlob = await canvasToBlob(canvas);
    if (fallbackBlob) return fallbackBlob;
  }

  throw new Error("No se pudo exportar PNG");
}

export function buildRideShareFilename(data: RideShareData): string {
  const safeTitle = data.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "rodada";

  return `apex-ride-${safeTitle}.png`;
}

function drawShareCard(ctx: CanvasRenderingContext2D, data: RideShareData, staticMapImage: HTMLImageElement | null): void {
  drawBackground(ctx);
  drawBrand(ctx);
  drawTitle(ctx, data);
  drawRoutePanel(ctx, data, staticMapImage);
  drawMetricGrid(ctx, data);
  drawFooter(ctx);
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const bg = ctx.createLinearGradient(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  bg.addColorStop(0, "#06151f");
  bg.addColorStop(0.45, "#081f28");
  bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.42;
  const glow = ctx.createRadialGradient(820, 120, 0, 820, 120, 520);
  glow.addColorStop(0, "#19e6b7");
  glow.addColorStop(1, "rgba(25,230,183,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  for (let i = -220; i < EXPORT_WIDTH; i += 120) {
    ctx.beginPath();
    ctx.moveTo(i, EXPORT_HEIGHT);
    ctx.lineTo(i + 520, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBrand(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, 72, 66, 936, 112, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(94,234,212,0.22)";
  ctx.stroke();

  ctx.fillStyle = "#5eead4";
  ctx.beginPath();
  ctx.arc(125, 122, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#052e2b";
  ctx.font = "800 26px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("A", 125, 132);

  ctx.textAlign = "left";
  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 34px Inter, Arial, sans-serif";
  ctx.fillText("Apex Ride", 166, 116);
  ctx.fillStyle = "#99f6e4";
  ctx.font = "600 22px Inter, Arial, sans-serif";
  ctx.fillText("Inteligencia de rodadas", 166, 148);
}

function drawTitle(ctx: CanvasRenderingContext2D, data: RideShareData): void {
  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 68px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Rodada completada", 72, 282);

  ctx.fillStyle = "#d1fae5";
  ctx.font = "800 40px Inter, Arial, sans-serif";
  drawTextLine(ctx, data.title, 72, 342, 900);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 26px Inter, Arial, sans-serif";
  ctx.fillText(formatRideDateTime(data.startedAt), 72, 386);
}

function drawRoutePanel(ctx: CanvasRenderingContext2D, data: RideShareData, staticMapImage: HTMLImageElement | null): void {
  const x = 72;
  const y = 434;
  const width = 936;
  const height = 410;
  const routePoints = resolveRoutePoints(data);
  const coordinates = routePoints.map((point) => [point.lng, point.lat] as RideRouteCoordinate);

  ctx.fillStyle = "rgba(15,23,42,0.82)";
  roundRect(ctx, x, y, width, height, 42);
  ctx.fill();
  ctx.strokeStyle = "rgba(45,212,191,0.32)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, x, y, width, height, 42);
  ctx.clip();

  if (staticMapImage) {
    drawImageCover(ctx, staticMapImage, x, y, width, height);
    ctx.fillStyle = "rgba(2,6,23,0.22)";
    ctx.fillRect(x, y, width, height);
  } else {
    drawMapGrid(ctx, x, y, width, height);
  }

  if (coordinates.length < 2) {
    ctx.fillStyle = "rgba(148,163,184,0.16)";
    roundRect(ctx, x + 170, y + 134, width - 340, 142, 28);
    ctx.fill();
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "800 34px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Sin traza disponible", x + width / 2, y + 205);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 22px Inter, Arial, sans-serif";
    ctx.fillText("Métricas listas para compartir", x + width / 2, y + 242);
    ctx.restore();
    return;
  }

  const projected = projectCoordinates(coordinates, x + 70, y + 54, width - 140, height - 108);
  drawProjectedRoute(ctx, routePoints, projected);
  drawEndpoint(ctx, projected[0], "#34d399", "INICIO");
  drawEndpoint(ctx, projected[projected.length - 1], "#fb7185", "FIN");
  ctx.restore();
}

async function loadRideStaticMapImage(coordinates: RideRouteCoordinate[]): Promise<HTMLImageElement | null> {
  const url = buildStaticMapUrl(coordinates, {
    width: 936,
    height: 410,
    padding: 44,
    routeWidth: 1,
    routeOpacity: 0.01,
  });
  if (!url) return null;

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(isCanvasSafeImage(image) ? image : null);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function isCanvasSafeImage(image: HTMLImageElement): boolean {
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const context = probe.getContext("2d");
  if (!context) return false;

  try {
    context.drawImage(image, 0, 0, 1, 1);
    context.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  try {
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, MIME_TYPE, 0.96));
  } catch {
    return null;
  }
}

function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number): void {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  const sourceWidth = imageRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const sourceHeight = imageRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function resolveRoutePoints(data: RideShareData): RideRoutePoint[] {
  if (data.routePoints?.length) return data.routePoints;
  return data.routeCoordinates.map(([lng, lat]) => ({ lng, lat, speedKmh: null }));
}

function drawMetricGrid(ctx: CanvasRenderingContext2D, data: RideShareData): void {
  const metrics = [
    ["Distancia", `${data.distanceKm.toFixed(1)} km`],
    ["Tiempo efectivo", formatRideDuration(data.movingTimeSec)],
    ["Vel. media", `${data.avgSpeedKmh.toFixed(1)} km/h`],
    ["Vel. máxima", `${data.maxSpeedKmh.toFixed(1)} km/h`],
    ["Elevación", `${data.elevationGainM.toFixed(0)} m`],
    ["Puntos GPS", `${data.pointCount}`]
  ] as const;

  const startX = 72;
  const startY = 884;
  const gap = 22;
  const cardW = (936 - gap) / 2;
  const cardH = 118;

  metrics.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    ctx.fillStyle = "rgba(255,255,255,0.075)";
    roundRect(ctx, x, y, cardW, cardH, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#8ddfd4";
    ctx.font = "800 20px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), x + 28, y + 40);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 40px Inter, Arial, sans-serif";
    ctx.fillText(value, x + 28, y + 88);
  });
}

function drawFooter(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(94,234,212,0.16)";
  roundRect(ctx, 72, 1260, 936, 54, 27);
  ctx.fill();
  ctx.fillStyle = "#ccfbf1";
  ctx.font = "800 24px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Compartido desde Apex Ride", EXPORT_WIDTH / 2, 1296);
}

function drawMapGrid(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = "#071a24";
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = "rgba(45,212,191,0.12)";
  ctx.lineWidth = 1;
  for (let col = x - 40; col < x + width + 40; col += 70) {
    ctx.beginPath();
    ctx.moveTo(col, y);
    ctx.lineTo(col + 120, y + height);
    ctx.stroke();
  }
  for (let row = y + 26; row < y + height; row += 62) {
    ctx.beginPath();
    ctx.moveTo(x, row);
    ctx.lineTo(x + width, row - 84);
    ctx.stroke();
  }
}

function drawProjectedRoute(ctx: CanvasRenderingContext2D, routePoints: RideRoutePoint[], projected: ProjectedPoint[]): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  drawProjectedPolyline(ctx, projected, "rgba(15,23,42,0.76)", 24);

  const segments = buildSpeedColoredSegments(routePoints);
  segments.forEach((segment, index) => {
    const from = projected[index];
    const to = projected[index + 1];
    if (!from || !to) return;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = segment.color;
    ctx.lineWidth = 12;
    ctx.stroke();
  });

  drawProjectedPolyline(ctx, projected, "rgba(248,250,252,0.9)", 3);
}

function drawProjectedPolyline(ctx: CanvasRenderingContext2D, points: ProjectedPoint[], color: string, width: number): void {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawEndpoint(ctx: CanvasRenderingContext2D, point: ProjectedPoint, color: string, label: string): void {
  ctx.fillStyle = "rgba(2,6,23,0.78)";
  roundRect(ctx, point.x - 54, point.y - 58, 108, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "800 15px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, point.x, point.y - 36);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 6;
  ctx.stroke();
}

function projectCoordinates(
  coordinates: RideRouteCoordinate[],
  x: number,
  y: number,
  width: number,
  height: number
): ProjectedPoint[] {
  const lngs = coordinates.map((coord) => coord[0]);
  const lats = coordinates.map((coord) => coord[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngSpan = Math.max(maxLng - minLng, 0.00001);
  const latSpan = Math.max(maxLat - minLat, 0.00001);
  const scale = Math.min(width / lngSpan, height / latSpan);
  const routeWidth = lngSpan * scale;
  const routeHeight = latSpan * scale;
  const offsetX = x + (width - routeWidth) / 2;
  const offsetY = y + (height - routeHeight) / 2;

  return coordinates.map(([lng, lat]) => ({
    x: offsetX + (lng - minLng) * scale,
    y: offsetY + (maxLat - lat) * scale
  }));
}

function drawTextLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number): void {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }

  let shortened = text;
  while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  ctx.fillText(`${shortened}…`, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}
