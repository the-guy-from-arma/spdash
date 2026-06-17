const loaderMinimumMs = 1800;
const startedAt = Date.now();
const installButton = document.querySelector("#installPwa");
const slideImage = document.querySelector("#currentSlideImage");
const slideKicker = document.querySelector("#currentSlideKicker");
const slideTitle = document.querySelector("#currentSlideTitle");
const slideText = document.querySelector("#currentSlideText");
const thumbButtons = [...document.querySelectorAll(".slide-thumbs button")];
const nextSlide = document.querySelector("#nextSlide");
const prevSlide = document.querySelector("#prevSlide");

const slides = [
  {
    image: "/assets/showcase/mid-pacific-reveal.png",
    alt: "Thunder Buddies Studios reveals the Mid Pacific Naval Theater.",
    kicker: "01 / Reveal",
    title: "Thunder Buddies Studios reveals the Mid Pacific Naval Theater.",
    text: "An ambitious project in development for Arma Reforger."
  },
  {
    image: "/assets/showcase/naval-gap.png",
    alt: "Modern warship in heavy seas for the naval warfare gap slide.",
    kicker: "02 / The gap",
    title: "True naval warfare has never had a place on the battlefield.",
    text: "Arma has delivered infantry combat, armored warfare, and aviation. This project is built to expand the fight."
  },
  {
    image: "/assets/showcase/goal-change.png",
    alt: "Warships crossing open water.",
    kicker: "03 / Objective",
    title: "Our goal is to change that.",
    text: "The ocean becomes an operational space with pressure, purpose, and consequence."
  },
  {
    image: "/assets/showcase/living-battlefield.png",
    alt: "Warship moving through open water at night.",
    kicker: "04 / Battlefield",
    title: "Transform the ocean from empty space into a living battlefield.",
    text: "The Mid Pacific Naval Theater is designed around meaningful open-water operations."
  },
  {
    image: "/assets/showcase/fleet-operations.png",
    alt: "Warship launching a missile while a helicopter flies above.",
    kicker: "05 / Operations",
    title: "Fight across open water and command warships.",
    text: "Coordinate fleet operations, recon missions, amphibious support, and large-scale maritime conflict."
  },
  {
    image: "/assets/showcase/progress-updates.png",
    alt: "Modern aircraft flying over mountains.",
    kicker: "06 / Progress",
    title: "More showcases and technical demonstrations are coming.",
    text: "As development continues, Thunder Buddies Studios will share progress updates with the community."
  }
];

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

thumbButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showSlide(Number(button.dataset.slide || 0));
  });
});

registerServiceWorker();

function finishBoot() {
  const remaining = Math.max(0, loaderMinimumMs - (Date.now() - startedAt));
  window.setTimeout(() => {
    document.body.classList.remove("booting");
    document.body.classList.add("is-loaded");
  }, remaining);
}

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  const slide = slides[activeSlide];
  if (!slideImage || !slideKicker || !slideTitle || !slideText) return;

  slideImage.src = slide.image;
  slideImage.alt = slide.alt;
  slideKicker.textContent = slide.kicker;
  slideTitle.textContent = slide.title;
  slideText.textContent = slide.text;

  thumbButtons.forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === activeSlide);
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/service-worker.js");
  } catch {
    // The site remains usable if service workers are blocked.
  }
}
