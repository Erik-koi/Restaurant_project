const usersTableBody = document.getElementById("usersTableBody");
const usersMessage = document.getElementById("usersMessage");

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

loadUsers();
