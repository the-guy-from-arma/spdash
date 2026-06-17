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
const commandDrawer = document.querySelector("#commandDrawer");
const drawerScrim = document.querySelector("#drawerScrim");
const drawerClose = document.querySelector("#drawerClose");
const communityStatus = document.querySelector("#communityStatus");
const discordLogin = document.querySelector("#discordLogin");
const discordLogout = document.querySelector("#discordLogout");
const drawerLoginActions = document.querySelector("#drawerLoginActions");
const stationConsole = document.querySelector("#stationConsole");
const drawerAvatar = document.querySelector("#drawerAvatar");
const drawerName = document.querySelector("#drawerName");
const stationTag = document.querySelector("#stationTag");
const stationCheckins = document.querySelector("#stationCheckins");
const stationQuestions = document.querySelector("#stationQuestions");
const stationToday = document.querySelector("#stationToday");
const stationLastCheckin = document.querySelector("#stationLastCheckin");
const checkinForm = document.querySelector("#checkinForm");
const checkinMood = document.querySelector("#checkinMood");
const moraleScore = document.querySelector("#moraleScore");
const checkinNote = document.querySelector("#checkinNote");
const checkinStatus = document.querySelector("#checkinStatus");
const questionForm = document.querySelector("#questionForm");
const questionText = document.querySelector("#questionText");
const questionStatus = document.querySelector("#questionStatus");
const productRail = document.querySelector("#productRail");
const drawerProducts = document.querySelector("#drawerProducts");
const postingsFeed = document.querySelector("#postingsFeed");
const eventsFeed = document.querySelector("#eventsFeed");

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
  "Radar picket reports intermittent launch bloom beyond horizon."
];

const fallbackPosts = [
  {
    category: "command post",
    title: "Welcome aboard TBMS",
    body: "The Community Net opens a personal station for morale checks, questions, events, and studio updates.",
    postedAt: new Date().toISOString()
  }
];

const fallbackEvents = [
  {
    title: "Discord Muster",
    eventType: "community",
    body: "Join the Discord and watch for tester calls.",
    status: "scheduled",
    startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    linkUrl: "https://discord.gg/QsGMQh5hwz"
  }
];

let communitySession = {
  authenticated: false,
  discordConfigured: false,
  databaseConfigured: false
};

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
loadCommunitySurface();
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

  if (discordLogout) {
    discordLogout.addEventListener("click", async () => {
      await fetch("/api/community/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
      await loadCommunitySession();
    });
  }

  if (checkinForm) {
    checkinForm.addEventListener("submit", submitCheckIn);
  }

  if (questionForm) {
    questionForm.addEventListener("submit", submitQuestion);
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has("community")) openCommandDrawer();
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

async function loadCommunitySurface() {
  renderRadio(fallbackRadio);

  try {
    const configResponse = await fetch("/api/community/config", { credentials: "same-origin" });
    if (configResponse.ok) {
      const config = await configResponse.json();
      renderRadio(config.radio || fallbackRadio);
      renderProducts(config.products || []);
      if (discordLogin) discordLogin.href = config.discordLoginUrl || "/api/discord/login";
      communitySession.discordConfigured = Boolean(config.discordConfigured);
    }
  } catch {
    // Local static previews can still use the fallback radio and product content.
  }

  await loadCommunityFeed();
  await loadCommunitySession();
}

async function loadCommunityFeed() {
  try {
    const response = await fetch("/api/community/feed", { credentials: "same-origin" });
    if (!response.ok) throw new Error("feed_failed");
    const data = await response.json();
    renderFeed(data.posts || fallbackPosts, data.events || fallbackEvents);
  } catch {
    renderFeed(fallbackPosts, fallbackEvents);
  }
}

async function loadCommunitySession() {
  try {
    const response = await fetch("/api/community/session", { credentials: "same-origin" });
    if (!response.ok) throw new Error("session_failed");
    communitySession = await response.json();
  } catch {
    communitySession = {
      authenticated: false,
      discordConfigured: false,
      databaseConfigured: false
    };
  }
  renderCommunitySession();
}

function renderCommunitySession() {
  const isAuthenticated = Boolean(communitySession.authenticated);
  const isConfigured = Boolean(communitySession.discordConfigured);
  const databaseReady = Boolean(communitySession.databaseConfigured);

  if (commandSignal) commandSignal.textContent = isAuthenticated ? "Online" : "Discord";
  if (discordLogin) discordLogin.hidden = isAuthenticated;
  if (discordLogout) discordLogout.hidden = !isAuthenticated;
  if (drawerLoginActions) drawerLoginActions.classList.toggle("is-authenticated", isAuthenticated);

  if (stationConsole) stationConsole.hidden = !isAuthenticated;
  if (isAuthenticated && communitySession.user) {
    if (drawerName) drawerName.textContent = communitySession.user.globalName || communitySession.user.username;
    if (drawerAvatar) drawerAvatar.src = communitySession.user.avatarUrl || "/assets/tbs-emblem.svg";
    if (stationTag) stationTag.textContent = `Discord ID ${communitySession.user.discordId}`;
    if (stationCheckins) stationCheckins.textContent = String(communitySession.checkInCount || 0).padStart(2, "0");
    if (stationQuestions) stationQuestions.textContent = String(communitySession.questionCount || 0).padStart(2, "0");
    if (stationToday) stationToday.textContent = communitySession.checkedInToday ? "Logged" : "Open";
    if (stationLastCheckin) stationLastCheckin.textContent = formatLastCheckIn(communitySession.lastCheckIn);
  }

  if (communityStatus) {
    if (isAuthenticated) {
      communityStatus.textContent = communitySession.checkedInToday
        ? "Station linked. Morale check logged for today."
        : "Station linked. Morale check is open.";
    } else if (!isConfigured) {
      communityStatus.textContent = "Discord OAuth is not configured yet. The button opens the public Discord until Railway env vars are added.";
    } else {
      communityStatus.textContent = "Login with Discord to ask questions and send daily station checks.";
    }
  }

  const formMessage = !isAuthenticated
    ? "Login with Discord first."
    : databaseReady
      ? ""
      : "Railway database is not connected yet.";
  if (checkinStatus && formMessage) checkinStatus.textContent = formMessage;
  if (questionStatus && formMessage) questionStatus.textContent = formMessage;
}

function formatLastCheckIn(checkIn) {
  if (!checkIn) return "No morale check logged yet.";
  const mood = formatMood(checkIn.mood);
  const score = checkIn.moraleScore ? ` / morale ${checkIn.moraleScore}/5` : "";
  const date = checkIn.checkinDate ? new Date(checkIn.checkinDate).toLocaleDateString() : "recent";
  return `Last check: ${mood}${score} / ${date}`;
}

function formatMood(value) {
  const labels = {
    green: "green / steady",
    blue: "blue / quiet",
    amber: "amber / tired",
    red: "red / support requested",
    gold: "gold / hyped",
    on_station: "on station",
    testing: "testing build",
    watching: "watching progress",
    blocked: "blocked",
    other: "other"
  };
  return labels[value] || value || "unknown";
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

function renderFeed(posts, events) {
  if (postingsFeed) {
    postingsFeed.innerHTML = "";
    (posts.length ? posts : fallbackPosts).slice(0, 5).forEach((post) => {
      const article = document.createElement("article");
      article.className = "feed-line";

      const meta = document.createElement("span");
      meta.textContent = `${post.category || "post"} / ${formatShortDate(post.postedAt)}`;

      const title = document.createElement("strong");
      title.textContent = post.title;

      const body = document.createElement("p");
      body.textContent = post.body;

      article.append(meta, title, body);
      postingsFeed.append(article);
    });
  }

  if (eventsFeed) {
    eventsFeed.innerHTML = "";
    (events.length ? events : fallbackEvents).slice(0, 5).forEach((event) => {
      const article = document.createElement("article");
      article.className = "event-line";

      const meta = document.createElement("span");
      meta.textContent = `${event.eventType || "event"} / ${event.status || "scheduled"} / ${formatShortDate(event.startsAt)}`;

      const title = document.createElement("strong");
      title.textContent = event.title;

      const body = document.createElement("p");
      body.textContent = event.body;

      article.append(meta, title, body);
      if (event.linkUrl) {
        const link = document.createElement("a");
        link.className = "text-action small";
        link.href = event.linkUrl;
        link.rel = "noreferrer";
        link.textContent = "Open Brief";
        article.append(link);
      }
      eventsFeed.append(article);
    });
  }
}

function formatShortDate(value) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function submitCheckIn(event) {
  event.preventDefault();
  if (!checkinStatus) return;
  if (!communitySession.authenticated) {
    checkinStatus.textContent = "Login with Discord first.";
    return;
  }

  checkinStatus.textContent = "Sending check-in...";
  const response = await fetch("/api/community/check-in", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mood: checkinMood?.value || "on_station",
      moraleScore: moraleScore?.value || "",
      note: checkinNote?.value || ""
    })
  }).catch(() => null);

  if (!response?.ok) {
    checkinStatus.textContent = "Check-in failed. Confirm Railway database and Discord login are configured.";
    return;
  }

  if (checkinNote) checkinNote.value = "";
  checkinStatus.textContent = "Check-in logged for today.";
  await loadCommunitySession();
}

async function submitQuestion(event) {
  event.preventDefault();
  if (!questionStatus) return;
  if (!communitySession.authenticated) {
    questionStatus.textContent = "Login with Discord first.";
    return;
  }

  const question = questionText?.value.trim() || "";
  if (question.length < 12) {
    questionStatus.textContent = "Give the team a little more detail.";
    return;
  }

  questionStatus.textContent = "Sending question...";
  const response = await fetch("/api/community/questions", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  }).catch(() => null);

  if (!response?.ok) {
    questionStatus.textContent = "Question failed. Confirm Railway database and Discord login are configured.";
    return;
  }

  if (questionText) questionText.value = "";
  questionStatus.textContent = "Question sent to the studio queue.";
  await loadCommunitySession();
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
