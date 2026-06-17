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
const radioTicker = document.querySelector("#radioTicker");
const commandTab = document.querySelector("#commandTab");
const commandSignal = document.querySelector("#commandSignal");
const heroCountdown = document.querySelector("#heroCountdown");
const commandDrawer = document.querySelector("#commandDrawer");
const drawerScrim = document.querySelector("#drawerScrim");
const drawerClose = document.querySelector("#drawerClose");
const communityStatus = document.querySelector("#communityStatus");
const progressBuildLabel = document.querySelector("#progressBuildLabel");
const progressPhase = document.querySelector("#progressPhase");
const progressOrbitFill = document.querySelector("#progressOrbitFill");
const countdownDays = document.querySelector("#countdownDays");
const countdownHours = document.querySelector("#countdownHours");
const countdownMinutes = document.querySelector("#countdownMinutes");
const countdownSeconds = document.querySelector("#countdownSeconds");
const progressPercentText = document.querySelector("#progressPercentText");
const progressBarFill = document.querySelector("#progressBarFill");
const bugsFixed = document.querySelector("#bugsFixed");
const bugsRemaining = document.querySelector("#bugsRemaining");
const blockersCount = document.querySelector("#blockersCount");
const progressStats = document.querySelector("#progressStats");
const progressNote = document.querySelector("#progressNote");
const progressUpdated = document.querySelector("#progressUpdated");
const productRail = document.querySelector("#productRail");
const drawerProducts = document.querySelector("#drawerProducts");

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

const fallbackRadio = [
  "CIC reports surface contact bearing 042, range opening.",
  "Air tasking window green for reconnaissance pass.",
  "Amphibious corridor marked, escort package requested.",
  "Radar picket reports intermittent launch bloom beyond horizon.",
  "Project telemetry reports six-month launch clock active."
];

const fallbackProgress = {
  launchTargetAt: "2026-12-17T17:00:00.000Z",
  currentPhase: "Systems Integration",
  buildLabel: "TBMS WIP 0.0.1",
  progressPercent: 22,
  bugsFixed: 18,
  bugsRemaining: 42,
  shipsImported: 6,
  shipSystemsOnline: 4,
  aircraftProfiles: 3,
  scenariosReady: 2,
  testPasses: 11,
  blockers: 5,
  commanderNote: "Six-month production clock is active. Current work is focused on ship handling, weapons behavior, scenario structure, and clean public release pacing.",
  updatedAt: new Date().toISOString()
};

let activeProgress = { ...fallbackProgress };
let countdownTimer = null;

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
setupCommandDrawer();
loadShowcaseSurface();
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

function setupCommandDrawer() {
  if (commandTab) commandTab.addEventListener("click", openCommandDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeCommandDrawer);
  if (drawerScrim) drawerScrim.addEventListener("click", closeCommandDrawer);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCommandDrawer();
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has("telemetry") || params.has("progress")) openCommandDrawer();
}

function openCommandDrawer() {
  if (!commandDrawer || !drawerScrim || !commandTab) return;
  commandDrawer.classList.add("is-open");
  commandDrawer.setAttribute("aria-hidden", "false");
  commandTab.setAttribute("aria-expanded", "true");
  drawerScrim.hidden = false;
}

function closeCommandDrawer() {
  if (!commandDrawer || !drawerScrim || !commandTab) return;
  commandDrawer.classList.remove("is-open");
  commandDrawer.setAttribute("aria-hidden", "true");
  commandTab.setAttribute("aria-expanded", "false");
  drawerScrim.hidden = true;
}

async function loadShowcaseSurface() {
  renderRadio(fallbackRadio);
  renderProgress(fallbackProgress);

  try {
    const configResponse = await fetch("/api/showcase/config", { credentials: "same-origin" });
    if (configResponse.ok) {
      const config = await configResponse.json();
      renderRadio(config.radio || fallbackRadio);
      renderProducts(config.products || []);
      renderProgress(config.progress || fallbackProgress);
    }
  } catch {
    // Local static previews can still use fallback radio and project progress.
  }
}

function renderRadio(messages) {
  if (!radioTicker) return;
  const cleanMessages = (messages && messages.length ? messages : fallbackRadio).slice(0, 12);
  const repeated = [...cleanMessages, ...cleanMessages];
  radioTicker.innerHTML = "";
  repeated.forEach((message) => {
    const item = document.createElement("span");
    item.textContent = message;
    radioTicker.append(item);
  });
}

function renderProgress(progress) {
  activeProgress = { ...fallbackProgress, ...(progress || {}) };
  const percent = clampNumber(activeProgress.progressPercent, 0, 100);

  if (commandSignal) commandSignal.textContent = `${percent}%`;
  if (communityStatus) {
    communityStatus.textContent = `Launch target ${formatLongDate(activeProgress.launchTargetAt)} / ${activeProgress.currentPhase}`;
  }
  if (progressBuildLabel) progressBuildLabel.textContent = activeProgress.buildLabel;
  if (progressPhase) progressPhase.textContent = activeProgress.currentPhase;
  if (progressPercentText) progressPercentText.textContent = `${percent}% complete`;
  if (progressBarFill) progressBarFill.style.width = `${percent}%`;
  if (progressOrbitFill?.parentElement) {
    progressOrbitFill.parentElement.style.setProperty("--progress", `${percent * 3.6}deg`);
  }
  if (bugsFixed) bugsFixed.textContent = formatStat(activeProgress.bugsFixed);
  if (bugsRemaining) bugsRemaining.textContent = formatStat(activeProgress.bugsRemaining);
  if (blockersCount) blockersCount.textContent = formatStat(activeProgress.blockers);
  if (progressNote) progressNote.textContent = activeProgress.commanderNote;
  if (progressUpdated) progressUpdated.textContent = `Last updated: ${formatLongDate(activeProgress.updatedAt)}`;

  renderProgressStats(activeProgress);
  updateCountdown();
  window.clearInterval(countdownTimer);
  countdownTimer = window.setInterval(updateCountdown, 1000);
}

function renderProgressStats(progress) {
  if (!progressStats) return;
  const stats = [
    ["Ships imported", progress.shipsImported],
    ["Ship systems online", progress.shipSystemsOnline],
    ["Aircraft profiles", progress.aircraftProfiles],
    ["Scenarios ready", progress.scenariosReady],
    ["Test passes", progress.testPasses],
    ["Launch target", formatShortDate(progress.launchTargetAt)]
  ];

  progressStats.innerHTML = "";
  stats.forEach(([label, value]) => {
    const item = document.createElement("article");
    const strong = document.createElement("strong");
    strong.textContent = String(value);
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    progressStats.append(item);
  });
}

function updateCountdown() {
  const target = new Date(activeProgress.launchTargetAt);
  const delta = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(delta / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (countdownDays) countdownDays.textContent = String(days).padStart(3, "0");
  if (countdownHours) countdownHours.textContent = String(hours).padStart(2, "0");
  if (countdownMinutes) countdownMinutes.textContent = String(minutes).padStart(2, "0");
  if (countdownSeconds) countdownSeconds.textContent = String(seconds).padStart(2, "0");
  if (heroCountdown) heroCountdown.textContent = `${days} days to release target`;
}

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function formatStat(value) {
  return String(clampNumber(value, 0, 99999)).padStart(2, "0");
}

function renderProducts(products) {
  if (!products.length) return;

  if (productRail) {
    productRail.innerHTML = "";

    const typeCount = new Set(products.map((product) => product.type).filter(Boolean)).size;
    const updateDates = products
      .map((product) => product.updatedAt)
      .filter(Boolean)
      .sort();
    const latest = updateDates[updateDates.length - 1];

    const summary = document.createElement("div");
    summary.className = "catalog-summary";

    const summaryKicker = document.createElement("span");
    summaryKicker.textContent = "Official Workshop Index";

    const summaryTitle = document.createElement("strong");
    summaryTitle.textContent = `${String(products.length).padStart(2, "0")} published studio releases`;

    const summaryCopy = document.createElement("p");
    summaryCopy.textContent = `${typeCount} release categories tracked. Latest catalog update ${formatCatalogDate(latest)}.`;

    summary.append(summaryKicker, summaryTitle, summaryCopy);
    productRail.append(summary);

    products.forEach((product, index) => {
      const article = document.createElement("article");
      article.className = "product-item";

      const itemNumber = document.createElement("span");
      itemNumber.className = "product-index";
      itemNumber.textContent = String(index + 1).padStart(2, "0");

      const body = document.createElement("div");
      body.className = "product-body";

      const meta = document.createElement("span");
      meta.className = "product-meta";
      meta.textContent = `${formatProductKind(product.type)} / ${formatProductVersion(product)} / ${formatCatalogDate(product.updatedAt)}`;

      const title = document.createElement("strong");
      title.textContent = product.title;

      const copy = document.createElement("p");
      copy.textContent = product.copy || "Published Workshop release by Thunder Buddies Studios.";

      const id = document.createElement("small");
      id.textContent = `Workshop ID ${product.id}`;

      body.append(meta, title, copy, id);

      const actions = document.createElement("div");
      actions.className = "product-actions";

      const link = document.createElement("a");
      link.className = "text-action small";
      link.href = product.url;
      link.rel = "noreferrer";
      link.textContent = product.linkConfigured ? "Open Workshop" : "Follow Updates";

      actions.append(link);
      article.append(itemNumber, body, actions);
      productRail.append(article);
    });
  }

  if (drawerProducts) {
    drawerProducts.innerHTML = "";

    const summary = document.createElement("p");
    summary.className = "drawer-copy";
    summary.textContent = `${products.length} published Workshop releases indexed.`;
    drawerProducts.append(summary);

    products.forEach((product) => {
      const article = document.createElement("article");
      article.className = "drawer-product";

      const meta = document.createElement("span");
      meta.textContent = `${formatProductKind(product.type)} / ${formatProductVersion(product)}`;

      const title = document.createElement("strong");
      title.textContent = product.title;

      const copy = document.createElement("p");
      copy.textContent = `Updated ${formatCatalogDate(product.updatedAt)} / ${product.id}`;

      const link = document.createElement("a");
      link.className = "text-action small";
      link.href = product.url;
      link.rel = "noreferrer";
      link.textContent = product.linkConfigured ? "Open Workshop" : "Follow Updates";

      article.append(meta, title, copy, link);
      drawerProducts.append(article);
    });
  }
}

function formatProductKind(value) {
  const labels = {
    SCENARIOS_MP: "Multiplayer scenario",
    MISC: "Utility / framework",
    TERRAINS: "Terrain",
    EFFECTS: "Effects",
    SYSTEMS: "Systems",
    CHARACTERS: "Character asset",
    VEHICLES: "Vehicle asset",
    WEAPONS: "Weapon asset"
  };
  if (labels[value]) return labels[value];
  return String(value || "Workshop")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatProductVersion(product) {
  const value = product.status || (product.version ? `v${product.version}` : "published");
  if (value === "published") return value;
  return String(value).startsWith("v") ? value : `v${value}`;
}

function formatCatalogDate(value) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(value) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLongDate(value) {
  if (!value) return "pending sync";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "pending sync";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
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
