import { pgTable, serial, integer, real, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { captainsTable } from "./captains";
import { tripsTable } from "./trips";

export const transactionTypeEnum = pgEnum("transaction_type", ["trip_commission", "admin_credit", "trip_earning"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  captainId: integer("captain_id").notNull().references(() => captainsTable.id),
  tripId: integer("trip_id").references(() => tripsTable.id),
  amount: real("amount").notNull(),
  type: transactionTypeEnum("type").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
