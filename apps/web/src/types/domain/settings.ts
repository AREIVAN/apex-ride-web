export interface UserSettings {
  id: string;
  userId: string;
  unitSystem: "metric" | "imperial";
  privacyLevel: "public" | "authenticated" | "private";
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}