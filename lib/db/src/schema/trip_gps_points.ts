import { pgTable, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { tripsTable } from "./trips";

export const tripGpsPointsTable = pgTable("trip_gps_points", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export type TripGpsPoint = typeof tripGpsPointsTable.$inferSelect;
