/* ====================================================================
   ArumiAC — Verkaufs-Website + Owner-Admin-Panel
   - Öffentlicher Shop (Landing + Kauf -> Lizenz-Key)
   - /api/report : ArumiAC-Server melden Infos + Config (HTTP-POST)
   - /admin      : Owner-Login -> Dashboard (Server, Configs, Guthaben)
   Speicher: JSON-Dateien (kein MySQL/oxmysql).
   ==================================================================== */
"use strict";

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");

const {
  PORT = 3000,
  SITE_NAME = "ArumiAC",
  CURRENCY = "€",
  DISCORD_WEBHOOK = "",
  ADMIN_USER = "admin",
  ADMIN_PASSWORD = "",
  SESSION_SECRET = "arumiac-bitte-aendern",
  DISCORD_CLIENT_ID = "1483451114568421386",
  DISCORD_CLIENT_SECRET = "2urLsm1Vf5lgSUX-b2s0HXG_YEYbIwm2",
  DISCORD_REDIRECT_URI = "https://arumiac.de/admin/auth/discord/callback",
} = process.env;

// Discord-IDs, die ins Admin-Panel duerfen (Standard: Owner)
const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || "1019216143199764520")
  .split(",").map((s) => s.trim()).filter(Boolean);

/* ---------------- Produkte / Pläne ---------------- */
const PLANS = [
  { id: "monthly", name: "Monatlich", price: 5.00, period: "/ Monat", badge: null,
    features: ["1 FiveM-Server", "Alle Detections", "Discord-Logs", "Updates inklusive", "Support"] },
  { id: "quarterly", name: "Vierteljährlich", price: 15.00, period: "/ 3 Monate", badge: "Beliebt",
    features: ["1 FiveM-Server", "Alle Detections", "Screenshot-Beweise", "Updates inklusive", "Priorisierter Support"] },
  { id: "lifetime", name: "Lifetime", price: 30.00, period: "einmalig", badge: null,
    features: ["1 FiveM-Server", "Alle Detections", "Screenshot- & Clip-Beweise", "Lebenslange Updates", "VIP-Support"] },
];

/* ---------------- JSON-Speicher ---------------- */
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SERVERS_FILE = path.join(DATA_DIR, "servers.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function saveJSON(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
const loadOrders = () => loadJSON(ORDERS_FILE, []);
const saveOrders = (d) => saveJSON(ORDERS_FILE, d);
const loadServers = () => loadJSON(SERVERS_FILE, []);
const saveServers = (d) => saveJSON(SERVERS_FILE, d);
const loadUsers = () => loadJSON(USERS_FILE, []);
const saveUsers = (d) => saveJSON(USERS_FILE, d);

/* ---------------- Helfer ---------------- */
const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genKey() {
  const seg = () => Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join("");
  return `ARUMI-${seg()}-${seg()}-${seg()}-${seg()}`;
}
const genId = () => "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 1e4).toString().padStart(4, "0");
const money = (n) => CURRENCY + Number(n).toFixed(2);
const now = () => new Date().toISOString();

async function notifyDiscord(order) {
  if (!DISCORD_WEBHOOK) return;
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: SITE_NAME + " Shop", embeds: [{
        title: "🛒 Neue ArumiAC-Bestellung", color: 0xffffff,
        fields: [
          { name: "Plan", value: order.planName, inline: true },
          { name: "Preis", value: order.price, inline: true },
          { name: "Lizenz-Key", value: "`" + order.key + "`" },
          { name: "Kontakt", value: order.discord || order.email || "—" },
          { name: "Bestell-ID", value: order.id },
        ], timestamp: now(),
      }] }),
    });
  } catch (e) { console.error("Discord-Webhook:", e.message); }
}

/* ---------------- App ---------------- */
const app = express();
app.set("trust proxy", 1);
// Kein Caching (verhindert veraltete/halbe Seiten nach Reload)
app.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "arumiac.admin",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 },
}));
app.use(express.static(path.join(__dirname, "public")));

// Versions-Check (zum Prüfen, ob die neue Version läuft)
app.get("/api/version", (req, res) => res.json({ ok: true, version: "v13-discord-only-cachebust" }));

/* ===================== ÖFFENTLICHER SHOP ===================== */
app.get("/api/plans", (req, res) => {
  res.json({ ok: true, currency: CURRENCY, site: SITE_NAME,
    plans: PLANS.map((p) => ({ ...p, priceLabel: money(p.price) })) });
});

app.post("/api/order", async (req, res) => {
  const { plan, email, discord } = req.body || {};
  const p = PLANS.find((x) => x.id === plan);
  if (!p) return res.status(400).json({ ok: false, error: "invalid_plan" });
  if (!email && !discord) return res.status(400).json({ ok: false, error: "contact_required" });
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, error: "invalid_email" });

  const order = { id: genId(), planId: p.id, planName: p.name, price: money(p.price),
    key: genKey(), email: (email || "").trim(), discord: (discord || "").trim(),
    status: "pending", createdAt: now() };
  const orders = loadOrders(); orders.unshift(order); saveOrders(orders);
  notifyDiscord(order);
  res.json({ ok: true, order: { id: order.id, plan: order.planName, price: order.price, key: order.key, status: order.status } });
});

/* ===================== REPORT (von ArumiAC) ===================== */
app.post("/api/report", (req, res) => {
  const b = req.body || {};
  const key = String(b.key || "").trim();
  if (!key) return res.status(400).json({ ok: false, error: "missing_key" });

  const servers = loadServers();
  let s = servers.find((x) => x.key === key);
  if (!s) {
    s = { key, balance: 0, owner: "", txns: [], firstSeen: now() };
    servers.push(s);
  }
  s.serverName = String(b.serverName || s.serverName || "Unbekannt").slice(0, 120);
  s.license = String(b.license || s.license || "").slice(0, 120);
  s.version = String(b.version || s.version || "").slice(0, 32);
  s.playersList = Array.isArray(b.players) ? b.players : (s.playersList || []);
  s.players = s.playersList.length;
  s.maxPlayers = Number(b.maxPlayers) || 0;
  if (Array.isArray(b.bans)) s.bans = b.bans;
  if (Array.isArray(b.captures)) s.captures = b.captures;
  if (b.ownerDiscord) s.ownerDiscord = String(b.ownerDiscord).trim();
  s.ip = (req.headers["cf-connecting-ip"] || req.ip || "").toString();
  if (b.config && typeof b.config === "object") s.config = b.config;
  s.lastSeen = now();
  saveServers(servers);
  res.json({ ok: true });
});

/* ===================== COMMANDS (von ArumiAC abgeholt) ===================== */
app.get("/api/commands", (req, res) => {
  const key = String(req.query.key || "").trim();
  if (!key) return res.json({ ok: false, commands: [] });
  const servers = loadServers();
  const s = servers.find((x) => x.key === key);
  if (!s) return res.json({ ok: true, commands: [] });
  const cmds = s.commands || [];
  if (cmds.length) { s.commands = []; saveServers(servers); }
  res.json({ ok: true, commands: cmds });
});

/* ===================== ADMIN-AUTH ===================== */
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ ok: false, error: "unauthorized" });
}
// Owner = Flag aus dem Login ODER Discord-ID in der erlaubten Liste (robust auch fuer alte Sessions)
function isOwnerReq(req) {
  if (!req.session) return false;
  if (req.session.isOwner) return true;
  if (req.session.discordId && ADMIN_DISCORD_IDS.includes(req.session.discordId)) return true;
  return false;
}
function requireOwner(req, res, next) {
  if (isOwnerReq(req)) return next();
  res.status(403).json({ ok: false, error: "forbidden" });
}

app.post("/api/admin/logout", (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
app.get("/api/admin/me", (req, res) => {
  // Eingeloggten User immer in der Liste sicherstellen (auch ohne neues Login)
  if (req.session && req.session.admin && req.session.discordId) {
    const users = loadUsers();
    let u = users.find((x) => x.id === req.session.discordId);
    if (!u) { u = { id: req.session.discordId, username: req.session.adminName || "User", avatar: null, balance: 0, txns: [], firstSeen: now() }; users.push(u); }
    u.username = req.session.adminName || u.username;
    u.lastSeen = now();
    saveUsers(users);
  }
  res.json({
    ok: !!(req.session && req.session.admin),
    isOwner: isOwnerReq(req),
    discordId: (req.session && req.session.discordId) || null,
    name: (req.session && req.session.adminName) || null,
    discordLogin: !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET),
  });
});

/* --- Admin Discord-Login (nur erlaubte IDs) --- */
app.get("/admin/auth/discord", (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) return res.redirect("/admin?error=discord_not_configured");
  const u = new URL("https://discord.com/oauth2/authorize");
  u.searchParams.set("client_id", DISCORD_CLIENT_ID);
  u.searchParams.set("redirect_uri", DISCORD_REDIRECT_URI);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "identify");
  res.redirect(u.toString());
});

app.get("/admin/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect("/admin?error=nocode");
  try {
    const body = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code", code: String(code), redirect_uri: DISCORD_REDIRECT_URI,
    });
    const tok = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    }).then((r) => r.json());
    if (!tok.access_token) { console.error("Discord-Token-Fehler:", JSON.stringify(tok)); return res.redirect("/admin?error=token"); }
    const user = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: "Bearer " + tok.access_token },
    }).then((r) => r.json());
    if (!user || !user.id) { console.error("Discord-User-Fehler:", JSON.stringify(user)); return res.redirect("/admin?error=token"); }

    // Jeden Discord-Login als Kunde registrieren (damit der Owner ihn sieht)
    const users = loadUsers();
    let u = users.find((x) => x.id === user.id);
    if (!u) { u = { id: user.id, balance: 0, txns: [], firstSeen: now() }; users.push(u); }
    u.username = user.global_name || user.username;
    u.avatar = user.avatar;
    u.lastSeen = now();
    saveUsers(users);

    req.session.admin = true;
    req.session.discordId = user.id;
    req.session.adminName = u.username;
    req.session.isOwner = ADMIN_DISCORD_IDS.includes(user.id);
    // Session garantiert speichern, BEVOR weitergeleitet wird (sonst "nicht eingeloggt")
    return req.session.save(() => res.redirect("/admin?login=1"));
  } catch (e) { console.error("Admin-OAuth:", e); res.redirect("/admin?error=oauth"); }
});

/* ===================== ADMIN-API ===================== */
function isOnline(s) { return s.lastSeen && (Date.now() - new Date(s.lastSeen).getTime()) < 180000; } // < 3 Min

// Owner sieht alle Server; ein Kunde nur seine eigenen (per Discord-ID verknuepft)
function visibleServers(req) {
  const all = loadServers();
  if (isOwnerReq(req)) return all;
  const id = req.session && req.session.discordId;
  return all.filter((s) => s.ownerDiscord && s.ownerDiscord === id);
}
function canSeeServer(req, s) {
  if (!s) return false;
  if (isOwnerReq(req)) return true;
  return s.ownerDiscord && s.ownerDiscord === (req.session && req.session.discordId);
}

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const servers = visibleServers(req);
  const orders = isOwnerReq(req) ? loadOrders() : [];
  res.json({ ok: true, stats: {
    servers: servers.length,
    online: servers.filter(isOnline).length,
    orders: orders.length,
    players: servers.filter(isOnline).reduce((a, s) => a + (s.players || 0), 0),
    balance: servers.reduce((a, s) => a + (Number(s.balance) || 0), 0),
  }});
});

app.get("/api/admin/servers", requireAdmin, (req, res) => {
  const servers = visibleServers(req).map((s) => ({
    key: s.key, serverName: s.serverName, license: s.license, version: s.version,
    players: s.players, maxPlayers: s.maxPlayers, ip: s.ip, owner: s.owner,
    balance: Number(s.balance) || 0, lastSeen: s.lastSeen, firstSeen: s.firstSeen,
    online: isOnline(s), hasConfig: !!s.config,
  }));
  res.json({ ok: true, servers });
});

app.get("/api/admin/servers/:key", requireAdmin, (req, res) => {
  const s = loadServers().find((x) => x.key === req.params.key);
  if (!canSeeServer(req, s)) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, server: { ...s, online: isOnline(s) } });
});

// Server/Kunde manuell anlegen (z.B. um vor dem ersten Report Guthaben zu geben)
app.post("/api/admin/servers", requireOwner, (req, res) => {
  const key = String(req.body.key || "").trim();
  const owner = String(req.body.owner || "").trim();
  if (!key) return res.status(400).json({ ok: false, error: "missing_key" });
  const servers = loadServers();
  if (servers.find((x) => x.key === key)) return res.status(409).json({ ok: false, error: "exists" });
  servers.push({ key, serverName: owner || "Manuell angelegt", owner, balance: 0, txns: [], firstSeen: now(), manual: true });
  saveServers(servers);
  res.json({ ok: true });
});

// Server-Guthaben setzen / auf- oder abbuchen (Owner)
app.post("/api/admin/wallet", requireOwner, (req, res) => {
  const { key, type, amount, reason } = req.body || {};
  const amt = Number(amount);
  if (!key || !["add", "deduct", "set"].includes(type) || isNaN(amt)) {
    return res.status(400).json({ ok: false, error: "bad_request" });
  }
  const servers = loadServers();
  const s = servers.find((x) => x.key === key);
  if (!s) return res.status(404).json({ ok: false, error: "not_found" });
  s.balance = Number(s.balance) || 0;
  if (type === "add") s.balance += amt;
  else if (type === "deduct") s.balance -= amt;
  else s.balance = amt;
  s.balance = Math.round(s.balance * 100) / 100;
  s.txns = s.txns || [];
  s.txns.unshift({ ts: now(), type, amount: amt, reason: String(reason || "").slice(0, 120), balanceAfter: s.balance });
  if (s.txns.length > 100) s.txns.length = 100;
  saveServers(servers);
  res.json({ ok: true, balance: s.balance });
});

app.post("/api/admin/owner", requireOwner, (req, res) => {
  const { key, owner } = req.body || {};
  const servers = loadServers();
  const s = servers.find((x) => x.key === key);
  if (!s) return res.status(404).json({ ok: false, error: "not_found" });
  s.owner = String(owner || "").slice(0, 80);
  saveServers(servers);
  res.json({ ok: true });
});

app.get("/api/admin/orders", requireOwner, (req, res) => {
  res.json({ ok: true, orders: loadOrders() });
});

/* ===================== KUNDEN (angemeldete Panel-User) ===================== */
// Eigene Daten (auch für normale Kunden) — Balance fürs Kunden-Dashboard
app.get("/api/me", requireAdmin, (req, res) => {
  const id = req.session.discordId;
  const u = id ? loadUsers().find((x) => x.id === id) : null;
  res.json({ ok: true, user: { id, name: req.session.adminName, balance: u ? u.balance : 0, isOwner: !!req.session.isOwner } });
});

// Owner: alle registrierten Kunden sehen
app.get("/api/admin/users", requireOwner, (req, res) => {
  const users = loadUsers().map((u) => ({
    id: u.id, username: u.username, avatar: u.avatar,
    balance: Number(u.balance) || 0, firstSeen: u.firstSeen, lastSeen: u.lastSeen,
  })).sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0));
  res.json({ ok: true, users });
});

app.get("/api/admin/users/:id", requireOwner, (req, res) => {
  const u = loadUsers().find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, user: u });
});

// Owner: Guthaben eines Kunden setzen / auf- oder abbuchen
app.post("/api/admin/users/:id/wallet", requireOwner, (req, res) => {
  const { type, amount, reason } = req.body || {};
  const amt = Number(amount);
  if (!["add", "deduct", "set"].includes(type) || isNaN(amt)) {
    return res.status(400).json({ ok: false, error: "bad_request" });
  }
  const users = loadUsers();
  const u = users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ ok: false, error: "not_found" });
  u.balance = Number(u.balance) || 0;
  if (type === "add") u.balance += amt;
  else if (type === "deduct") u.balance -= amt;
  else u.balance = amt;
  u.balance = Math.round(u.balance * 100) / 100;
  u.txns = u.txns || [];
  u.txns.unshift({ ts: now(), type, amount: amt, reason: String(reason || "").slice(0, 120), balanceAfter: u.balance });
  if (u.txns.length > 100) u.txns.length = 100;
  saveUsers(users);
  res.json({ ok: true, balance: u.balance });
});

// Bestellung -> Status / Guthaben verbuchen
app.post("/api/admin/orders/:id", requireOwner, (req, res) => {
  const orders = loadOrders();
  const o = orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ ok: false, error: "not_found" });
  if (req.body.status) o.status = String(req.body.status);
  saveOrders(orders);
  res.json({ ok: true });
});

/* --- Befehle an einen Server schicken (werden von ArumiAC abgeholt) --- */
function enqueue(req, key, cmd, res) {
  const servers = loadServers();
  const s = servers.find((x) => x.key === key);
  if (!canSeeServer(req, s)) return res.status(404).json({ ok: false, error: "not_found" });
  s.commands = s.commands || [];
  s.commands.push(cmd);
  if (s.commands.length > 100) s.commands.splice(0, s.commands.length - 100);
  saveServers(servers);
  res.json({ ok: true, queued: true });
}
app.post("/api/admin/servers/:key/unban", requireAdmin, (req, res) =>
  enqueue(req, req.params.key, { type: "unban", banId: req.body.banId }, res));
app.post("/api/admin/servers/:key/ban", requireAdmin, (req, res) =>
  enqueue(req, req.params.key, { type: "ban", playerId: req.body.playerId, reason: req.body.reason }, res));
app.post("/api/admin/servers/:key/screenshot", requireAdmin, (req, res) =>
  enqueue(req, req.params.key, { type: "screenshot", playerId: req.body.playerId }, res));
app.post("/api/admin/servers/:key/clip", requireAdmin, (req, res) =>
  enqueue(req, req.params.key, { type: "clip", playerId: req.body.playerId, frames: req.body.frames, interval: req.body.interval }, res));
app.post("/api/admin/servers/:key/config", requireAdmin, (req, res) =>
  enqueue(req, req.params.key, { type: "setconfig", section: req.body.section, key: req.body.key, value: req.body.value }, res));

/* /admin -> Dashboard-Seite */
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

app.listen(Number(PORT), () => console.log(`${SITE_NAME}-Shop + Admin läuft auf Port ${PORT}`));
