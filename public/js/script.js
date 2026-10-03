const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");
let current = 0;
let timer;

function showSlide(index) {
  slides.forEach((slide) => slide.classList.remove("active"));
  dots.forEach((dot) => dot.classList.remove("active"));
  if (slides[index]) slides[index].classList.add("active");
  if (dots[index]) dots[index].classList.add("active");
  current = index;
}

function nextSlide() {
  if (slides.length === 0) return;
  let next = (current + 1) % slides.length;
  showSlide(next);
}

function startSlider() {
  if (slides.length > 0) {
    timer = setInterval(nextSlide, 4000);
  }
}

if (slides.length > 0) {
  startSlider();
}

const menuBtn = document.getElementById("menuBtn");
const popup = document.getElementById("popup");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("closeBtn");

function openMenu() {
  if (popup && overlay) {
    popup.classList.add("show");
    overlay.classList.add("show");
  }
}

function closeMenu() {
  if (popup && overlay) {
    popup.classList.remove("show");
    overlay.classList.remove("show");
  }
}

if (menuBtn) menuBtn.addEventListener("click", openMenu);
if (closeBtn) closeBtn.addEventListener("click", closeMenu);
if (overlay) overlay.addEventListener("click", closeMenu);

const settingsBtn = document.getElementById("settingsBtn");
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    closeMenu();
    const inPagesDirectory = window.location.pathname.includes("/pages/");
    const settingsPath = inPagesDirectory
      ? "settings.html"
      : "pages/settings.html";
    const loginPath = inPagesDirectory
      ? "login.html?redirect=settings.html"
      : "pages/login.html?redirect=pages/settings.html";
    const currentUser = localStorage.getItem("restaurant_current_user");
    window.location.href = currentUser ? settingsPath : loginPath;
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("restaurant_current_user");
    localStorage.removeItem("currentUser");
    const avatar = accountBtn?.querySelector("img");
    if (avatar) {
      avatar.src = "https://cdn-icons-png.flaticon.com/128/1077/1077063.png";
      avatar.alt = "account";
      avatar.classList.remove("account-avatar");
    }
    closeMenu();
    alert("You have been logged out.");
  });
}

const accountBtn = document.getElementById("accountBtn");
const accountPopupBtn = document.getElementById("accountPopupBtn");
const accountAvatar = accountBtn?.querySelector("img");

if (accountAvatar) {
  try {
    const currentUser = JSON.parse(
      localStorage.getItem("restaurant_current_user") || "null",
    );
    const avatar = currentUser?.email
      ? localStorage.getItem(
          `restaurant_avatar_${currentUser.email.toLowerCase()}`,
        )
      : null;

    if (avatar) {
      accountAvatar.src = avatar;
      accountAvatar.alt = `${currentUser.name || "User"} avatar`;
      accountAvatar.classList.add("account-avatar");
    }
  } catch (error) {
    localStorage.removeItem("restaurant_current_user");
  }
}

function openLoginPage() {
  window.location.href = window.location.pathname.includes("/pages/")
    ? "login.html"
    : "pages/login.html";
}

if (accountBtn) accountBtn.addEventListener("click", openLoginPage);
if (accountPopupBtn) {
  accountPopupBtn.addEventListener("click", openLoginPage);
}
