import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { workshopCatalog } from "../backend/src/workshop-catalog.js";

const root = path.resolve("backend/src/public/site");
const port = Number.parseInt(process.env.PREVIEW_PORT || "4173", 10);

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

const products = workshopCatalog.map((mod) => ({
  ...mod,
  status: `v${mod.version}`,
  copy: `${labels[mod.type] || mod.type} release by Thunder Buddies Studios. Updated ${String(mod.updatedAt).slice(0, 10)}.`,
  linkConfigured: true
}));

const radio = [
  "CIC reports surface contact bearing 042, range opening.",
  "Workshop catalog synchronized from official Thunder Buddies listings.",
  "Air tasking window green for reconnaissance pass.",
  "Project telemetry reports six-month launch clock active."
];

const progress = {
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

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"]
]);

function json(res, body) {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/api/showcase/config") {
    return json(res, {
      workshopCatalogSource: "https://reforger.armaplatform.com/workshop?search=thunder+buddies+studios",
      products,
      progress,
      radio
    });
  }

  if (url.pathname === "/api/project/progress") {
    return json(res, { progress });
  }

  const targetPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, `.${targetPath}`);
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": mime.get(path.extname(filePath)) || "application/octet-stream"
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Thunder Buddies preview listening on http://127.0.0.1:${port}`);
});
