const loaderMinimumMs = 4600;
const startedAt = Date.now();
const installButton = document.querySelector("#installPwa");
const slideImage = document.querySelector("#currentSlideImage");
const slideKicker = document.querySelector("#currentSlideKicker");
const slideTitle = document.querySelector("#currentSlideTitle");
const slideText = document.querySelector("#currentSlideText");
const slideThumbs = document.querySelector("#slideThumbs");
const nextSlide = document.querySelector("#nextSlide");
const prevSlide = document.querySelector("#prevSlide");
const activeSlideNumber = document.querySelector("#activeSlideNumber");
const totalSlideNumber = document.querySelector("#totalSlideNumber");
const scrollMeter = document.querySelector("#scrollMeter");
const roadmapRoute = document.querySelector("#roadmapRoute");
const activePhaseLabel = document.querySelector("#activePhaseLabel");
const activePhaseText = document.querySelector("#activePhaseText");
const bootPercent = document.querySelector("#bootPercent");
const bootBar = document.querySelector("#bootBar");
const bootLog = document.querySelector("#bootLog");
const bootPhase = document.querySelector("#bootPhase");

const slides = [
  {
    image: "/assets/showcase/mid-pacific-reveal.png",
    alt: "Thunder Buddies Studios reveals the Mid-Pacific Naval Theater.",
    kicker: "01 / Reveal",
    title: "Thunder Buddies Studios reveals the Mid-Pacific Naval Theater.",
    text: "A work-in-progress naval theater for Arma Reforger."
  },
  {
    image: "/assets/showcase/naval-gap.png",
    alt: "Modern warship in heavy seas for the naval warfare gap slide.",
    kicker: "02 / The gap",
    title: "The water gets a mission.",
    text: "The build pushes the fight beyond land contact and turns distance into pressure."
  },
  {
    image: "/assets/showcase/goal-change.png",
    alt: "Warships crossing open water.",
    kicker: "03 / Objective",
    title: "The goal is simple: make the sea matter.",
    text: "Routes, visibility, weapons, and timing become part of the plan."
  },
  {
    image: "/assets/showcase/living-battlefield.png",
    alt: "Warship moving through open water at night.",
    kicker: "04 / Battlefield",
    title: "Empty water becomes a live battlespace.",
    text: "Patrols, contacts, and threats give open water a reason to exist."
  },
  {
    image: "/assets/showcase/fleet-operations.png",
    alt: "Warship launching a missile while a helicopter flies above.",
    kicker: "05 / Fleet operations",
    title: "Fleet action drives the operation.",
    text: "Warships, aircraft, recon, and shore objectives move in the same fight."
  },
  {
    image: "/assets/showcase/progress-updates.png",
    alt: "Modern aircraft flying over mountains.",
    kicker: "06 / Progress",
    title: "Technical drops will follow the build.",
    text: "Showcases, tests, and progress notes will ship as systems come online."
  },
  {
    image: "/assets/showcase/open-ocean-patrol.png",
    alt: "Open ocean patrol at night.",
    kicker: "07 / Patrol",
    title: "Patrol space gets teeth.",
    text: "Darkness, wake trails, and weather become tactical cues."
  },
  {
    image: "/assets/showcase/missile-flight.png",
    alt: "Three missiles flying above open water.",
    kicker: "08 / Strike profile",
    title: "Strike windows set the tempo.",
    text: "Missiles and recon create decisions before forces meet at the shore."
  },
  {
    image: "/assets/showcase/carrier-group.png",
    alt: "Carrier group and surface ship operating in rough seas.",
    kicker: "09 / Fleet staging",
    title: "Major vessels become anchors.",
    text: "Fleet staging gives teams routes to protect and targets worth hunting."
  },
  {
    image: "/assets/showcase/air-wing-dusk.png",
    alt: "Air wing flying at dusk.",
    kicker: "10 / Air layer",
    title: "Air tasking ties into the fleet.",
    text: "Jets and support aircraft are planned around clear roles and HOCAS-compatible profiles."
  },
  {
    image: "/assets/showcase/rain-missile-launch.png",
    alt: "Ship launching a missile in rain at night.",
    kicker: "11 / Weather fight",
    title: "Bad weather changes the read.",
    text: "Rain, darkness, launch bloom, and silhouette recognition raise the tension."
  },
  {
    image: "/assets/showcase/sunset-destroyer.png",
    alt: "Destroyer at sunset on open water.",
    kicker: "12 / Surface combatant",
    title: "Surface combatants need presence.",
    text: "The silhouette has to read from cinematic distance and playable views."
  },
  {
    image: "/assets/showcase/storm-barrage.png",
    alt: "Ships firing missiles during a storm.",
    kicker: "13 / Escalation",
    title: "Escalation should feel immediate.",
    text: "Weather, fire, smoke, and scale make the battlefield feel dangerous before impact."
  }
];

let deferredInstallPrompt = null;
let activeSlide = 0;
let slideTimer = null;
let bootTimer = null;

const bootLines = [
  "Opening /tbms/core/startup.cfg",
  "Authenticating studio showcase package",
  "Mounting /studio/showcase/assets",
  "Loading storm and lightning layer",
  "Reading maritime theater brief",
  "Indexing gallery stills and roadmap data",
  "Syncing air control profile",
  "Preparing public release feed",
  "Handoff ready"
];

const bootPhases = [
  "Opening command shell",
  "Accessing theater files",
  "Loading combat systems",
  "Preparing public feed",
  "Handoff ready"
];

window.addEventListener("load", finishBoot);
window.addEventListener("scroll", updateScrollMeter, { passive: true });
window.addEventListener("resize", updateScrollMeter);
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

if (nextSlide) nextSlide.addEventListener("click", () => queueSlide(activeSlide + 1));
if (prevSlide) prevSlide.addEventListener("click", () => queueSlide(activeSlide - 1));

setupGallery();
setupRevealObserver();
setupRoadmapObserver();
setupQuestions();
startBootSequence();
updateScrollMeter();
registerServiceWorker();

function finishBoot() {
  const remaining = Math.max(0, loaderMinimumMs - (Date.now() - startedAt));
  window.setTimeout(() => {
    window.clearInterval(bootTimer);
    setBootProgress(100);
    document.body.classList.remove("booting");
    document.body.classList.add("is-loaded");
  }, remaining);
}

function startBootSequence() {
  if (!bootPercent || !bootBar) return;
  const duration = loaderMinimumMs - 350;
  const bootStartedAt = Date.now();
  let lastLineIndex = -1;
  bootTimer = window.setInterval(() => {
    const elapsed = Date.now() - bootStartedAt;
    const rawProgress = Math.min(1, elapsed / duration);
    const easedProgress = 1 - Math.pow(1 - rawProgress, 2.4);
    const percent = Math.min(99, Math.floor(easedProgress * 100));
    const lineIndex = Math.min(bootLines.length - 1, Math.floor(rawProgress * bootLines.length));
    const phaseIndex = Math.min(bootPhases.length - 1, Math.floor(rawProgress * bootPhases.length));

    setBootProgress(percent);
    if (bootPhase) bootPhase.textContent = bootPhases[phaseIndex];
    if (lineIndex !== lastLineIndex) {
      lastLineIndex = lineIndex;
      pushBootLine(bootLines[lineIndex]);
    }
  }, 90);
}

function setBootProgress(percent) {
  const value = String(percent).padStart(2, "0");
  if (bootPercent) bootPercent.textContent = `${value}%`;
  if (bootBar) bootBar.style.width = `${percent}%`;
}

function pushBootLine(message) {
  if (!bootLog || !message) return;
  const line = document.createElement("span");
  line.textContent = message;
  bootLog.append(line);
  while (bootLog.children.length > 4) {
    bootLog.firstElementChild.remove();
  }
}

function setupGallery() {
  if (totalSlideNumber) totalSlideNumber.textContent = String(slides.length).padStart(2, "0");
  if (slideThumbs) {
    slideThumbs.innerHTML = "";
    slides.forEach((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.slide = String(index);
      button.setAttribute("aria-label", slide.title);

      const image = document.createElement("img");
      image.src = slide.image;
      image.alt = "";
      image.loading = "lazy";

      button.append(image);
      button.addEventListener("click", () => queueSlide(index));
      slideThumbs.append(button);
    });
  }
  showSlide(0);
  startSlideTimer();
}

function queueSlide(index) {
  showSlide(index);
  startSlideTimer();
}

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  const slide = slides[activeSlide];
  if (!slideImage || !slideKicker || !slideTitle || !slideText) return;

  slideImage.animate(
    [{ opacity: 0.55, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 320, easing: "ease-out" }
  );
  slideImage.src = slide.image;
  slideImage.alt = slide.alt;
  slideKicker.textContent = slide.kicker;
  slideTitle.textContent = slide.title;
  slideText.textContent = slide.text;
  if (activeSlideNumber) activeSlideNumber.textContent = String(activeSlide + 1).padStart(2, "0");

  document.querySelectorAll("#slideThumbs button").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === activeSlide);
  });
}

function startSlideTimer() {
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 7200);
}

function setupRevealObserver() {
  const revealItems = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function setupRoadmapObserver() {
  const phases = [...document.querySelectorAll(".road-phase")];
  if (!phases.length) return;

  const activate = (phase) => {
    phases.forEach((item) => item.classList.toggle("is-active", item === phase));
    if (activePhaseLabel) activePhaseLabel.textContent = phase.dataset.month || "";
    if (activePhaseText) activePhaseText.textContent = phase.dataset.summary || "";
  };

  activate(phases[0]);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) activate(visible.target);
      },
      { rootMargin: "-28% 0px -42% 0px", threshold: [0.15, 0.35, 0.6] }
    );

    phases.forEach((phase) => observer.observe(phase));
  }

  const updateRoute = () => {
    if (!roadmapRoute) return;
    const rect = roadmapRoute.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const total = rect.height - viewport * 0.45;
    const traveled = Math.min(Math.max(viewport * 0.52 - rect.top, 0), Math.max(total, 1));
    const progress = Math.min(100, (traveled / Math.max(total, 1)) * 100);
    roadmapRoute.style.setProperty("--route-progress", `${progress}%`);
  };

  window.addEventListener("scroll", updateRoute, { passive: true });
  window.addEventListener("resize", updateRoute);
  updateRoute();
}

function setupQuestions() {
  document.querySelectorAll(".qa-item button").forEach((button) => {
    button.addEventListener("click", () => {
      const answer = button.parentElement.querySelector(".qa-answer");
      const isOpen = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isOpen));
      button.querySelector("strong").textContent = isOpen ? "Open" : "Close";
      if (answer) answer.hidden = isOpen;
    });
  });
}

function updateScrollMeter() {
  if (!scrollMeter) return;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
  scrollMeter.style.width = `${Math.min(100, Math.max(0, progress))}%`;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/service-worker.js");
  } catch {
    // The showcase remains usable if service workers are blocked.
  }
}
