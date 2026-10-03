const usersTableBody = document.getElementById("usersTableBody");
const usersMessage = document.getElementById("usersMessage");
const reservationsTableBody = document.getElementById("reservationsTableBody");
const reservationsMessage = document.getElementById("reservationsMessage");

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(cell);
}

async function loadUsers() {
  try {
    const response = await fetch("/api/users");
    if (!response.ok) throw new Error("Failed to load users");

    const users = await response.json();
    usersTableBody.replaceChildren();

    if (!users.length) {
      usersMessage.textContent = "No registered users yet.";
      return;
    }

    usersMessage.textContent = `${users.length} registered user${users.length === 1 ? "" : "s"}`;
    users.forEach((user) => {
      const row = document.createElement("tr");
      addCell(row, user.name);
      addCell(row, user.email);
      addCell(
        row,
        user.registeredAt ? new Date(user.registeredAt).toLocaleString() : "-",
      );
      usersTableBody.appendChild(row);
    });
  } catch (error) {
    usersMessage.textContent = "Could not load users from the server.";
  }
}

function addReservationCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(cell);
  return cell;
}

function formatReservationTime(value) {
  return new Date(value).toLocaleString();
}

async function loadReservations() {
  try {
    const response = await fetch("/api/admin/reservations");
    const reservations = await response.json();
    if (!response.ok) throw new Error(reservations.error || "Could not load reservations");

    reservationsTableBody.replaceChildren();
    reservationsMessage.textContent = reservations.length
      ? `${reservations.length} active reservation${reservations.length === 1 ? "" : "s"}`
      : "No active reservations.";

    reservations.forEach((reservation) => {
      const row = document.createElement("tr");
      addReservationCell(row, `Table ${String(reservation.tableNumber).padStart(2, "0")}`);
      addReservationCell(row, reservation.userName);
      addReservationCell(row, reservation.userEmail);
      addReservationCell(row, formatReservationTime(reservation.startsAt));
      addReservationCell(row, formatReservationTime(reservation.endsAt));

      const actionCell = addReservationCell(row, "");
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-reservation-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", async () => {
        const removeResponse = await fetch(
          `/api/admin/reservations/${encodeURIComponent(reservation.id)}`,
          { method: "DELETE" },
        );
        if (removeResponse.ok) {
          await loadReservations();
        } else {
          reservationsMessage.textContent = "Could not remove this reservation.";
        }
      });
      actionCell.appendChild(removeButton);
      reservationsTableBody.appendChild(row);
    });
  } catch (error) {
    reservationsMessage.textContent = error.message;
  }
}

loadUsers();
loadReservations();
setInterval(loadReservations, 30 * 1000);
