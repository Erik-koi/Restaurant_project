const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const crypto = require("crypto");

const app = express();
const PORT = 3000;
const API = "https://media2.edu.metropolia.fi/restaurant/api/v1";
const publicDirectory = path.join(__dirname, "public");
const dataDirectory = path.join(__dirname, "data");
const favoritesFile = path.join(dataDirectory, "favorites.json");
const usersFile = path.join(dataDirectory, "users.json");
const reservationsFile = path.join(dataDirectory, "reservations.json");
const tableCount = 7;
const reservationDurationMinutes = 120;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(express.static(publicDirectory));

function ensureFavoritesFile() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(favoritesFile)) {
    fs.writeFileSync(favoritesFile, JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(reservationsFile)) {
    fs.writeFileSync(reservationsFile, JSON.stringify([], null, 2));
  }
}

function readUsers() {
  ensureFavoritesFile();
  try {
    const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureFavoritesFile();
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function readReservations() {
  ensureFavoritesFile();
  try {
    const reservations = JSON.parse(fs.readFileSync(reservationsFile, "utf8"));
    return Array.isArray(reservations) ? reservations : [];
  } catch {
    return [];
  }
}

function writeReservations(reservations) {
  ensureFavoritesFile();
  fs.writeFileSync(reservationsFile, JSON.stringify(reservations, null, 2));
}

function removeExpiredReservations() {
  const reservations = readReservations();
  const activeReservations = reservations.filter(
    (reservation) => Date.parse(reservation.endsAt) > Date.now(),
  );

  if (activeReservations.length !== reservations.length) {
    writeReservations(activeReservations);
  }

  return activeReservations;
}

function getReservationInterval(startsAt) {
  const start = new Date(startsAt);

  if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
    return null;
  }

  return {
    start,
    end: new Date(start.getTime() + reservationDurationMinutes * 60 * 1000),
  };
}

function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

function requireRegisteredUser(req, res, next) {
  if (req.session.user?.role !== "user") {
    return res.status(401).json({ error: "Please log in to reserve a table" });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

function publicUser(user) {
  return {
    name: user.name,
    email: user.email,
    registeredAt: user.registeredAt,
  };
}

function readFavorites() {
  ensureFavoritesFile();
  try {
    return JSON.parse(fs.readFileSync(favoritesFile, "utf8"));
  } catch {
    return {};
  }
}

function writeFavorites(data) {
  fs.writeFileSync(favoritesFile, JSON.stringify(data, null, 2));
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getFavoritesByEmail(email) {
  const data = readFavorites();
  return Array.isArray(data[email]?.favorites) ? data[email].favorites : [];
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "Could not log out" });
    }

    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.post("/api/users", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email and password are required" });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res
      .status(400)
      .json({ error: "Please enter a valid email address" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  const users = readUsers();
  if (users.some((user) => user.email === email)) {
    return res
      .status(409)
      .json({ error: "A user with that email already exists" });
  }

  const user = {
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    registeredAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  req.session.user = { ...publicUser(user), role: "user" };

  res.status(201).json(publicUser(user));
});

app.post("/api/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (email === "admin" && password === "admin123") {
    req.session.user = { name: "admin", email: "admin", role: "admin" };
    return res.json({ name: "admin", email: "admin", role: "admin" });
  }

  const user = readUsers().find((item) => item.email === email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  req.session.user = { ...publicUser(user), role: "user" };
  res.json(publicUser(user));
});

app.patch("/api/users/:email", (req, res) => {
  const email = normalizeEmail(req.params.email);
  const name = String(req.body.name || "").trim();

  if (req.session.user?.email !== email) {
    return res.status(401).json({ error: "Please log in to update your profile" });
  }

  const users = readUsers();
  const user = users.find((item) => item.email === email);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  user.name = name;
  writeUsers(users);
  res.json(publicUser(user));
});

app.get("/api/users", requireAdmin, (req, res) => {
  res.json(readUsers().map(publicUser));
});

app.get("/api/reservations/availability", (req, res) => {
  const interval = getReservationInterval(req.query.startsAt);

  if (!interval) {
    return res.status(400).json({ error: "Choose a future time" });
  }

  const overlappingReservations = removeExpiredReservations().filter(
    (reservation) =>
      intervalsOverlap(
        interval.start.getTime(),
        interval.end.getTime(),
        Date.parse(reservation.startsAt),
        Date.parse(reservation.endsAt),
      ),
  );

  res.json(overlappingReservations.map((reservation) => reservation.tableNumber));
});

app.post("/api/reservations", requireRegisteredUser, (req, res) => {
  const tableNumber = Number(req.body.tableNumber);
  const interval = getReservationInterval(req.body.startsAt);

  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > tableCount) {
    return res.status(400).json({ error: "Choose a valid table" });
  }

  if (!interval) {
    return res.status(400).json({ error: "Choose a future time" });
  }

  const reservations = removeExpiredReservations();
  const tableIsReserved = reservations.some(
    (reservation) =>
      reservation.tableNumber === tableNumber &&
      intervalsOverlap(
        interval.start.getTime(),
        interval.end.getTime(),
        Date.parse(reservation.startsAt),
        Date.parse(reservation.endsAt),
      ),
  );

  if (tableIsReserved) {
    return res.status(409).json({ error: "This table is already reserved for that time" });
  }

  const reservation = {
    id: crypto.randomUUID(),
    tableNumber,
    userName: req.session.user.name,
    userEmail: req.session.user.email,
    startsAt: interval.start.toISOString(),
    endsAt: interval.end.toISOString(),
  };
  reservations.push(reservation);
  writeReservations(reservations);

  res.status(201).json(reservation);
});

app.get("/api/admin/reservations", requireAdmin, (req, res) => {
  const reservations = removeExpiredReservations().sort(
    (first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt),
  );
  res.json(reservations);
});

app.delete("/api/admin/reservations/:id", requireAdmin, (req, res) => {
  const reservations = removeExpiredReservations();
  const remainingReservations = reservations.filter(
    (reservation) => reservation.id !== req.params.id,
  );

  if (remainingReservations.length === reservations.length) {
    return res.status(404).json({ error: "Reservation not found" });
  }

  writeReservations(remainingReservations);
  res.json({ ok: true });
});

app.get("/api/favorites", (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  res.json(getFavoritesByEmail(email));
});

app.post("/api/favorites", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const restaurantId = String(req.body.restaurantId || "").trim();

  if (!email || !restaurantId) {
    return res
      .status(400)
      .json({ error: "Email and restaurantId are required" });
  }

  const data = readFavorites();
  const favorites = new Set(data[email]?.favorites || []);
  favorites.add(restaurantId);
  data[email] = { favorites: [...favorites] };
  writeFavorites(data);

  res.json(getFavoritesByEmail(email));
});

app.delete("/api/favorites/:restaurantId", (req, res) => {
  const email = normalizeEmail(req.query.email);
  const restaurantId = req.params.restaurantId;

  if (!email || !restaurantId) {
    return res
      .status(400)
      .json({ error: "Email and restaurantId are required" });
  }

  const data = readFavorites();
  const favorites = (data[email]?.favorites || []).filter(
    (id) => id !== restaurantId,
  );
  data[email] = { favorites };
  writeFavorites(data);

  res.json(getFavoritesByEmail(email));
});

app.get("/api/restaurants", async (req, res) => {
  try {
    const response = await fetch(`${API}/restaurants`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "API error" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to fetch restaurants" });
  }
});

app.get("/api/restaurants/:id", async (req, res) => {
  try {
    const response = await fetch(`${API}/restaurants`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "API error" });
    }
    const data = await response.json();
    const restaurant = data.find((r) => r._id === req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(restaurant);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to fetch restaurant" });
  }
});

app.get("/api/restaurants/daily/:id/:lang", async (req, res) => {
  try {
    const { id, lang } = req.params;
    const response = await fetch(`${API}/restaurants/daily/${id}/${lang}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "API error" });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

removeExpiredReservations();
const reservationCleanup = setInterval(removeExpiredReservations, 60 * 1000);
reservationCleanup.unref();

app.listen(PORT, () => {
  console.log(`SERVER: http://localhost:${PORT}`);
});
