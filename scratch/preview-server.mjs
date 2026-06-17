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
  "Logistics channel requests daily check-in from all station members."
];

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
  if (url.pathname === "/api/community/config") {
    return json(res, {
      discordConfigured: true,
      discordLoginUrl: "/api/discord/login",
      discordInviteUrl: "https://discord.gg/QsGMQh5hwz",
      workshopCatalogSource: "https://reforger.armaplatform.com/workshop?search=thunder+buddies+studios",
      products,
      radio
    });
  }

  if (url.pathname === "/api/community/feed") {
    return json(res, {
      posts: [
        {
          category: "catalog",
          title: "Workshop manifest online",
          body: "The published Thunder Buddies Studios catalog is indexed for the showcase.",
          postedAt: new Date().toISOString()
        }
      ],
      events: [
        {
          title: "Community Muster",
          eventType: "discord",
          body: "Join Discord for check-ins, questions, and event calls.",
          status: "scheduled",
          startsAt: new Date().toISOString(),
          linkUrl: "https://discord.gg/QsGMQh5hwz"
        }
      ]
    });
  }

  if (url.pathname === "/api/community/session") {
    return json(res, {
      authenticated: false,
      discordConfigured: true,
      databaseConfigured: true
    });
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
