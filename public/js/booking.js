const TABLE_COUNT = 7;
const RESERVATION_DURATION_MINUTES = 120;
const startInput = document.getElementById("reservationStart");
const tableList = document.getElementById("tableList");
const availableCount = document.getElementById("availableCount");
const reservationMessage = document.getElementById("reservationMessage");
const loginPrompt = document.getElementById("loginPrompt");

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("restaurant_current_user") || "null");
  } catch {
    return null;
  }
}

function toLocalDateTimeValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function setReservationMessage(message, type = "") {
  reservationMessage.textContent = message;
  reservationMessage.className = `reservation-message ${type}`;
}

function renderTables(reservedTables) {
  tableList.replaceChildren();
  const availableTables = Array.from(
    { length: TABLE_COUNT },
    (_, index) => index + 1,
  ).filter((tableNumber) => !reservedTables.has(tableNumber));

  availableCount.textContent = `${availableTables.length} / ${TABLE_COUNT}`;

  availableTables.forEach((tableNumber) => {
    const tableButton = document.createElement("button");
    tableButton.type = "button";
    tableButton.className = "table-card";

    const number = document.createElement("span");
    number.className = "table-number";
    number.textContent = String(tableNumber).padStart(2, "0");

    const label = document.createElement("p");
    label.textContent = `Table ${String(tableNumber).padStart(2, "0")}`;

    tableButton.append(number, label);
    tableButton.addEventListener("click", () => reserveTable(tableNumber));
    tableList.appendChild(tableButton);
  });

  if (availableTables.length === 0) {
    setReservationMessage("No tables are available for this time.");
  }
}

async function loadAvailability() {
  const startsAt = new Date(startInput.value);

  if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    tableList.replaceChildren();
    availableCount.textContent = `0 / ${TABLE_COUNT}`;
    setReservationMessage("Choose a future date and time.", "error");
    return;
  }

  try {
    const query = new URLSearchParams({
      startsAt: startsAt.toISOString(),
    });
    const response = await fetch(`/api/reservations/availability?${query}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Could not load tables");

    setReservationMessage("");
    renderTables(new Set(data));
  } catch (error) {
    tableList.replaceChildren();
    availableCount.textContent = `0 / ${TABLE_COUNT}`;
    setReservationMessage(error.message, "error");
  }
}

async function reserveTable(tableNumber) {
  const currentUser = getCurrentUser();
  if (!currentUser?.email || currentUser.email === "admin") {
    loginPrompt.hidden = false;
    setReservationMessage("Log in with a registered account to reserve a table.", "error");
    return;
  }

  const startsAt = new Date(startInput.value);

  try {
    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNumber,
        startsAt: startsAt.toISOString(),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) loginPrompt.hidden = false;
      throw new Error(data.error || "Could not reserve this table");
    }

    loginPrompt.hidden = true;
    await loadAvailability();
    setReservationMessage(
      `Table ${String(tableNumber).padStart(2, "0")} reserved until ${new Date(data.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      "success",
    );
  } catch (error) {
    await loadAvailability();
    setReservationMessage(error.message, "error");
  }
}

const firstAvailableTime = new Date(Date.now() + 15 * 60 * 1000);
firstAvailableTime.setMinutes(Math.ceil(firstAvailableTime.getMinutes() / 15) * 15, 0, 0);
startInput.min = toLocalDateTimeValue(firstAvailableTime);
startInput.value = startInput.min;
loginPrompt.hidden = Boolean(getCurrentUser()?.email);

startInput.addEventListener("change", loadAvailability);
loadAvailability();
setInterval(loadAvailability, 60 * 1000);