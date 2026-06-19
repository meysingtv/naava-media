/* ====================================================================
   ArumiAC Admin — Frontend
   ==================================================================== */
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CUR = "€";

async function api(path, method = "GET", body) {
  const r = await fetch(path, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body || {}) : undefined,
  });
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((d && d.error) || ("HTTP " + r.status)); e.status = r.status; throw e; }
  return d;
}

function toast(msg, type = "ok") {
  const el = document.createElement("div");
  el.className = "toast " + (type === "err" ? "err" : "");
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3000);
}
function openModal(html) { $("#modalBox").innerHTML = html; $("#modalRoot").classList.remove("hidden"); }
function closeModal() { $("#modalRoot").classList.add("hidden"); $("#modalBox").innerHTML = ""; }
$("#modalRoot").addEventListener("click", (e) => { if (e.target.dataset.close !== undefined) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

const ago = (iso) => {
  if (!iso) return "nie";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + "s"; if (s < 3600) return Math.floor(s / 60) + "min";
  if (s < 86400) return Math.floor(s / 3600) + "h"; return Math.floor(s / 86400) + "d";
};
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const eur = (n) => CUR + (Number(n) || 0).toFixed(2);

const State = { view: "dashboard", selectedKey: null, isOwner: true, userName: "", servers: [], orders: [], stats: null };

/* ---------------- Views ---------------- */
const Views = {};

// OWNER: alle Server + Stats
Views.owner = async () => {
  const st = State.stats || {};
  $("#content").innerHTML = `
    <div class="a-stats">
      <div class="a-stat"><div class="v">${st.servers ?? 0}</div><div class="l">Server gesamt</div></div>
      <div class="a-stat"><div class="v">${st.online ?? 0}</div><div class="l">Server online</div></div>
      <div class="a-stat"><div class="v">${st.players ?? 0}</div><div class="l">Spieler aktiv</div></div>
      <div class="a-stat"><div class="v">${st.orders ?? 0}</div><div class="l">Bestellungen</div></div>
      <div class="a-stat"><div class="v">${eur(st.balance)}</div><div class="l">Guthaben gesamt</div></div>
    </div>
    <div class="section-head"><h3>Alle Server (${State.servers.length})</h3>
      <button class="btn btn-sm" id="addServer">+ Server/Kunde manuell</button></div>
    <div class="a-tablewrap">${serversTable(State.servers)}</div>`;
  bindServerRows();
  const add = $("#addServer"); if (add) add.onclick = addServerModal;
};

// DASHBOARD: dein Server (volles Management)
Views.dashboard = async () => {
  if (!State.servers.length) {
    $("#viewTitle").textContent = "Dashboard";
    $("#content").innerHTML = `<div class="empty">📡<b>Noch kein Server verbunden</b><span>Sobald dein ArumiAC-Server meldet, erscheint er hier automatisch.</span></div>`;
    return;
  }
  if (!State.selectedKey || !State.servers.find((s) => s.key === State.selectedKey)) {
    State.selectedKey = [...State.servers].sort((a, b) => new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0))[0].key;
  }
  await openServer(State.selectedKey);
};

function serversTable(list) {
  if (!list.length) return `<div class="empty">📡<b>Noch keine Server</b><span>Sobald ein ArumiAC-Server meldet, erscheint er hier.</span></div>`;
  return `<table><thead><tr>
      <th>Status</th><th>Servername</th><th>Lizenz-Key</th><th>Spieler</th><th>Guthaben</th><th>Zuletzt</th><th></th>
    </tr></thead><tbody>${list.map((s) => `
      <tr>
        <td><span class="pill"><span class="dot ${s.online ? "on" : "off"}"></span>${s.online ? "Online" : "Offline"}</span></td>
        <td><b>${esc(s.serverName || "Unbekannt")}</b>${s.owner ? `<div class="cell-muted" style="font-size:12px">${esc(s.owner)}</div>` : ""}</td>
        <td class="mono" title="Klicken zum Kopieren" style="cursor:pointer" onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(s.key)}')">${esc(s.key)}</td>
        <td>${s.players || 0}${s.maxPlayers ? " / " + s.maxPlayers : ""}</td>
        <td class="bal">${eur(s.balance)}</td>
        <td class="cell-muted">vor ${ago(s.lastSeen)}</td>
        <td class="row-actions">
          <button class="btn btn-xs btn-primary" data-manage="${esc(s.key)}">Verwalten</button>
          <button class="btn btn-xs btn-ghost" data-wallet="${esc(s.key)}">Guthaben</button>
        </td>
      </tr>`).join("")}</tbody></table>`;
}

// KUNDEN: alle die sich im Panel angemeldet haben (Discord) -> Guthaben geben
Views.kunden = async () => {
  let users = [];
  try { users = (await api("/api/admin/users")).users || []; } catch {}
  const bu = $("#bUsers"); if (bu) bu.textContent = users.length;
  $("#content").innerHTML = `
    <div class="section-head"><h3>User (${users.length})</h3>
      <span class="sub">Jeder, der sich mit Discord im Panel anmeldet, erscheint hier — egal ob mit Key oder ohne.</span></div>
    <div class="a-tablewrap">${users.length ? `<table><thead><tr>
        <th>Kunde</th><th>Discord-ID</th><th>Guthaben</th><th>Letzter Login</th><th></th></tr></thead>
      <tbody>${users.map((u) => `<tr>
        <td><div style="display:flex;align-items:center;gap:9px"><span class="u-av">${u.avatar
          ? `<img src="https://cdn.discordapp.com/avatars/${esc(u.id)}/${esc(u.avatar)}.png?size=32" alt="">`
          : esc((u.username || "?").slice(0, 1).toUpperCase())}</span><b>${esc(u.username || "—")}</b></div></td>
        <td class="mono">${esc(u.id)}</td>
        <td class="bal">${eur(u.balance)}</td>
        <td class="cell-muted">vor ${ago(u.lastSeen)}</td>
        <td class="row-actions"><button class="btn btn-xs btn-primary" data-uwallet="${esc(u.id)}">Guthaben</button></td>
      </tr>`).join("")}</tbody></table>`
      : `<div class="empty">👤<b>Noch keine User</b><span>Sobald sich jemand mit Discord im Panel anmeldet, erscheint er hier.</span></div>`}</div>`;
  $$("[data-uwallet]").forEach((b) => (b.onclick = () => userWalletModal(b.dataset.uwallet)));
};

async function userWalletModal(id) {
  let u;
  try { u = (await api("/api/admin/users/" + encodeURIComponent(id))).user; } catch (e) { return toast("Fehler: " + e.message, "err"); }
  openModal(`
    <h3>Guthaben — ${esc(u.username || id)}</h3>
    <p class="m-sub">Discord-ID: <span class="mono">${esc(id)}</span></p>
    <div class="wal-bal"><div class="n" id="walBal">${eur(u.balance || 0)}</div><div class="l">Aktuelles Guthaben</div></div>
    <div class="wal-row">
      <input id="walAmt" type="number" step="0.01" placeholder="Betrag (z.B. 49.99)" />
      <input id="walReason" type="text" placeholder="Grund (optional)" />
    </div>
    <div class="wal-actions">
      <button class="btn btn-primary" data-t="add">+ Aufladen</button>
      <button class="btn btn-danger" data-t="deduct">− Abbuchen</button>
      <button class="btn btn-ghost" data-t="set">= Setzen</button>
    </div>
    <div class="wal-hist"><h4>Verlauf</h4>${(u.txns && u.txns.length) ? u.txns.map((t) => `
      <div class="wal-tx"><span class="amt ${t.type === "deduct" ? "neg" : "pos"}">${t.type === "deduct" ? "−" : t.type === "set" ? "=" : "+"}${eur(t.amount)}</span>
      <span>${esc(t.reason || "—")}</span><span class="meta">${fmtDate(t.ts)} → ${eur(t.balanceAfter)}</span></div>`).join("")
      : `<p class="cell-muted" style="font-size:13px">Noch keine Buchungen.</p>`}</div>
    <div style="margin-top:16px;text-align:right"><button class="btn btn-ghost" data-close>Schließen</button></div>`);
  $$("[data-t]").forEach((b) => (b.onclick = async () => {
    const amount = parseFloat($("#walAmt").value), reason = $("#walReason").value;
    if (isNaN(amount)) { toast("Bitte Betrag eingeben", "err"); return; }
    try {
      const r = await api("/api/admin/users/" + encodeURIComponent(id) + "/wallet", "POST", { type: b.dataset.t, amount, reason });
      toast("Guthaben aktualisiert: " + eur(r.balance));
      userWalletModal(id);
    } catch (e) { toast("Fehler: " + e.message, "err"); }
  }));
}

Views.orders = async () => {
  try { State.orders = (await api("/api/admin/orders")).orders || []; } catch {}
  $("#bOrders").textContent = State.orders.length;
  const list = State.orders;
  $("#content").innerHTML = `
    <div class="section-head"><span class="sub">${list.length} Bestellungen</span></div>
    <div class="a-tablewrap">${!list.length ? `<div class="empty">🛒<b>Noch keine Bestellungen</b></div>` :
      `<table><thead><tr><th>ID</th><th>Plan</th><th>Preis</th><th>Key</th><th>Kontakt</th><th>Status</th><th>Datum</th></tr></thead>
      <tbody>${list.map((o) => `<tr>
        <td class="mono">${esc(o.id)}</td><td>${esc(o.planName)}</td><td>${esc(o.price)}</td>
        <td class="mono">${esc(o.key)}</td><td>${esc(o.discord || o.email || "—")}</td>
        <td><span class="pill">${esc(o.status)}</span></td><td class="cell-muted">${fmtDate(o.createdAt)}</td>
      </tr>`).join("")}</tbody></table>`}</div>`;
};

function bindServerRows() {
  $$("[data-manage]").forEach((b) => (b.onclick = () => { State.selectedKey = b.dataset.manage; navigate("dashboard"); }));
  $$("[data-wallet]").forEach((b) => (b.onclick = () => walletModal(b.dataset.wallet)));
}

/* ---------------- Server-Detail (volles Management) ---------------- */
const TABS = [["overview", "Übersicht"], ["bans", "Bans"], ["players", "Spieler"], ["captures", "Captures"], ["settings", "Einstellungen"]];

async function openServer(key) {
  State.selectedKey = key;
  $("#content").innerHTML = `<div style="padding:40px;text-align:center"><span class="spin"></span></div>`;
  try { State.detail = (await api("/api/admin/servers/" + encodeURIComponent(key))).server; }
  catch (e) { toast("Fehler: " + e.message, "err"); return navigate("owner"); }
  renderDetail("overview");
}

function renderDetail(tab) {
  const s = State.detail;
  $("#viewTitle").textContent = s.serverName || "Server";
  const picker = (State.isOwner && State.servers.length > 1)
    ? `<select id="srvPick" class="srv-pick">${State.servers.map((x) => `<option value="${esc(x.key)}" ${x.key === s.key ? "selected" : ""}>${esc(x.serverName || x.key)}</option>`).join("")}</select>` : "";
  $("#content").innerHTML = `
    <div class="det-head">
      ${State.isOwner ? `<button class="btn btn-ghost btn-sm" id="detBack">← Alle Server</button>` : ""}
      ${picker}
      <span class="pill"><span class="dot ${s.online ? "on" : "off"}"></span>${s.online ? "Online" : "Offline"}</span>
      <span class="cell-muted" style="font-size:12.5px">zuletzt vor ${ago(s.lastSeen)}</span>
      <button class="btn btn-sm" id="detWallet" style="margin-left:auto">Guthaben ${eur(s.balance)}</button>
    </div>
    <div class="det-tabs">${TABS.map(([id, l]) => `<a class="det-tab ${id === tab ? "active" : ""}" data-tab="${id}">${l}</a>`).join("")}</div>
    <div id="detBody"></div>`;
  const back = $("#detBack"); if (back) back.onclick = () => navigate("owner");
  const pick = $("#srvPick"); if (pick) pick.onchange = () => openServer(pick.value);
  $("#detWallet").onclick = () => walletModal(s.key);
  $$(".det-tab").forEach((t) => (t.onclick = () => renderDetail(t.dataset.tab)));
  renderTab(tab);
}

async function cmd(key, type, payload, okMsg) {
  try {
    await api(`/api/admin/servers/${encodeURIComponent(key)}/${type}`, "POST", payload);
    toast(okMsg + " — wird in ~15s ausgeführt");
  } catch (e) { toast("Fehler: " + e.message, "err"); }
}

function renderTab(tab) {
  const s = State.detail, body = $("#detBody");
  if (tab === "overview") {
    body.innerHTML = `<div class="kv">
      <span class="k">Lizenz-Key</span><span class="mono">${esc(s.key)}</span>
      <span class="k">FiveM-Lizenz</span><span class="mono">${esc(s.license || "—")}</span>
      <span class="k">IP</span><span class="mono">${esc(s.ip || "—")}</span>
      <span class="k">Version</span><span>${esc(s.version || "—")}</span>
      <span class="k">Spieler</span><span>${s.players || 0}${s.maxPlayers ? " / " + s.maxPlayers : ""}</span>
      <span class="k">Bans</span><span>${(s.bans || []).length}</span>
      <span class="k">Kunde/Notiz</span><span>${esc(s.owner || "—")}</span>
      <span class="k">Guthaben</span><span class="bal">${eur(s.balance)}</span>
    </div>${s.online ? "" : `<p class="cell-muted" style="margin-top:16px">⚫ Server ist offline. Befehle werden ausgeführt, sobald er wieder meldet.</p>`}`;
  }
  else if (tab === "bans") {
    const bans = s.bans || [];
    body.innerHTML = bans.length
      ? `<div class="a-tablewrap"><table><thead><tr><th>Ban-ID</th><th>Name</th><th>Grund</th><th></th></tr></thead><tbody>${bans.map((b) => `
        <tr><td class="mono">${esc(b.id)}</td><td><b>${esc(b.name || "—")}</b></td><td class="cell-muted">${esc(b.reason || "—")}</td>
        <td class="row-actions"><button class="btn btn-xs btn-danger" data-unban="${esc(b.id)}">Entbannen</button></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="empty">✅<b>Keine Bans</b></div>`;
    $$("[data-unban]").forEach((b) => (b.onclick = () => cmd(s.key, "unban", { banId: b.dataset.unban }, "Entbannen gesendet")));
  }
  else if (tab === "players") {
    const pl = s.playersList || [];
    body.innerHTML = pl.length
      ? `<div class="a-tablewrap"><table><thead><tr><th>ID</th><th>Name</th><th>Ping</th><th>Identifier</th><th>Aktionen</th></tr></thead><tbody>${pl.map((p) => `
        <tr><td><span class="pill">#${esc(p.id)}</span></td><td><b>${esc(p.name || "—")}</b></td><td>${p.ping || 0} ms</td>
        <td class="mono cell-muted" style="font-size:11px">${esc(p.steam || p.license || "—")}</td>
        <td class="row-actions">
          <button class="btn btn-xs btn-ghost" data-shot="${esc(p.id)}">📷 Shot</button>
          <button class="btn btn-xs btn-ghost" data-clip="${esc(p.id)}">🎬 Clip</button>
          <button class="btn btn-xs btn-danger" data-ban="${esc(p.id)}" data-name="${esc(p.name || "")}">Bannen</button>
        </td></tr>`).join("")}</tbody></table></div>`
      : `<div class="empty">👥<b>Niemand online</b><span>${s.online ? "" : "(Server offline)"}</span></div>`;
    $$("[data-shot]").forEach((b) => (b.onclick = () => cmd(s.key, "screenshot", { playerId: +b.dataset.shot }, "Screenshot angefordert")));
    $$("[data-clip]").forEach((b) => (b.onclick = () => cmd(s.key, "clip", { playerId: +b.dataset.clip, frames: 6, interval: 800 }, "Clip angefordert")));
    $$("[data-ban]").forEach((b) => (b.onclick = async () => {
      const reason = await promptModal({ title: `${b.dataset.name || "Spieler"} bannen`, text: "Grund eingeben:", value: "Ban über Panel" });
      if (reason === null) return;
      cmd(s.key, "ban", { playerId: +b.dataset.ban, reason }, "Ban gesendet");
    }));
  }
  else if (tab === "captures") {
    const caps = s.captures || [];
    body.innerHTML = caps.length
      ? `<div class="cap-grid">${caps.map((c, i) => `
        <div class="cap" data-cap="${i}"><div class="cap-thumb" style="background-image:url('${esc(c.url)}')"></div>
        <div class="cap-meta"><b>${esc(c.name || "—")}</b><span>${esc(c.kind || "")} · vor ${ago(new Date((c.time || 0) * 1000).toISOString())}</span></div></div>`).join("")}</div>`
      : `<div class="empty">📷<b>Keine Aufnahmen</b><span>Fordere unter „Spieler" einen Screenshot/Clip an.</span></div>`;
    $$("[data-cap]").forEach((el) => (el.onclick = () => { const c = caps[+el.dataset.cap];
      openModal(`<div style="text-align:center"><img src="${esc(c.url)}" style="max-width:100%;border-radius:10px"><p class="m-sub" style="margin-top:10px">${esc(c.name || "")} · ${esc(c.reason || "")}</p><div style="text-align:right"><button class="btn btn-ghost" data-close>Schließen</button></div></div>`); }));
  }
  else if (tab === "settings") {
    body.innerHTML = renderSettings(s.config);
    bindSettings(s.key);
  }
}

/* ---- Settings (editierbar -> Befehl an Server) ---- */
function renderSettings(cfg) {
  if (!cfg) return `<p class="cell-muted">Dieser Server hat noch keine Config gemeldet.</p>`;
  const sw = (section, key, val) => `<label class="sw"><input type="checkbox" data-toggle data-section="${esc(section)}" data-key="${esc(key)}" ${val ? "checked" : ""}><span class="sw-t"></span></label>`;
  const valItem = (key, val) => `<div class="cfg-item"><span class="k">${esc(key)}</span><span class="flag val">${esc(Array.isArray(val) ? val.length + " Einträge" : val)}</span></div>`;
  const boolItem = (section, key, val) => `<div class="cfg-item"><span class="k">${esc(key)}</span>${sw(section, key, val)}</div>`;
  const keys = Object.keys(cfg).sort();
  const scalars = keys.filter((k) => typeof cfg[k] !== "object");
  const objects = keys.filter((k) => cfg[k] && typeof cfg[k] === "object" && !Array.isArray(cfg[k]));
  const arrays = keys.filter((k) => Array.isArray(cfg[k]));
  let h = `<p class="cell-muted" style="margin-bottom:14px;font-size:12.5px">Änderungen werden beim nächsten Sync (~15s) auf dem Server übernommen.</p><div class="cfg-wrap">`;
  h += `<div class="cfg-grp">Schalter & Werte</div><div class="cfg-grid">${scalars.map((k) => typeof cfg[k] === "boolean" ? boolItem("", k, cfg[k]) : valItem(k, cfg[k])).join("")}</div>`;
  if (arrays.length) h += `<div class="cfg-grp">Whitelists</div><div class="cfg-grid">${arrays.map((k) => valItem(k, cfg[k])).join("")}</div>`;
  if (objects.length) {
    h += `<div class="cfg-grp">Module</div><div class="cfg-grid">`;
    for (const k of objects) { const sub = cfg[k];
      h += `<div class="cfg-sub"><div class="st"><span>${esc(k)}</span>${typeof sub.Enabled === "boolean" ? sw(k, "Enabled", sub.Enabled) : ""}</div>
        <div class="cfg-grid">${Object.keys(sub).filter((x) => x !== "Enabled").map((sk) => typeof sub[sk] === "boolean" ? boolItem(k, sk, sub[sk]) : valItem(sk, sub[sk])).join("")}</div></div>`;
    }
    h += `</div>`;
  }
  return h + `</div>`;
}
function bindSettings(key) {
  $$("[data-toggle]").forEach((el) => (el.onchange = () =>
    cmd(key, "config", { section: el.dataset.section || null, key: el.dataset.key, value: el.checked }, `${el.dataset.key} → ${el.checked ? "AN" : "AUS"}`)));
}

/* ---- kleiner Prompt ---- */
function promptModal({ title, text, value = "" }) {
  return new Promise((resolve) => {
    openModal(`<h3>${esc(title)}</h3><p class="m-sub">${esc(text)}</p>
      <input id="pmIn" value="${esc(value)}" style="width:100%;padding:11px 12px;border-radius:10px;background:var(--bg-2);border:1px solid var(--border-2);color:var(--text);font-family:inherit;font-size:14px">
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
        <button class="btn btn-ghost" id="pmNo">Abbrechen</button><button class="btn btn-primary" id="pmOk">OK</button></div>`);
    const inp = $("#pmIn"); inp.focus();
    inp.onkeydown = (e) => { if (e.key === "Enter") { closeModal(); resolve(inp.value); } };
    $("#pmNo").onclick = () => { closeModal(); resolve(null); };
    $("#pmOk").onclick = () => { closeModal(); resolve(inp.value); };
  });
}

/* ---------------- Wallet ---------------- */
async function walletModal(key) {
  const s = (await api("/api/admin/servers/" + encodeURIComponent(key))).server;
  const render = (bal, txns) => {
    openModal(`
      <h3>Guthaben verwalten</h3>
      <p class="m-sub">${esc(s.serverName || "Server")} · <span class="mono">${esc(key)}</span></p>
      <div class="wal-bal"><div class="n" id="walBal">${eur(bal)}</div><div class="l">Aktuelles Guthaben</div></div>
      <div class="wal-row">
        <input id="walAmt" type="number" step="0.01" placeholder="Betrag (z.B. 49.99)" />
        <input id="walReason" type="text" placeholder="Grund (optional)" />
      </div>
      <div class="wal-actions">
        <button class="btn btn-primary" data-t="add">+ Aufladen</button>
        <button class="btn btn-danger" data-t="deduct">− Abbuchen</button>
        <button class="btn btn-ghost" data-t="set">= Setzen</button>
      </div>
      <div class="wal-hist"><h4>Verlauf</h4>${(txns && txns.length) ? txns.map((t) => `
        <div class="wal-tx">
          <span class="amt ${t.type === "deduct" ? "neg" : "pos"}">${t.type === "deduct" ? "−" : t.type === "set" ? "=" : "+"}${eur(t.amount)}</span>
          <span>${esc(t.reason || "—")}</span>
          <span class="meta">${fmtDate(t.ts)} → ${eur(t.balanceAfter)}</span>
        </div>`).join("") : `<p class="cell-muted" style="font-size:13px">Noch keine Buchungen.</p>`}</div>
      <div style="margin-top:16px;text-align:right"><button class="btn btn-ghost" data-close>Schließen</button></div>`);
    $$("[data-t]").forEach((b) => (b.onclick = () => doWallet(key, b.dataset.t)));
  };
  render(s.balance || 0, s.txns || []);
}

async function doWallet(key, type) {
  const amount = parseFloat($("#walAmt").value);
  const reason = $("#walReason").value;
  if (isNaN(amount)) { toast("Bitte einen Betrag eingeben", "err"); return; }
  try {
    const r = await api("/api/admin/wallet", "POST", { key, type, amount, reason });
    toast("Guthaben aktualisiert: " + eur(r.balance));
    await loadServers();
    walletModal(key); // neu laden mit aktualisiertem Verlauf
  } catch (e) { toast("Fehler: " + e.message, "err"); }
}

function addServerModal() {
  openModal(`
    <h3>Server / Kunde manuell anlegen</h3>
    <p class="m-sub">Z.B. um vor dem ersten Report schon Guthaben zu vergeben.</p>
    <label class="field"><span>Lizenz-Key</span><input id="msKey" placeholder="ARUMI-XXXX-XXXX-XXXX-XXXX" /></label>
    <label class="field"><span>Kunde / Notiz (optional)</span><input id="msOwner" placeholder="z.B. Max RP" /></label>
    <div class="modal-actions" style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-ghost" data-close>Abbrechen</button>
      <button class="btn btn-primary" id="msSave">Anlegen</button>
    </div>`);
  $("#msSave").onclick = async () => {
    const key = $("#msKey").value.trim();
    if (!key) { toast("Bitte Key eingeben", "err"); return; }
    try { await api("/api/admin/servers", "POST", { key, owner: $("#msOwner").value.trim() });
      closeModal(); toast("Angelegt"); await loadServers(); navigate("owner"); }
    catch (e) { toast(e.status === 409 ? "Key existiert bereits" : "Fehler: " + e.message, "err"); }
  };
}

/* ---------------- Shell ---------------- */
function navigate(view) {
  if ((view === "owner" || view === "orders" || view === "kunden") && !State.isOwner) view = "dashboard";
  State.view = view;
  $$(".a-nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  $("#viewTitle").textContent = { dashboard: "Dashboard", owner: "Owner", kunden: "User", orders: "Bestellungen" }[view] || view;
  (Views[view] || Views.dashboard)();
}
async function loadServers() {
  try { State.servers = (await api("/api/admin/servers")).servers || []; } catch {}
  try { State.stats = (await api("/api/admin/stats")).stats; } catch {}
  const bs = $("#bServers"); if (bs) bs.textContent = State.servers.length;
  if (State.stats) { const bo = $("#bOrders"); if (bo) bo.textContent = State.stats.orders; }
}
async function refreshAll() { await loadServers(); navigate(State.view); }

$$(".a-nav-item").forEach((n) => (n.onclick = () => navigate(n.dataset.view)));
$("#btnRefresh").onclick = () => { refreshAll(); toast("Aktualisiert"); };
$("#btnLogout").onclick = async () => { try { await api("/api/admin/logout", "POST"); } catch {} location.reload(); };

async function enterApp() {
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#app").classList.toggle("is-owner", !!State.isOwner);
  $("#userName").textContent = (State.userName || "") + (State.isOwner ? " · Owner" : "");
  await refreshAll();
  navigate("dashboard");
  setInterval(loadServers, 20000);
}

/* Boot */
const ERR_MAP = {
  denied: "Dieser Discord-Account ist nicht als Admin freigeschaltet.",
  discord_not_configured: "Discord-Login ist noch nicht eingerichtet (Client-ID/Secret in .env).",
  token: "Discord-Login fehlgeschlagen — bitte erneut versuchen.",
  oauth: "Discord-Login fehlgeschlagen — bitte erneut versuchen.",
  nocode: "Login abgebrochen.",
};
(async () => {
  const params = new URLSearchParams(location.search);
  const err = params.get("error");
  const loginOk = params.get("login") === "1";
  history.replaceState(null, "", location.pathname);
  if (err) {
    $("#loginHint").textContent = (ERR_MAP[err] || "Login fehlgeschlagen.") + "  [" + err + "]";
    $("#loginHint").className = "a-hint err";
  }
  try {
    const me = await api("/api/admin/me");
    if (me.ok) { State.isOwner = me.isOwner !== false; State.userName = me.name || ""; return enterApp(); }
    if (loginOk) {
      $("#loginHint").textContent = "Discord-Login hat geklappt, aber die Sitzung bleibt nicht erhalten (Cookie wird nicht gespeichert).  [session]";
      $("#loginHint").className = "a-hint err";
    } else if (!me.discordLogin && !err) {
      $("#loginHint").textContent = "Hinweis: Discord-Login ist noch nicht eingerichtet (Client-ID/Secret + Redirect in der .env).";
    }
  } catch {}
})();
