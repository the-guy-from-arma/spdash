const tokenInput = document.querySelector("#adminToken");
const saveTokenButton = document.querySelector("#saveToken");
const refreshButton = document.querySelector("#refresh");
const serversBody = document.querySelector("#serversBody");
const filterInput = document.querySelector("#filter");
const statusFilter = document.querySelector("#statusFilter");

let servers = [];

tokenInput.value = localStorage.getItem("spmpAdminToken") || "";

saveTokenButton.addEventListener("click", () => {
  localStorage.setItem("spmpAdminToken", tokenInput.value.trim());
  loadServers();
});

refreshButton.addEventListener("click", loadServers);
filterInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

async function api(path, options = {}) {
  const token = tokenInput.value.trim();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function loadServers() {
  try {
    serversBody.innerHTML = `<tr><td colspan="9" class="empty">Loading servers...</td></tr>`;
    const data = await api("/api/admin/servers");
    servers = data.servers || [];
    render();
  } catch (error) {
    serversBody.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function setStatus(id, status) {
  await api(`/api/admin/servers/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status })
  });
  await loadServers();
}

async function deleteServer(id) {
  const confirmed = window.confirm("Remove this server listing?");
  if (!confirmed) return;
  await api(`/api/admin/servers/${id}`, { method: "DELETE" });
  await loadServers();
}

function render() {
  const text = filterInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const filtered = servers.filter((server) => {
    if (selectedStatus !== "all" && server.status !== selectedStatus) return false;
    if (!text) return true;
    return [
      server.name,
      server.publicIp,
      String(server.port),
      server.scenarioName,
      server.pluginVersion,
      server.gameVersion,
      server.region,
      server.mode,
      server.status
    ].filter(Boolean).join(" ").toLowerCase().includes(text);
  });

  document.querySelector("#totalCount").textContent = servers.length;
  document.querySelector("#verifiedCount").textContent = servers.filter((s) => s.status === "verified").length;
  document.querySelector("#pendingCount").textContent = servers.filter((s) => s.status === "pending").length;
  document.querySelector("#blockedCount").textContent = servers.filter((s) => s.status === "blocked").length;

  if (filtered.length === 0) {
    serversBody.innerHTML = `<tr><td colspan="9" class="empty">No matching servers.</td></tr>`;
    return;
  }

  serversBody.innerHTML = filtered.map((server) => {
    const connect = `${server.publicIp}:${server.port}`;
    return `
      <tr>
        <td>
          <span class="name">${escapeHtml(server.name)}</span>
          <span class="sub">${escapeHtml(server.scenarioName || "No scenario reported")}</span>
        </td>
        <td>
          ${escapeHtml(connect)}
          <span class="sub">${escapeHtml(server.transport)} ${escapeHtml(server.visibility)}</span>
        </td>
        <td>${escapeHtml(server.mode)}</td>
        <td>${server.playerCount}/${server.maxPlayers}</td>
        <td>
          Plugin ${escapeHtml(server.pluginVersion)}
          <span class="sub">Game ${escapeHtml(server.gameVersion)}</span>
        </td>
        <td>${renderMods(server.requiredMods)}</td>
        <td>${formatDate(server.lastSeen)}</td>
        <td><span class="status ${server.status}">${escapeHtml(server.status)}</span></td>
        <td>
          <div class="actions">
            <button data-action="verified" onclick="window.setStatus('${server.id}', 'verified')">Verify</button>
            <button data-action="pending" onclick="window.setStatus('${server.id}', 'pending')">Pending</button>
            <button data-action="blocked" onclick="window.setStatus('${server.id}', 'blocked')">Block</button>
            <button data-action="delete" onclick="window.deleteServer('${server.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderMods(mods) {
  if (!Array.isArray(mods) || mods.length === 0) {
    return `<span class="sub">None reported</span>`;
  }

  const first = mods.slice(0, 3).map((mod) => {
    const id = mod.workshopId ? ` (${mod.workshopId})` : "";
    return `<span class="mod">${escapeHtml(mod.name)}${escapeHtml(id)}</span>`;
  }).join("");

  const extra = mods.length > 3
    ? `<span class="sub">+${mods.length - 3} more</span>`
    : "";

  return `${first}${extra}`;
}

function formatDate(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.setStatus = setStatus;
window.deleteServer = deleteServer;
