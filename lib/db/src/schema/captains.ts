import { pgTable, serial, integer, text, boolean, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const captainApprovalStatusEnum = pgEnum("captain_approval_status", ["pending", "approved", "rejected"]);

export const captainsTable = pgTable("captains", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  licenseNumber: text("license_number").notNull(),
  vehicleMake: text("vehicle_make").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  vehiclePlate: text("vehicle_plate").notNull(),
  vehicleYear: integer("vehicle_year").notNull(),
  vehicleColor: text("vehicle_color").notNull(),
  isApproved: boolean("is_approved").notNull().default(false),
  approvalStatus: captainApprovalStatusEnum("approval_status").notNull().default("pending"),
  isOnline: boolean("is_online").notNull().default(false),
  balance: real("balance").notNull().default(0),
  rating: real("rating").notNull().default(0),
  totalTrips: integer("total_trips").notNull().default(0),
  currentLat: real("current_lat"),
  currentLng: real("current_lng"),
  locationUpdatedAt: timestamp("location_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Captain = typeof captainsTable.$inferSelect;
export type InsertCaptain = typeof captainsTable.$inferInsert;
