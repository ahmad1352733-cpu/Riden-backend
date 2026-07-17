import { db } from "@workspace/db";
import { captainsTable, usersTable, settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export function formatCaptain(
  user: typeof usersTable.$inferSelect,
  captain: typeof captainsTable.$inferSelect
) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    status: user.status,
    isApproved: captain.isApproved,
    approvalStatus: captain.approvalStatus,
    isOnline: captain.isOnline,
    balance: captain.balance,
    rating: captain.rating,
    totalTrips: captain.totalTrips,
    licenseNumber: captain.licenseNumber,
    vehicleMake: captain.vehicleMake,
    vehicleModel: captain.vehicleModel,
    vehiclePlate: captain.vehiclePlate,
    vehicleYear: captain.vehicleYear,
    vehicleColor: captain.vehicleColor,
    currentLat: captain.currentLat,
    currentLng: captain.currentLng,
    createdAt: user.createdAt,
  };
}

export async function getCaptainWithUser(captainId: number) {
  const [row] = await db
    .select()
    .from(captainsTable)
    .innerJoin(usersTable, eq(captainsTable.userId, usersTable.id))
    .where(eq(captainsTable.id, captainId));
  if (!row) return null;
  return { user: row.users, captain: row.captains };
}

export async function getCaptainByUserId(userId: number) {
  const [row] = await db
    .select()
    .from(captainsTable)
    .innerJoin(usersTable, eq(captainsTable.userId, usersTable.id))
    .where(eq(usersTable.id, userId));
  if (!row) return null;
  return { user: row.users, captain: row.captains };
}

// Haversine distance in km
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Load pricing settings from DB (cached for 60s)
let _cache: Record<string, number> | null = null;
let _cacheAt = 0;

export async function getSettings(): Promise<Record<string, number>> {
  const now = Date.now();
  if (_cache && now - _cacheAt < 60_000) return _cache;
  const rows = await db.select().from(settingsTable);
  _cache = Object.fromEntries(rows.map(r => [r.key, parseFloat(r.value)]));
  _cacheAt = now;
  return _cache;
}

export function invalidateSettingsCache() {
  _cache = null;
}

// Fare calculation using dynamic settings
export function calculateFare(
  distanceKm: number,
  durationMin: number,
  settings?: Record<string, number>
): number {
  const BASE_FARE = settings?.base_fare ?? 1.0;
  const FREE_KM = settings?.free_km ?? 2.0;
  const PER_KM = settings?.per_km_rate ?? 0.25;
  const PER_MIN = settings?.per_min_rate ?? 0.05;

  let fare: number;
  if (distanceKm <= FREE_KM) {
    fare = BASE_FARE;
  } else {
    fare = BASE_FARE + (distanceKm - FREE_KM) * PER_KM + durationMin * PER_MIN;
  }
  return Math.round(fare * 100) / 100;
}
