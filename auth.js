const USERS_KEY = "restaurant_users";
const CURRENT_USER_KEY = "restaurant_current_user";
const FAVORITES_PREFIX = "restaurant_favorites_";

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

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

function handleRegistration(event) {
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

  const users = getUsers();
  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    setMessage("A user with that email already exists.", "error");
    return;
  }

  const newUser = { name, email, password };
  users.push(newUser);
  saveUsers(users);
  saveCurrentUser({ name, email });
  ensureUserFavorites(email);

  registerForm.reset();
  setMessage("Registration successful! You are now logged in.", "success");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 800);
}

function handleLogin(event) {
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

  if (email === "admin" && password === "admin123") {
    saveCurrentUser({ name: "admin", email: "admin" });
    ensureUserFavorites("admin");
    loginForm.reset();
    setMessage("Login successful!", "success");

    setTimeout(() => {
      window.location.href = "adminpage.html";
    }, 800);
    return;
  }

  if (!validateEmail(email)) {
    setMessage("Please enter a valid email address.", "error");
    return;
  }

  const users = getUsers();
  const user = users.find(
    (item) => item.email === email && item.password === password,
  );

  if (!user) {
    setMessage("Invalid email or password.", "error");
    return;
  }

  saveCurrentUser({ name: user.name, email: user.email });
  ensureUserFavorites(user.email);
  loginForm.reset();
  setMessage("Login successful!", "success");

  setTimeout(() => {
    window.location.href = "index.html";
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
