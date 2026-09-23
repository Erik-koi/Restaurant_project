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
    alert("Settings");
    closeMenu();
  });
}

function openLogin() {
  window.location.href = "login.html";
}

const accountBtn = document.getElementById("accountBtn");
if (accountBtn) {
  accountBtn.addEventListener("click", openLogin);
}

const accountPopupBtn = document.getElementById("accountPopupBtn");
if (accountPopupBtn) {
  accountPopupBtn.addEventListener("click", () => {
    closeMenu();
    openLogin();
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("restaurant_current_user");
    localStorage.removeItem("currentUser");
    closeMenu();
    alert("You have been logged out.");
  });
}
