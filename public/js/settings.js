const CURRENT_USER_KEY = "restaurant_current_user";
const settingsForm = document.getElementById("settingsForm");
const settingsName = document.getElementById("settingsName");
const settingsEmail = document.getElementById("settingsEmail");
const settingsMessage = document.getElementById("settingsMessage");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
const avatarMessage = document.getElementById("avatarMessage");
const saveAvatarButton = document.getElementById("saveAvatarButton");
const removeAvatarButton = document.getElementById("removeAvatarButton");
const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/128/1077/1077063.png";
const MAX_AVATAR_SIZE = 1.5 * 1024 * 1024;
let selectedAvatar = "";

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

function getAvatarKey(email) {
  return `restaurant_avatar_${email.toLowerCase()}`;
}

function showAvatarMessage(message, type = "") {
  avatarMessage.textContent = message;
  avatarMessage.className = `settings-message ${type}`;
}

const currentUser = getCurrentUser();

if (!currentUser?.email) {
  window.location.href = "login.html";
} else {
  settingsName.value = currentUser.name || "";
  settingsEmail.value = currentUser.email;
  avatarPreview.src =
    localStorage.getItem(getAvatarKey(currentUser.email)) || DEFAULT_AVATAR;
}

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showAvatarMessage("Choose an image file.", "error");
    avatarInput.value = "";
    return;
  }

  if (file.size > MAX_AVATAR_SIZE) {
    showAvatarMessage("Image must be 1.5 MB or smaller.", "error");
    avatarInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    selectedAvatar = reader.result;
    avatarPreview.src = selectedAvatar;
    saveAvatarButton.disabled = false;
    showAvatarMessage("Preview ready. Save to apply your photo.");
  });
  reader.readAsDataURL(file);
});

saveAvatarButton.addEventListener("click", () => {
  if (!selectedAvatar || !currentUser?.email) return;

  try {
    localStorage.setItem(getAvatarKey(currentUser.email), selectedAvatar);
    selectedAvatar = "";
    avatarInput.value = "";
    saveAvatarButton.disabled = true;
    showAvatarMessage("Profile photo saved.", "success");
  } catch (error) {
    showAvatarMessage("Could not save this image in the browser.", "error");
  }
});

removeAvatarButton.addEventListener("click", () => {
  if (!currentUser?.email) return;

  localStorage.removeItem(getAvatarKey(currentUser.email));
  selectedAvatar = "";
  avatarInput.value = "";
  avatarPreview.src = DEFAULT_AVATAR;
  saveAvatarButton.disabled = true;
  showAvatarMessage("Profile photo removed.", "success");
});

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
