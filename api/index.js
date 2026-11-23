const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());
const publicDirectory = path.resolve(__dirname, "..", "public");
app.use("/public", express.static(publicDirectory));
app.get("/", (_req, res) => {
  res.type("html").send(fs.readFileSync(path.resolve(publicDirectory, "index.html"), "utf8"));
});

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === "production" || databaseUrl.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : false
    })
  : null;
const jwtSecret = process.env.JWT_SECRET || "development-only-change-this-secret";

const demoUsers = [
  { email: "admin@mess.local", password: "Admin123!", role: "Admin" },
  { email: "manager@mess.local", password: "Manager123!", role: "Manager" },
  { email: "kitchen@mess.local", password: "Kitchen123!", role: "Kitchen" },
  { email: "student@mess.local", password: "Student123!", role: "Student" }
];

let memoryUsers = null;
let memoryBookings = [];
let memoryWaste = [
  { id: 1, mealType: "Lunch", dishName: "Dal Tadka", quantityKg: 12.5, cost: 625, recordedAt: new Date().toISOString() }
];

async function ensureDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mess_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mess_bookings (
      id SERIAL PRIMARY KEY,
      student_email TEXT NOT NULL,
      dining_hall TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      meal_date DATE NOT NULL,
      is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(student_email, dining_hall, meal_type, meal_date)
    );
    CREATE TABLE IF NOT EXISTS mess_waste (
      id SERIAL PRIMARY KEY,
      dining_hall TEXT NOT NULL,
      meal_type TEXT NOT NOT NULL,
      dish_name TEXT NOT NULL,
      quantity_kg NUMERIC NOT NULL,
      cost NUMERIC NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  for (const demo of demoUsers) {
    const existing = await pool.query("SELECT id FROM mess_users WHERE email=$1", [demo.email]);
    if (!existing.rows.length) {
      const hash = await bcrypt.hash(demo.password, 10);
      await pool.query("INSERT INTO mess_users(email,password_hash,role) VALUES($1,$2,$3)", [demo.email, hash, demo.role]);
    }
  }
}

async function initMemory() {
  if (memoryUsers) return;
  memoryUsers = [];
  for (const demo of demoUsers) {
    memoryUsers.push({ ...demo, passwordHash: await bcrypt.hash(demo.password, 10) });
  }
}

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Login required" });
  try {
    req.user = jwt.verify(header.slice(7), jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    mode: pool ? "postgres" : "memory",
    databaseConfigured: Boolean(pool),
    uptimeSeconds: Math.round(process.uptime())
  });
});

app.get("/api/ready", async (_req, res) => {
  try {
    if (pool) {
      await ensureDatabase();
      return res.status(200).json({ status: "ready", mode: "postgres", databaseConfigured: true });
    }
    await initMemory();
    res.status(200).json({ status: "ready", mode: "memory", databaseConfigured: false });
  } catch (error) {
    res.status(503).json({ status: "not_ready", mode: "postgres", databaseConfigured: true, error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  let user;
  if (pool) {
    await ensureDatabase();
    const result = await pool.query("SELECT email, password_hash, role FROM mess_users WHERE email=$1", [email]);
    user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Invalid email or password" });
  } else {
    await initMemory();
    user = memoryUsers.find(x => x.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password" });
  }
  const role = user.role;
  const token = jwt.sign({ email: user.email, role }, jwtSecret, { expiresIn: "8h" });
  res.json({ token, email: user.email, role });
});

app.get("/api/dashboard", auth, async (req, res) => {
  let waste = memoryWaste;
  let bookingCount = memoryBookings.filter(x => !x.isCancelled).length;
  if (pool) {
    await ensureDatabase();
    const wasteResult = await pool.query("SELECT quantity_kg, cost FROM mess_waste");
    waste = wasteResult.rows.map(x => ({ quantityKg: Number(x.quantity_kg), cost: Number(x.cost) }));
    const bookingResult = await pool.query("SELECT COUNT(*)::int AS count FROM mess_bookings WHERE is_cancelled=false");
    bookingCount = bookingResult.rows[0].count;
  }
  res.json({
    role: req.user.role,
    halls: ["North Hall", "South Hall"],
    menu: [
      { mealType: "Breakfast", dishName: "Poha, Tea & Fruit", prepared: 240 },
      { mealType: "Lunch", dishName: "Dal Tadka, Rice & Roti", prepared: 420 },
      { mealType: "Dinner", dishName: "Paneer Curry, Roti & Salad", prepared: 380 }
    ],
    bookingCount,
    wasteKg: waste.reduce((sum, x) => sum + Number(x.quantityKg || x.quantity_kg || 0), 0)
  });
});

app.post("/api/bookings", auth, async (req, res) => {
  const { diningHall = "North Hall", mealType = "Lunch" } = req.body || {};
  const mealDate = new Date().toISOString().slice(0, 10);
  if (mealType === "Lunch" && new Date().getHours() >= 10) return res.status(400).json({ error: "Lunch bookings close at 10:00" });
  if (pool) {
    await ensureDatabase();
    await pool.query(
      "INSERT INTO mess_bookings(student_email,dining_hall,meal_type,meal_date) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [req.user.email, diningHall, mealType, mealDate]
    );
  } else {
    if (memoryBookings.some(x => x.studentEmail === req.user.email && x.diningHall === diningHall && x.mealType === mealType && x.mealDate === mealDate && !x.isCancelled)) {
      return res.status(409).json({ error: "You already have this meal booked" });
    }
    memoryBookings.push({ id: memoryBookings.length + 1, studentEmail: req.user.email, diningHall, mealType, mealDate, isCancelled: false });
  }
  res.status(201).json({ success: true });
});

app.post("/api/waste", auth, async (req, res) => {
  if (!["Admin", "Manager", "Kitchen"].includes(req.user.role)) return res.status(403).json({ error: "Not authorized" });
  const { diningHall = "North Hall", mealType = "Lunch", dishName = "Dal", quantityKg = 0, cost = 0 } = req.body || {};
  if (pool) {
    await ensureDatabase();
    await pool.query("INSERT INTO mess_waste(dining_hall,meal_type,dish_name,quantity_kg,cost) VALUES($1,$2,$3,$4,$5)", [diningHall, mealType, dishName, quantityKg, cost]);
  } else {
    memoryWaste.push({ id: memoryWaste.length + 1, diningHall, mealType, dishName, quantityKg, cost, recordedAt: new Date().toISOString() });
  }
  res.status(201).json({ success: true });
});

app.get("/api/waste", auth, async (_req, res) => {
  if (pool) {
    await ensureDatabase();
    const result = await pool.query("SELECT * FROM mess_waste ORDER BY recorded_at DESC LIMIT 100");
    return res.json(result.rows);
  }
  res.json(memoryWaste);
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`MessForecast API listening on http://localhost:${port}`));
}

module.exports = app;
