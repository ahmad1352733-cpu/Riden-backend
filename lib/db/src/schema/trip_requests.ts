import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { captainsTable } from "./captains";
import { tripsTable } from "./trips";

export const tripRequestsTable = pgTable("trip_requests", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  captainId: integer("captain_id").notNull().references(() => captainsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TripRequest = typeof tripRequestsTable.$inferSelect;
