export type SegmentVisibility = "public" | "club" | "private";

export interface Segment {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  distanceM: number;
  elevationGainM: number;
  avgGradientPct: number;
  visibility: SegmentVisibility;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  pathCoordinates?: [number, number][];
  createdAt: string;
}
