import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const routesTable = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pickupArea: text("pickup_area").notNull(),
  dropoffArea: text("dropoff_area").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Route = typeof routesTable.$inferSelect;
export type InsertRoute = typeof routesTable.$inferInsert;
