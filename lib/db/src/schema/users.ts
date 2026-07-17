import { pgTable, serial, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "captain", "passenger"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("passenger"),
  status: userStatusEnum("status").notNull().default("active"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
