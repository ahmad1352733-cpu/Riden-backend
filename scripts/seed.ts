import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "../lib/db/src/schema/index.js";
import { eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  const [admin] = await db
    .insert(schema.usersTable)
    .values({ name: "RIDEN Admin", phone: "0790000000", email: "admin@riden.jo", passwordHash: adminHash, role: "admin" })
    .onConflictDoNothing()
    .returning();
  console.log("✅ Admin:", admin?.email ?? "already exists");

  // Demo passenger
  const passengerHash = await bcrypt.hash("pass123", 10);
  const [passenger] = await db
    .insert(schema.usersTable)
    .values({ name: "Ahmed Al-Rashid", phone: "0791234567", email: "ahmed@example.com", passwordHash: passengerHash, role: "passenger" })
    .onConflictDoNothing()
    .returning();
  console.log("✅ Passenger:", passenger?.email ?? "already exists");

  // Demo captain 1
  const captain1Hash = await bcrypt.hash("cap123", 10);
  const [captainUser1] = await db
    .insert(schema.usersTable)
    .values({ name: "Khaled Mansour", phone: "0795551001", email: "khaled@riden.jo", passwordHash: captain1Hash, role: "captain" })
    .onConflictDoNothing()
    .returning();

  if (captainUser1) {
    const [c] = await db
      .insert(schema.captainsTable)
      .values({
        userId: captainUser1.id,
        licenseNumber: "JO-123456",
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        vehiclePlate: "12-A-34567",
        vehicleYear: 2020,
        vehicleColor: "White",
        isApproved: true,
        approvalStatus: "approved",
        isOnline: true,
        balance: 45.50,
        rating: 4.8,
        totalTrips: 132,
        currentLat: 31.9539,
        currentLng: 35.9106,
      })
      .onConflictDoNothing()
      .returning();
    console.log("✅ Captain 1:", captainUser1.email, c ? "(created)" : "(captain already exists)");
  } else {
    console.log("✅ Captain 1: already exists");
  }

  // Demo captain 2
  const captain2Hash = await bcrypt.hash("cap123", 10);
  const [captainUser2] = await db
    .insert(schema.usersTable)
    .values({ name: "Faris Al-Amri", phone: "0795551002", email: "faris@riden.jo", passwordHash: captain2Hash, role: "captain" })
    .onConflictDoNothing()
    .returning();

  if (captainUser2) {
    const [c] = await db
      .insert(schema.captainsTable)
      .values({
        userId: captainUser2.id,
        licenseNumber: "JO-789012",
        vehicleMake: "Kia",
        vehicleModel: "Sportage",
        vehiclePlate: "34-B-67890",
        vehicleYear: 2022,
        vehicleColor: "Silver",
        isApproved: false,
        approvalStatus: "pending",
        isOnline: false,
        balance: 0,
        rating: 0,
        totalTrips: 0,
      })
      .onConflictDoNothing()
      .returning();
    console.log("✅ Captain 2:", captainUser2.email, c ? "(created)" : "(captain already exists)");
  } else {
    console.log("✅ Captain 2: already exists");
  }

  // Predefined routes
  const routeNames = [
    { name: "Amman Downtown ↔ Airport", pickupArea: "Downtown Amman", dropoffArea: "Queen Alia International Airport", description: "City center to airport express" },
    { name: "Sweifieh ↔ University of Jordan", pickupArea: "Sweifieh", dropoffArea: "University of Jordan", description: "Student route" },
    { name: "Abdali ↔ Mecca Mall", pickupArea: "Abdali Boulevard", dropoffArea: "Mecca Mall", description: "Shopping route" },
    { name: "Zarqa ↔ Amman", pickupArea: "Zarqa City Center", dropoffArea: "Downtown Amman", description: "Inter-city route" },
  ];

  for (const r of routeNames) {
    await db.insert(schema.routesTable).values(r).onConflictDoNothing();
  }
  console.log("✅ Routes seeded");

  // Discount codes
  await db.insert(schema.discountCodesTable).values([
    { code: "WELCOME20", discountPercent: 20, maxUses: 100, isActive: true },
    { code: "RIDEN10", discountPercent: 10, maxUses: 500, isActive: true },
    { code: "FIRST50", discountPercent: 50, maxUses: 50, isActive: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  ]).onConflictDoNothing();
  console.log("✅ Discount codes seeded");

  console.log("\n🎉 Seed complete!");
  console.log("Credentials:");
  console.log("  Admin:     admin@riden.jo / admin123");
  console.log("  Passenger: ahmed@example.com / pass123");
  console.log("  Captain 1: khaled@riden.jo / cap123 (approved)");
  console.log("  Captain 2: faris@riden.jo / cap123 (pending approval)");

  await pool.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
