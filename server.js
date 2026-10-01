const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;
const API = "https://media2.edu.metropolia.fi/restaurant/api/v1";
const publicDirectory = path.join(__dirname, "public");
const dataDirectory = path.join(__dirname, "data");
const favoritesFile = path.join(dataDirectory, "favorites.json");
const usersFile = path.join(dataDirectory, "users.json");

app.use(cors());
app.use(express.json());
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

  res.status(201).json(publicUser(user));
});

app.post("/api/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const user = readUsers().find((item) => item.email === email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json(publicUser(user));
});

app.patch("/api/users/:email", (req, res) => {
  const email = normalizeEmail(req.params.email);
  const name = String(req.body.name || "").trim();
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

app.get("/api/users", (req, res) => {
  res.json(readUsers().map(publicUser));
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

app.listen(PORT, () => {
  console.log(`SERVER: http://localhost:${PORT}`);
});
