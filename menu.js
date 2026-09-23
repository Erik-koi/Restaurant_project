const API = "https://media2.edu.metropolia.fi/restaurant/api/v1";
const FAVORITES_API = "http://localhost:3000/api/favorites";

const restaurantList = document.getElementById("restaurantList");
const menuBox = document.getElementById("menuBox");
const menuOverlay = document.getElementById("menuOverlay");
const menuTitle = document.getElementById("menuTitle");
const menuCourses = document.getElementById("menuCourses");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const favoritesBar = document.getElementById("favoritesBar");
const favoriteRestaurantBtn = document.getElementById("favoriteRestaurantBtn");

let restaurantsCache = [];
let currentRestaurant = null;

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("restaurant_current_user") || "null",
    );
  } catch {
    return null;
  }
}

async function getFavorites() {
  const user = getCurrentUser();
  if (!user?.email) return [];

  try {
    const res = await fetch(
      `${FAVORITES_API}?email=${encodeURIComponent(user.email)}`,
    );
    if (!res.ok) throw new Error("Failed to load favorites");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function addFavorite(restaurantId) {
  const user = getCurrentUser();
  if (!user?.email) return false;

  const res = await fetch(FAVORITES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, restaurantId }),
  });

  return res.ok;
}

async function removeFavorite(restaurantId) {
  const user = getCurrentUser();
  if (!user?.email) return false;

  const res = await fetch(
    `${FAVORITES_API}/${encodeURIComponent(restaurantId)}?email=${encodeURIComponent(user.email)}`,
    { method: "DELETE" },
  );

  return res.ok;
}

function updateFavoriteButton() {
  if (!favoriteRestaurantBtn || !currentRestaurant) return;
  const active =
    currentRestaurant &&
    restaurantsCache.some((restaurant) => {
      return (
        restaurant._id === currentRestaurant._id && getCurrentUser()?.email
      );
    });
  favoriteRestaurantBtn.textContent = active
    ? "Remove from favorites"
    : "Add to favorites";
  favoriteRestaurantBtn.classList.toggle("active", active);
}

async function renderFavorites() {
  if (!favoritesBar) return;

  const user = getCurrentUser();
  if (!user?.email) {
    favoritesBar.innerHTML =
      '<p class="favorites-empty">Register or log in to save favorite restaurants.</p>';
    return;
  }

  const favorites = await getFavorites();
  const favoriteRestaurants = restaurantsCache.filter((restaurant) =>
    favorites.includes(restaurant._id),
  );

  if (!favoriteRestaurants.length) {
    favoritesBar.innerHTML =
      '<p class="favorites-empty">No favorite restaurants yet.</p>';
    return;
  }

  favoritesBar.innerHTML = `
    <div class="favorites-list">
      ${favoriteRestaurants
        .map(
          (restaurant) => `
            <span class="favorite-chip">
              ${restaurant.name}
              <button type="button" data-remove-favorite="${restaurant._id}" aria-label="Remove ${restaurant.name}">×</button>
            </span>
          `,
        )
        .join("")}
    </div>
  `;

  favoritesBar.querySelectorAll("[data-remove-favorite]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const id = button.getAttribute("data-remove-favorite");
      await removeFavorite(id);
      await renderFavorites();
      await renderFavoriteIndicators();
      updateFavoriteButton();
    });
  });
}

async function renderFavoriteIndicators() {
  if (!restaurantList) return;

  const favorites = await getFavorites();
  restaurantList.querySelectorAll(".favorite-toggle").forEach((button) => {
    const id = button.getAttribute("data-restaurant-id");
    const active = favorites.includes(id);
    button.textContent = active ? "♥" : "♡";
    button.classList.toggle("active", active);
    button.setAttribute(
      "aria-label",
      active ? "Remove favorite" : "Add favorite",
    );
  });
}

async function toggleFavorite(restaurant) {
  if (!restaurant?._id) return;

  const user = getCurrentUser();
  if (!user?.email) {
    alert("Please register or log in to save favorite restaurants.");
    return;
  }

  const favorites = await getFavorites();
  const isAlreadyFavorite = favorites.includes(restaurant._id);

  if (isAlreadyFavorite) {
    await removeFavorite(restaurant._id);
  } else {
    await addFavorite(restaurant._id);
  }

  await renderFavorites();
  await renderFavoriteIndicators();
  updateFavoriteButton();
}

async function loadRestaurants() {
  try {
    const res = await fetch(`${API}/restaurants`);
    if (!res.ok) throw new Error("Failed to load restaurants");

    restaurantsCache = (await res.json()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    restaurantList.innerHTML = "";

    restaurantsCache.forEach((restaurant) => {
      const card = document.createElement("div");
      card.className = "restaurant-card";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "restaurant-item";
      btn.innerHTML = `
        <strong>${restaurant.name}</strong>
        <span>${restaurant.address || ""}, ${restaurant.city || ""}</span>
      `;
      btn.addEventListener("click", () => showMenu(restaurant));

      const favoriteBtn = document.createElement("button");
      favoriteBtn.type = "button";
      favoriteBtn.className = "favorite-toggle";
      favoriteBtn.dataset.restaurantId = restaurant._id;
      favoriteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await toggleFavorite(restaurant);
      });

      card.appendChild(btn);
      card.appendChild(favoriteBtn);
      restaurantList.appendChild(card);
    });

    await renderFavoriteIndicators();
    await renderFavorites();
  } catch (err) {
    restaurantList.innerHTML =
      '<p class="empty-menu">Could not load restaurants. Are you on Metropolia network / VPN?</p>';
    console.error(err);
  }
}

async function showMenu(restaurant) {
  currentRestaurant = restaurant;
  menuTitle.textContent = restaurant.name;
  menuCourses.innerHTML = "Loading...";
  menuOverlay.classList.remove("hidden");
  menuBox.classList.remove("hidden");

  const favorites = await getFavorites();
  const isActive = favorites.includes(restaurant._id);
  favoriteRestaurantBtn.textContent = isActive
    ? "Remove from favorites"
    : "Add to favorites";
  favoriteRestaurantBtn.classList.toggle("active", isActive);

  try {
    const res = await fetch(`${API}/restaurants/daily/${restaurant._id}/en`);
    if (!res.ok) throw new Error("Failed to load menu");

    const data = await res.json();
    const courses = data.courses || [];
    menuCourses.innerHTML = "";

    if (!courses.length) {
      menuCourses.innerHTML = '<p class="empty-menu">No menu for today</p>';
      return;
    }

    courses.forEach((course) => {
      const div = document.createElement("div");
      div.className = "course";
      div.innerHTML = `
        <div class="course-name">${course.name || "—"}</div>
        <div class="course-meta">${course.price || ""} ${course.diets ? "· " + course.diets : ""}</div>
      `;
      menuCourses.appendChild(div);
    });
  } catch (err) {
    menuCourses.innerHTML = '<p class="empty-menu">No menu available</p>';
    console.error(err);
  }
}

function closeMenu() {
  menuOverlay.classList.add("hidden");
  menuBox.classList.add("hidden");
}

if (favoriteRestaurantBtn) {
  favoriteRestaurantBtn.addEventListener("click", () => {
    if (currentRestaurant) toggleFavorite(currentRestaurant);
  });
}

if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);
if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeMenu);

loadRestaurants();
