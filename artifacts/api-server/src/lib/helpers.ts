import { db } from "@workspace/db";
import { captainsTable, usersTable } from "@workspace/db/schema";
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

// Fare calculation: first 2km = 1 JOD, after that 0.25 JOD/km + 0.05 JOD/min
export function calculateFare(distanceKm: number, durationMin: number) {
  const BASE_FARE = 1.0;      // 1 JOD for first 2km
  const BASE_KM = 2.0;
  const PER_KM = 0.25;
  const PER_MIN = 0.05;

  let fare: number;
  if (distanceKm <= BASE_KM) {
    fare = BASE_FARE;
  } else {
    fare = BASE_FARE + (distanceKm - BASE_KM) * PER_KM + durationMin * PER_MIN;
  }
  return Math.round(fare * 100) / 100;
}
