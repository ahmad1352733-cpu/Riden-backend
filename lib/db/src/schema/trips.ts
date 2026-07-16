import { pgTable, serial, integer, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { captainsTable } from "./captains";

export const tripStatusEnum = pgEnum("trip_status", ["pending", "accepted", "started", "completed", "cancelled"]);

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id").notNull().references(() => usersTable.id),
  captainId: integer("captain_id").references(() => captainsTable.id),
  status: tripStatusEnum("status").notNull().default("pending"),
  pickupLat: real("pickup_lat").notNull(),
  pickupLng: real("pickup_lng").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  dropoffLat: real("dropoff_lat").notNull(),
  dropoffLng: real("dropoff_lng").notNull(),
  dropoffAddress: text("dropoff_address").notNull(),
  fare: real("fare"),
  distanceKm: real("distance_km"),
  durationMin: real("duration_min"),
  discountPercent: real("discount_percent"),
  finalFare: real("final_fare"),
  rating: real("rating"),
  discountCodeUsed: text("discount_code_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export type Trip = typeof tripsTable.$inferSelect;
export type InsertTrip = typeof tripsTable.$inferInsert;
