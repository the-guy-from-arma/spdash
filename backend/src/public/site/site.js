const list = document.querySelector("#serversList");
const count = document.querySelector("#serverCount");
const refresh = document.querySelector("#refreshServers");

refresh.addEventListener("click", loadServers);
loadServers();

async function loadServers() {
  list.innerHTML = `<div class="empty">Loading active public servers...</div>`;
  count.textContent = "Loading...";

  try {
    const response = await fetch("/api/servers");
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    renderServers(data.servers || []);
  } catch (error) {
    list.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    count.textContent = "Unavailable";
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
    const modText = mods.length === 0
      ? "No required mods reported"
      : mods.slice(0, 4).map((mod) => mod.name).join(", ") + (mods.length > 4 ? ` +${mods.length - 4} more` : "");

    return `
      <article class="server">
        <div>
          <h3>${escapeHtml(server.name)}</h3>
          <div class="meta">
            <span class="pill">${escapeHtml(server.mode)}</span>
            <span class="pill">${escapeHtml(server.transport)}</span>
            ${server.playerCount}/${server.maxPlayers} players
          </div>
          <div class="meta">Scenario: ${escapeHtml(server.scenarioName || "Not reported")}</div>
          <div class="mods">Required mods: ${escapeHtml(modText)}</div>
        </div>
        <div class="endpoint">
          ${escapeHtml(server.publicIp)}:${server.port}<br>
          Plugin ${escapeHtml(server.pluginVersion)}<br>
          Game ${escapeHtml(server.gameVersion)}
        </div>
        <a class="primary connect" href="${protocolUrl}">Connect</a>
      </article>
    `;
  }).join("");
}

function buildProtocolUrl(server) {
  const params = new URLSearchParams({
    serverId: server.id,
    registry: window.location.origin
  });
  return `seapowermp://connect?${params.toString()}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

