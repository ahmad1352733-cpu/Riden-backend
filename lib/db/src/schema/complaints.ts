import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { tripsTable } from "./trips";

export const complaintTypeEnum = pgEnum("complaint_type", ["driver_behavior", "app_issue", "payment", "route", "other"]);
export const complaintStatusEnum = pgEnum("complaint_status", ["open", "resolved"]);

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tripId: integer("trip_id").references(() => tripsTable.id),
  type: complaintTypeEnum("type").notNull(),
  description: text("description").notNull(),
  status: complaintStatusEnum("status").notNull().default("open"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type Complaint = typeof complaintsTable.$inferSelect;
export type InsertComplaint = typeof complaintsTable.$inferInsert;
