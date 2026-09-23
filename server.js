const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const API = "https://media2.edu.metropolia.fi/restaurant/api/v1";
const favoritesFile = path.join(__dirname, "favorites.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function ensureFavoritesFile() {
  if (!fs.existsSync(favoritesFile)) {
    fs.writeFileSync(favoritesFile, JSON.stringify({}, null, 2));
  }
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
