const list = document.querySelector("#serversList");
const count = document.querySelector("#serverCount");
const heroServerCount = document.querySelector("#heroServerCount");
const fleetStatus = document.querySelector("#fleetStatus");
const refresh = document.querySelector("#refreshServers");
const heroVideo = document.querySelector("#heroVideo");
const heroVideoSource = document.querySelector("#heroVideoSource");

const mediaSources = [
  {
    src: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1286220/extras/1764a9f8a160a2b79a357198352f1e40.webm?t=1778828436",
    poster: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1286220/extras/1764a9f8a160a2b79a357198352f1e40.poster.avif?t=1778828436"
  },
  {
    src: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1286220/extras/3b68cdf16bd781acc414600b07bf7e34.webm?t=1778828436",
    poster: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1286220/extras/3b68cdf16bd781acc414600b07bf7e34.poster.avif?t=1778828436"
  },
  {
    src: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1286220/extras/efff58091c2a5e95a853cbc617842548.webm?t=1778828436",
    poster: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1286220/extras/efff58091c2a5e95a853cbc617842548.poster.avif?t=1778828436"
  }
];

let mediaIndex = 0;

if (refresh) refresh.addEventListener("click", loadServers);

startMediaRotation();
loadServers();

function startMediaRotation() {
  if (!heroVideo || !heroVideoSource || mediaSources.length <= 1) return;

  window.setInterval(() => {
    mediaIndex = (mediaIndex + 1) % mediaSources.length;
    const media = mediaSources[mediaIndex];
    heroVideo.poster = media.poster;
    heroVideoSource.src = media.src;
    heroVideo.load();
    heroVideo.play().catch(() => {});
  }, 18000);
}

async function loadServers() {
  list.innerHTML = `<div class="empty">Scanning the public registry...</div>`;
  count.textContent = "Loading...";
  heroServerCount.textContent = "--";
  fleetStatus.textContent = "Checking";

  try {
    const response = await fetch("/api/servers", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const servers = data.servers || [];
    renderServers(servers);
    heroServerCount.textContent = String(servers.length);
    fleetStatus.textContent = "Online";
  } catch (error) {
    list.innerHTML = `<div class="empty">${escapeHtml(cleanError(error.message))}</div>`;
    count.textContent = "Unavailable";
    heroServerCount.textContent = "0";
    fleetStatus.textContent = "Offline";
  }
}

function renderServers(servers) {
  count.textContent = `${servers.length} active`;

  if (servers.length === 0) {
    list.innerHTML = `<div class="empty">No verified public servers are active right now.</div>`;
    return;
  }

  list.innerHTML = servers.map((server) => {
    const protocolUrl = buildProtocolUrl(server);
    const mods = Array.isArray(server.requiredMods) ? server.requiredMods : [];
    const modText = formatMods(mods);
    const players = `${server.playerCount ?? 0}/${server.maxPlayers ?? "?"}`;
    const scenario = server.scenarioName || "Scenario not reported";
    const endpoint = server.publicIp && server.port ? `${server.publicIp}:${server.port}` : "Endpoint pending";
    const lastSeen = formatLastSeen(server.lastSeen);

    return `
      <article class="server">
        <div>
          <h3>${escapeHtml(server.name || "Unnamed fleet")}</h3>
          <div class="server-meta">
            <span class="pill">${escapeHtml(server.mode || "mode")}</span>
            <span class="pill">${escapeHtml(server.transport || "transport")}</span>
            <span class="pill">${escapeHtml(players)} players</span>
          </div>
          <div class="server-mods">Scenario: ${escapeHtml(scenario)}</div>
          <div class="server-mods">Required mods: ${escapeHtml(modText)}</div>
        </div>
        <div class="server-endpoint">
          ${escapeHtml(endpoint)}<br>
          Plugin ${escapeHtml(server.pluginVersion || "unknown")}<br>
          Game ${escapeHtml(server.gameVersion || "unknown")}<br>
          ${escapeHtml(lastSeen)}
        </div>
        <a class="button primary connect" href="${protocolUrl}">Connect</a>
      </article>
    `;
  }).join("");
}

function formatMods(mods) {
  if (mods.length === 0) return "None reported";
  const names = mods
    .slice(0, 4)
    .map((mod) => mod?.name || mod?.workshopId || "Unnamed mod")
    .filter(Boolean);
  return `${names.join(", ")}${mods.length > 4 ? ` +${mods.length - 4} more` : ""}`;
}

function formatLastSeen(value) {
  if (!value) return "Last heartbeat unknown";
  const lastSeen = new Date(value).getTime();
  if (!Number.isFinite(lastSeen)) return "Last heartbeat unknown";
  const seconds = Math.max(0, Math.round((Date.now() - lastSeen) / 1000));
  if (seconds < 60) return `Heartbeat ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `Heartbeat ${minutes}m ago`;
}

function buildProtocolUrl(server) {
  const params = new URLSearchParams({
    serverId: server.id,
    registry: window.location.origin
  });
  return `seapowermp://connect?${params.toString()}`;
}

function cleanError(value) {
  const text = String(value || "Registry unavailable");
  try {
    const parsed = JSON.parse(text);
    return parsed.error || text;
  } catch {
    return text;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
