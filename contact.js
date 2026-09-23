let allRestaurants = [];
let map;
let markersLayer;

document.addEventListener("DOMContentLoaded", async () => {
  const listEl = document.getElementById("restaurant-list");
  const cityFilter = document.getElementById("cityFilter");
  const countLabel = document.getElementById("countLabel");

  if (!listEl || !cityFilter) {
    return;
  }

  if (typeof L === "undefined") {
    console.error(
      "Leaflet library is not loaded. Please check your script includes.",
    );
    return;
  }

  map = L.map("map").setView([62.5, 25.0], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  try {
    const res = await fetch(
      "https://media2.edu.metropolia.fi/restaurant/api/v1/restaurants",
    );
    if (!res.ok) throw new Error("error " + res.status);
    allRestaurants = await res.json();
  } catch (err) {
    listEl.textContent = "Error loading restaurants.";
    console.error("error fetch:", err);
    return;
  }

  const cities = [...new Set(allRestaurants.map((r) => r.city))].sort();
  cities.forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    cityFilter.appendChild(opt);
  });

  render(allRestaurants);

  cityFilter.addEventListener("change", () => {
    const city = cityFilter.value;
    const filtered = city
      ? allRestaurants.filter((r) => r.city === city)
      : allRestaurants;
    render(filtered);
  });

  function render(data) {
    listEl.innerHTML = "";
    markersLayer.clearLayers();
    countLabel.textContent = `Found: ${data.length}`;

    data.forEach((r) => {
      const card = document.createElement("div");
      card.className = "restaurant-card";
      card.innerHTML = `
        <h3>${r.name}</h3>
        <p>${r.address}, ${r.postalCode}, ${r.city}</p>
        <p class="company">${r.company}</p>
      `;
      card.addEventListener("click", () => openModal(r));
      listEl.appendChild(card);

      if (r.location && r.location.coordinates) {
        const [lng, lat] = r.location.coordinates;
        const marker = L.marker([lat, lng]);
        marker.bindPopup(
          `<strong>${r.name}</strong><br>${r.address}, ${r.city}`,
        );
        marker.on("click", () => openModal(r));
        markersLayer.addLayer(marker);
      }
    });
  }

  const modalOverlay = document.getElementById("modalOverlay");
  const modalClose = document.getElementById("modalClose");

  function openModal(r) {
    document.getElementById("modalTitle").textContent = r.name;
    document.getElementById("modalAddress").textContent = r.address;
    document.getElementById("modalCity").textContent = r.city;
    document.getElementById("modalPostal").textContent = r.postalCode;
    document.getElementById("modalPhone").textContent = r.phone || "-";
    document.getElementById("modalCompany").textContent = r.company || "-";
    modalOverlay.classList.add("show");
  }

  function closeModal() {
    modalOverlay.classList.remove("show");
  }

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
});
