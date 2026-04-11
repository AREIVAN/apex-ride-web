export interface RiderProfile {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  city: string;
  country: string;
  preferredVehicleType: "motorcycle" | "scooter" | "mixed";
  vehicleModel: string;
  vehicleYear: number | null;
  vehicleEngineCc: number | null;
  totalDistanceKm: number;
  totalElevationM: number;
  createdAt: string;
}
