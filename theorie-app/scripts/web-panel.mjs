#!/usr/bin/env node
// Web-Panel: baut die Web-Version der App und startet sie auf localhost.
// Läuft auf Windows, macOS und Linux (nur Node nötig).
//
//   npm run panel             bauen (wenn nötig) und starten → http://localhost:8080
//   npm run panel -- --neu    neu bauen, z. B. nach einem git pull
//   npm run panel -- --port 3000
//
// Der Manager liegt unter http://localhost:8080/manager (nur für den Inhaber).

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ziel = path.join(app, "dist-web");
const argumente = process.argv.slice(2);
const neu = argumente.includes("--neu");
const portIndex = argumente.indexOf("--port");
const port = portIndex >= 0 ? Number(argumente[portIndex + 1]) : 8080;

if (!fs.existsSync(path.join(app, ".env"))) {
  console.log("Hinweis: keine .env gefunden – das Panel läuft dann ohne Server (kein Anmelden, kein Manager).\n");
}

if (neu || !fs.existsSync(path.join(ziel, "index.html"))) {
  console.log("Baue die Web-Version … (das dauert beim ersten Mal ein bis zwei Minuten)\n");
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const lauf = spawnSync(npx, ["expo", "export", "--platform", "web", "--output-dir", "dist-web"], { cwd: app, stdio: "inherit", shell: process.platform === "win32" });
  if (lauf.status !== 0) {
    console.error("\nBauen fehlgeschlagen – siehe Meldungen oben. Fehlen Pakete? Dann erst „npm install“.");
    process.exit(1);
  }
}

const TYPEN = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wasm": "application/wasm",
};

const server = http.createServer((anfrage, antwort) => {
  const roh = decodeURIComponent((anfrage.url ?? "/").split("?")[0]);
  let datei = path.join(ziel, path.normalize(roh));
  // Unbekannte Pfade (/manager, /thema/vorfahrt …) liefert die App selbst aus.
  if (!datei.startsWith(ziel) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) datei = path.join(ziel, "index.html");
  const typ = TYPEN[path.extname(datei).toLowerCase()] ?? "application/octet-stream";
  const html = typ.startsWith("text/html");
  antwort.writeHead(200, { "Content-Type": typ, "Cache-Control": html ? "no-cache" : "public, max-age=31536000, immutable" });
  fs.createReadStream(datei).pipe(antwort);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") console.error(`Port ${port} ist schon belegt. Starte mit einem anderen: npm run panel -- --port ${port + 1}`);
  else console.error(e);
  process.exit(1);
});

server.listen(port, () => {
  console.log("\n  Fahrschul Pro · Web-Panel läuft\n");
  console.log(`  App:      http://localhost:${port}`);
  console.log(`  Manager:  http://localhost:${port}/manager\n`);
  console.log("  Beenden mit Strg+C\n");
});
