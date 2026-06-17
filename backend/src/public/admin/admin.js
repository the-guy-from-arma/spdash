const sessionLabel = document.querySelector("#sessionLabel");
const logoutButton = document.querySelector("#logout");
const refreshButton = document.querySelector("#refresh");
const serversBody = document.querySelector("#serversBody");
const filterInput = document.querySelector("#filter");
const statusFilter = document.querySelector("#statusFilter");
const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const loginMessage = document.querySelector("#loginMessage");
const progressForm = document.querySelector("#progressForm");
const progressSaveState = document.querySelector("#progressSaveState");
const progressFields = {
  launchTargetAt: document.querySelector("#launchTargetAt"),
  currentPhase: document.querySelector("#currentPhase"),
  buildLabel: document.querySelector("#buildLabel"),
  progressPercent: document.querySelector("#progressPercent"),
  bugsFixed: document.querySelector("#bugsFixed"),
  bugsRemaining: document.querySelector("#bugsRemaining"),
  shipsImported: document.querySelector("#shipsImported"),
  shipSystemsOnline: document.querySelector("#shipSystemsOnline"),
  aircraftProfiles: document.querySelector("#aircraftProfiles"),
  scenariosReady: document.querySelector("#scenariosReady"),
  testPasses: document.querySelector("#testPasses"),
  blockers: document.querySelector("#blockers"),
  commanderNote: document.querySelector("#commanderNote")
};

let servers = [];
let progress = null;
let authenticated = false;

loginForm.addEventListener("submit", login);
logoutButton.addEventListener("click", logout);
refreshButton.addEventListener("click", loadDashboard);
filterInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
progressForm.addEventListener("submit", saveProgress);

checkSession();

async function checkSession() {
  try {
    const response = await fetch("/api/admin/session", {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const data = await response.json();
    authenticated = Boolean(data.authenticated);
    usernameInput.value = data.username || "owner";

    if (!data.loginConfigured) {
      loginMessage.textContent = "Owner password is not configured. Set ADMIN_PASSWORD on the Railway web service.";
    }

    setAuthState(authenticated, data.username || "owner");
    if (authenticated) await loadDashboard();
  } catch (error) {
    loginMessage.textContent = cleanError(error.message);
    setAuthState(false, "owner");
  }
}

async function login(event) {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value
      })
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    passwordInput.value = "";
    loginMessage.textContent = "";
    authenticated = true;
    setAuthState(true, data.username || usernameInput.value.trim() || "owner");
    await loadDashboard();
  } catch (error) {
    authenticated = false;
    setAuthState(false, usernameInput.value.trim() || "owner");
    loginMessage.textContent = cleanError(error.message);
  }
}

async function logout() {
  await fetch("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  authenticated = false;
  servers = [];
  progress = null;
  setAuthState(false, usernameInput.value.trim() || "owner");
  renderSummary();
  renderProgressForm(null);
}

function setAuthState(isAuthenticated, username) {
  loginPanel.classList.toggle("hidden", isAuthenticated);
  dashboardPanel.classList.toggle("hidden", !isAuthenticated);
  logoutButton.classList.toggle("hidden", !isAuthenticated);
  refreshButton.disabled = !isAuthenticated;
  sessionLabel.textContent = isAuthenticated ? `Signed in as ${username}` : "Signed out";
  if (!isAuthenticated) {
    serversBody.innerHTML = `<tr><td colspan="9" class="empty">Sign in with the owner account.</td></tr>`;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
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
  if (!authenticated) return;

  try {
    serversBody.innerHTML = `<tr><td colspan="9" class="empty">Loading servers...</td></tr>`;
    const data = await api("/api/admin/servers");
    servers = data.servers || [];
    render();
  } catch (error) {
    serversBody.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(cleanError(error.message))}</td></tr>`;
  }
}

async function loadDashboard() {
  if (!authenticated) return;
  await Promise.all([loadServers(), loadProgress()]);
}

async function loadProgress() {
  if (!authenticated) return;
  try {
    if (progressSaveState) progressSaveState.textContent = "Loading telemetry...";
    const data = await api("/api/admin/progress");
    progress = data.progress || null;
    renderProgressForm(progress);
    if (progressSaveState) {
      progressSaveState.textContent = data.databaseConfigured
        ? `Synced ${formatDate(progress?.updatedAt)}`
        : "Database not connected; showing fallback";
    }
  } catch (error) {
    if (progressSaveState) progressSaveState.textContent = cleanError(error.message);
  }
}

async function saveProgress(event) {
  event.preventDefault();
  if (!authenticated) return;
  if (progressSaveState) progressSaveState.textContent = "Publishing...";

  try {
    const payload = readProgressForm();
    const data = await api("/api/admin/progress", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    progress = data.progress;
    renderProgressForm(progress);
    if (progressSaveState) progressSaveState.textContent = `Published ${formatDate(progress.updatedAt)}`;
  } catch (error) {
    if (progressSaveState) progressSaveState.textContent = cleanError(error.message);
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
  renderSummary();

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

function renderSummary() {
  document.querySelector("#totalCount").textContent = servers.length;
  document.querySelector("#verifiedCount").textContent = servers.filter((s) => s.status === "verified").length;
  document.querySelector("#pendingCount").textContent = servers.filter((s) => s.status === "pending").length;
  document.querySelector("#blockedCount").textContent = servers.filter((s) => s.status === "blocked").length;
}

function renderProgressForm(item) {
  if (!item) {
    Object.values(progressFields).forEach((field) => {
      if (field) field.value = "";
    });
    return;
  }

  progressFields.launchTargetAt.value = toDatetimeLocal(item.launchTargetAt);
  progressFields.currentPhase.value = item.currentPhase || "";
  progressFields.buildLabel.value = item.buildLabel || "";
  progressFields.progressPercent.value = item.progressPercent ?? "";
  progressFields.bugsFixed.value = item.bugsFixed ?? "";
  progressFields.bugsRemaining.value = item.bugsRemaining ?? "";
  progressFields.shipsImported.value = item.shipsImported ?? "";
  progressFields.shipSystemsOnline.value = item.shipSystemsOnline ?? "";
  progressFields.aircraftProfiles.value = item.aircraftProfiles ?? "";
  progressFields.scenariosReady.value = item.scenariosReady ?? "";
  progressFields.testPasses.value = item.testPasses ?? "";
  progressFields.blockers.value = item.blockers ?? "";
  progressFields.commanderNote.value = item.commanderNote || "";
}

function readProgressForm() {
  return {
    launchTargetAt: progressFields.launchTargetAt.value,
    currentPhase: progressFields.currentPhase.value,
    buildLabel: progressFields.buildLabel.value,
    progressPercent: progressFields.progressPercent.value,
    bugsFixed: progressFields.bugsFixed.value,
    bugsRemaining: progressFields.bugsRemaining.value,
    shipsImported: progressFields.shipsImported.value,
    shipSystemsOnline: progressFields.shipSystemsOnline.value,
    aircraftProfiles: progressFields.aircraftProfiles.value,
    scenariosReady: progressFields.scenariosReady.value,
    testPasses: progressFields.testPasses.value,
    blockers: progressFields.blockers.value,
    commanderNote: progressFields.commanderNote.value
  };
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
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

function cleanError(value) {
  const text = String(value || "Request failed");
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

window.setStatus = setStatus;
window.deleteServer = deleteServer;
