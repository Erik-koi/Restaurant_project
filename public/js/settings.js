const CURRENT_USER_KEY = "restaurant_current_user";
const settingsForm = document.getElementById("settingsForm");
const settingsName = document.getElementById("settingsName");
const settingsEmail = document.getElementById("settingsEmail");
const settingsMessage = document.getElementById("settingsMessage");

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
  } catch {
    return null;
  }
}

function showMessage(message, type = "") {
  settingsMessage.textContent = message;
  settingsMessage.className = `settings-message ${type}`;
}

const currentUser = getCurrentUser();

if (!currentUser?.email) {
  window.location.href = "login.html";
} else {
  settingsName.value = currentUser.name || "";
  settingsEmail.value = currentUser.email;
}

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = settingsName.value.trim();

  if (!name) {
    showMessage("Enter a name.", "error");
    return;
  }

  try {
    const response = await fetch(
      `/api/users/${encodeURIComponent(currentUser.email)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      },
    );
    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || "Could not update your name.", "error");
      return;
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
    showMessage("Your name has been updated.", "success");
  } catch (error) {
    showMessage("Could not connect to the server.", "error");
  }
});
