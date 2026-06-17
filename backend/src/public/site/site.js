const loaderMinimumMs = 2100;
const startedAt = Date.now();
const installButton = document.querySelector("#installPwa");
const launchSection = document.querySelector("#countdown");
const slides = [...document.querySelectorAll(".briefing-slide")];
const nextSlide = document.querySelector("#nextSlide");
const prevSlide = document.querySelector("#prevSlide");

let deferredInstallPrompt = null;
let activeSlide = 0;

window.addEventListener("load", finishBoot);
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});

if (installButton) {
  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });
}

if (nextSlide) nextSlide.addEventListener("click", () => showSlide(activeSlide + 1));
if (prevSlide) prevSlide.addEventListener("click", () => showSlide(activeSlide - 1));

window.setInterval(() => showSlide(activeSlide + 1), 9000);
window.setInterval(updateCountdown, 1000);

updateCountdown();
registerServiceWorker();

function finishBoot() {
  const remaining = Math.max(0, loaderMinimumMs - (Date.now() - startedAt));
  window.setTimeout(() => {
    document.body.classList.remove("booting");
    document.body.classList.add("is-loaded");
  }, remaining);
}

function showSlide(index) {
  if (slides.length === 0) return;
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === activeSlide);
  });
}

function updateCountdown() {
  if (!launchSection) return;

  const days = document.querySelector("#days");
  const hours = document.querySelector("#hours");
  const minutes = document.querySelector("#minutes");
  const seconds = document.querySelector("#seconds");
  const launchDate = new Date(launchSection.dataset.launchDate || "").getTime();

  if (!Number.isFinite(launchDate)) {
    setCountdownValue(days, "--");
    setCountdownValue(hours, "--");
    setCountdownValue(minutes, "--");
    setCountdownValue(seconds, "--");
    return;
  }

  const remaining = Math.max(0, launchDate - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const dayValue = Math.floor(totalSeconds / 86400);
  const hourValue = Math.floor((totalSeconds % 86400) / 3600);
  const minuteValue = Math.floor((totalSeconds % 3600) / 60);
  const secondValue = totalSeconds % 60;

  setCountdownValue(days, dayValue);
  setCountdownValue(hours, hourValue);
  setCountdownValue(minutes, minuteValue);
  setCountdownValue(seconds, secondValue);
}

function setCountdownValue(element, value) {
  if (!element) return;
  element.textContent = String(value).padStart(2, "0");
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/service-worker.js");
  } catch {
    // The site still works normally when service workers are blocked.
  }
}
