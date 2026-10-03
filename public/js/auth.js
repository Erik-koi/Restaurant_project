const CURRENT_USER_KEY = "restaurant_current_user";
const FAVORITES_PREFIX = "restaurant_favorites_";
const AUTH_API = "/api";
const redirectAfterLogin = new URLSearchParams(window.location.search).get(
  "redirect",
);

const authMessage = document.getElementById("authMessage");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function setMessage(message, type = "error") {
  if (!authMessage) {
    return;
  }

  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function getUserFavoritesKey(email) {
  return `${FAVORITES_PREFIX}${String(email || "guest").toLowerCase()}`;
}

function ensureUserFavorites(email) {
  const key = getUserFavoritesKey(email);
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify([]));
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleRegistration(event) {
  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document
    .getElementById("registerEmail")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!name || !email || !password || !confirmPassword) {
    setMessage("Fill in all fields.", "error");
    return;
  }

  if (!validateEmail(email)) {
    setMessage("Please enter a valid email address.", "error");
    return;
  }

  if (password.length < 6) {
    setMessage("Password must be at least 6 characters long.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("Passwords do not match.", "error");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Registration failed.", "error");
      return;
    }

    saveCurrentUser(data);
    ensureUserFavorites(email);
  } catch (error) {
    setMessage("Could not connect to the server.", "error");
    return;
  }

  registerForm.reset();
  setMessage("Registration successful! You are now logged in.", "success");

  setTimeout(() => {
    window.location.href = "../index.html";
  }, 800);
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document
    .getElementById("loginEmail")
    .value.trim()
    .toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    setMessage("Enter email and password.", "error");
    return;
  }

  if (email !== "admin" && !validateEmail(email)) {
    setMessage("Please enter a valid email address.", "error");
    return;
  }

  try {
    const response = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Invalid email or password.", "error");
      return;
    }

    saveCurrentUser(data);
    ensureUserFavorites(data.email);
  } catch (error) {
    setMessage("Could not connect to the server.", "error");
    return;
  }
  loginForm.reset();
  setMessage("Login successful!", "success");

  setTimeout(() => {
    window.location.href =
      redirectAfterLogin ||
      (data.role === "admin" ? "admin.html" : "../index.html");
  }, 800);
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

if (registerForm) {
  registerForm.addEventListener("submit", handleRegistration);
}

if (document.body.classList.contains("auth-page")) {
  const currentUser = JSON.parse(
    localStorage.getItem(CURRENT_USER_KEY) || "null",
  );
  if (currentUser) {
    setMessage(`You are already logged in as ${currentUser.name}.`, "success");
  }
}
