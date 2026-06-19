/* ====================================================================
   ArumiAC — Verkaufs-Website Frontend
   ==================================================================== */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ICON = {
  check: '<path d="M20 6L9 17l-5-5"/>',
  noclip: '<path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/>',
  aim: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  boom: '<path d="M12 2l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1.5z"/>',
  car: '<path d="M5 13l1.5-5h11L19 13M5 13h14v5H5zM7 18v2M17 18v2"/><circle cx="7.5" cy="15.5" r="1"/><circle cx="16.5" cy="15.5" r="1"/>',
  spoof: '<path d="M9 7a3 3 0 1 1 6 0M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3l5 5M21 3l-5 5"/>',
  cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  gun: '<path d="M3 8h13l3 4h2v3h-7l-2 3H8v-3H5l-2-3z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  bolt: '<path d="M13 2L3 14h7l-1 8 10-12h-7z"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ""}</svg>`;

const FEATURES = [
  { i: "aim", t: "Aimbot & Silent Aim", d: "Erkennt manipulierte Trefferdaten und unmögliche Schüsse zuverlässig server-seitig." },
  { i: "noclip", t: "Anti Noclip & Teleport", d: "Mehrstufige Bewegungs-Checks gegen Noclip, Fly und illegale Teleports." },
  { i: "boom", t: "Anti Explosion & Fire", d: "Blockt Explosion-Exploits, Feuer-Spam und unsichtbare Schäden." },
  { i: "car", t: "Entity-Spawn-Schutz", d: "Verhindert illegale Fahrzeug-, Ped- und Objekt-Spawns inkl. Limits." },
  { i: "spoof", t: "Anti Spoofer", d: "Bannt Wiederkehrer über Hardware-Token — auch nach Identitätswechsel." },
  { i: "cam", t: "Screenshot-Beweise", d: "Automatische Screenshots beim Ban (GL-Shader) direkt in deinen Discord." },
  { i: "gun", t: "Weapon Detections", d: "Erkennt illegale Waffen, Spoofed Bullets, Give-Weapon und No-Recoil." },
  { i: "bolt", t: "Anti Bypass", d: "Heartbeat-Überwachung & Injection-Schutz gegen Bypass-Versuche." },
  { i: "shield", t: "30+ Module", d: "Godmode, Speedhack, Freecam, Crasher, Magneto, NUI-Devtools u.v.m." },
];

/* ---------------- Toast ---------------- */
function toast(msg, type = "ok") {
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3000);
}

/* ---------------- Modal ---------------- */
function openModal(html) { $("#modalBox").innerHTML = html; $("#modalRoot").classList.remove("hidden"); }
function closeModal() { $("#modalRoot").classList.add("hidden"); $("#modalBox").innerHTML = ""; }
$("#modalRoot").addEventListener("click", (e) => { if (e.target.dataset.close !== undefined) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* ---------------- State ---------------- */
let PLANS = [];

/* ---------------- Render Features ---------------- */
$("#featureGrid").innerHTML = FEATURES.map((f) => `
  <div class="feature">
    <div class="fi">${svg(f.i)}</div>
    <h3>${esc(f.t)}</h3>
    <p>${esc(f.d)}</p>
  </div>`).join("");

/* ---------------- Render Pricing ---------------- */
async function loadPlans() {
  try {
    const r = await fetch("/api/plans").then((x) => x.json());
    PLANS = r.plans || [];
    $("#priceGrid").innerHTML = PLANS.map((p) => `
      <div class="price ${p.badge ? "featured" : ""}">
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
        <span class="pname">${esc(p.name)}</span>
        <div class="pprice">${esc(p.priceLabel)}<span class="per">${esc(p.period)}</span></div>
        <ul>${p.features.map((f) => `<li>${svg("check")}<span>${esc(f)}</span></li>`).join("")}</ul>
        <button class="btn btn-primary btn-block" data-buy="${esc(p.id)}">Auswählen</button>
      </div>`).join("");
    $$("[data-buy]").forEach((b) => (b.onclick = () => openCheckout(b.dataset.buy)));
  } catch {
    $("#priceGrid").innerHTML = `<p style="color:var(--muted);text-align:center;grid-column:1/-1">Preise konnten nicht geladen werden.</p>`;
  }
}

/* ---------------- Checkout ---------------- */
function openCheckout(planId) {
  const p = PLANS.find((x) => x.id === planId);
  if (!p) return;
  openModal(`
    <h3>Bestellung</h3>
    <p class="m-sub">Du erhältst deinen Lizenz-Key sofort nach Abschluss.</p>
    <div class="order-sum">
      <span class="os-name">${esc(p.name)}</span>
      <span class="os-price">${esc(p.priceLabel)} <span style="font-size:12px;color:var(--muted)">${esc(p.period)}</span></span>
    </div>
    <label class="field"><span>E-Mail</span><input id="coEmail" type="email" placeholder="du@beispiel.de" /></label>
    <label class="field"><span>Discord (für die Freischaltung)</span><input id="coDiscord" type="text" placeholder="dein_discord" /></label>
    <button class="btn btn-primary btn-block btn-lg" id="coSubmit" data-plan="${esc(p.id)}">Kostenpflichtig bestellen</button>
    <p style="font-size:11.5px;color:var(--muted);text-align:center;margin-top:12px">Mit der Bestellung akzeptierst du, dass die Freischaltung nach Zahlungseingang erfolgt.</p>
  `);
  const btn = $("#modalBox").querySelector("[data-plan]");
  btn.onclick = () => submitOrder(p.id, btn);
}

async function submitOrder(planId, btn) {
  const email = $("#coEmail").value.trim();
  const discord = $("#coDiscord").value.trim();
  if (!email && !discord) { toast("Bitte E-Mail oder Discord angeben", "err"); return; }
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span> Wird bearbeitet…`;
  try {
    const r = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId, email, discord }),
    }).then((x) => x.json());
    if (!r.ok) throw new Error(r.error || "Fehler");
    showSuccess(r.order);
  } catch (e) {
    const map = { invalid_email: "Ungültige E-Mail.", contact_required: "Bitte E-Mail oder Discord angeben.", invalid_plan: "Plan nicht gefunden." };
    toast(map[e.message] || "Bestellung fehlgeschlagen", "err");
    btn.disabled = false;
    btn.textContent = "Kostenpflichtig bestellen";
  }
}

function showSuccess(order) {
  openModal(`
    <div class="modal-center">
      <div class="success-ico">${svg("check")}</div>
      <h3>Bestellung eingegangen!</h3>
      <p class="m-sub">${esc(order.plan)} · ${esc(order.price)} · Bestell-ID ${esc(order.id)}</p>
    </div>
    <div class="keybox">
      <div class="kl">Dein Lizenz-Key</div>
      <div class="k" id="theKey">${esc(order.key)}</div>
    </div>
    <button class="btn btn-block" id="copyKey">Key kopieren</button>
    <p style="font-size:12.5px;color:var(--muted);text-align:center;margin-top:14px">
      Bewahre den Key sicher auf. Die <b>Freischaltung</b> erfolgt nach Zahlungseingang —
      melde dich dafür mit deiner Bestell-ID in unserem Discord.
    </p>
    <button class="btn btn-ghost btn-block" data-close style="margin-top:10px">Schließen</button>
  `);
  $("#copyKey").onclick = () => {
    navigator.clipboard?.writeText(order.key).then(() => toast("Key kopiert"));
  };
}

/* ---------------- Nav / UI ---------------- */
const nav = $("#nav");
window.addEventListener("scroll", () => nav.classList.toggle("scrolled", window.scrollY > 10));
$("#burger").onclick = () => $(".nav-links").classList.toggle("open");
$$(".nav-links a").forEach((a) => (a.onclick = () => $(".nav-links").classList.remove("open")));

function setTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem("arumi_theme", t); }
$("#btnTheme").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
setTheme(localStorage.getItem("arumi_theme") || "dark");

$("#year").textContent = new Date().getFullYear();

loadPlans();
