import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, captainsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterPassengerBody, RegisterCaptainBody } from "@workspace/api-zod";
import { signToken, requireAuth, getUser } from "../lib/auth";
import { formatUser, formatCaptain } from "../lib/helpers";

const router = Router();

// POST /api/auth/register/passenger
router.post("/auth/register/passenger", async (req, res) => {
  const parsed = RegisterPassengerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, phone, email, password } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, phone, email, passwordHash, role: "passenger" }).returning();

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: formatUser(user) });
});

// POST /api/auth/register/captain
router.post("/auth/register/captain", async (req, res) => {
  const parsed = RegisterCaptainBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, phone, email, password, licenseNumber, vehicleMake, vehicleModel, vehiclePlate, vehicleYear, vehicleColor } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, phone, email, passwordHash, role: "captain" }).returning();
  const [captain] = await db.insert(captainsTable).values({
    userId: user.id,
    licenseNumber,
    vehicleMake,
    vehicleModel,
    vehiclePlate,
    vehicleYear,
    vehicleColor,
  }).returning();

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: formatCaptain(user, captain) });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ id: user.id, role: user.role });

  if (user.role === "captain") {
    const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.userId, user.id));
    if (captain) {
      res.json({ token, user: formatCaptain(user, captain) });
      return;
    }
  }

  res.json({ token, user: formatUser(user) });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const user = await getUser(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === "captain") {
    const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.userId, user.id));
    if (captain) {
      res.json(formatCaptain(user, captain));
      return;
    }
  }

  res.json(formatUser(user));
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  res.json({ success: true });
});

export default router;
