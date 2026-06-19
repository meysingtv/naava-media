# ArumiAC — Verkaufs-Website (Landing + Shop)

Eigenständige Website, über die Kunden **ArumiAC kaufen** und sofort einen
**Lizenz-Key** erhalten. Läuft komplett **ohne MySQL/oxmysql** — nur Node.js,
Speicher ist eine JSON-Datei. Ideal für einen Test-/Verkaufsserver.

- 🖤 Schwarz/Weiß-Design, Landingpage + Feature-Sektion + Preise + FAQ
- 🛒 Checkout → automatischer Lizenz-Key
- 🔔 Optional Discord-Webhook bei jeder Bestellung
- 🔐 Mini-Admin unter `/admin` (Bestellungen + Keys, Freischalten/Sperren)
- ⚙️ Zahlung aktuell **manuell** (Key sofort, Freischaltung nach Zahlungseingang) — Stripe/PayPal/Tebex später nachrüstbar

---

## 1) Auf dem Test-Server starten

Voraussetzung: **Node.js 18+**.

```bash
cd ArumiAC-Panel
npm install            # installiert nur express + dotenv
cp .env.example .env   # anpassen (siehe unten)
node server.js         # läuft auf http://localhost:3000
```

Dauerhaft laufen lassen (empfohlen):
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### `.env`
```ini
PORT=3000
SITE_NAME=ArumiAC
CURRENCY=€
DISCORD_WEBHOOK=         # optional: Webhook-URL für Bestell-Benachrichtigungen
ADMIN_USER=admin
ADMIN_PASSWORD=          # setzen, um /admin zu aktivieren
```

---

## 2) Domain mit Cloudflare (Schritt für Schritt)

1. **Domain kaufen** (Namecheap, Porkbun, IONOS oder Cloudflare Registrar).
2. **Cloudflare-Account** (kostenlos) → **„Add a site"** → Domain eintragen → **Free**-Plan.
3. Cloudflare zeigt **2 Nameserver** → diese beim Domain-Anbieter als Nameserver eintragen
   (ersetzt die bestehenden). Aktiv in Minuten bis max. 24 h.
4. Cloudflare → **DNS → Add record**:
   - **Type** `A` · **Name** `@` · **IPv4** = *deine Test-Server-IP* · **Proxy** 🟠 *Proxied*
   - Optional zweiter `A`-Record `www` → gleiche IP.
5. Cloudflare → **SSL/TLS** → Modus **„Full"** → HTTPS für Besucher ist automatisch aktiv.
6. **Nginx** auf dem Server als Reverse-Proxy (Port 80 → Node 3000):
   `/etc/nginx/sites-available/arumi-shop`
   ```nginx
   server {
       listen 80;
       server_name arumiac.de www.arumiac.de;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   ```bash
   sudo apt install -y nginx
   sudo ln -s /etc/nginx/sites-available/arumi-shop /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   > Mit Cloudflare „Proxied" + „Full" brauchst du **kein** certbot — Cloudflare liefert das
   > öffentliche HTTPS. (Für „Full (strict)" zusätzlich ein Cloudflare Origin-Zertifikat installieren.)
7. **Firewall** (ufw): nur `80`, `443`, `22` offen. Optional nur Cloudflare-IPs zulassen →
   deine echte Server-IP bleibt verborgen.

Fertig → **https://arumiac.de** zeigt deinen Shop.

---

## 3) Bestellungen & Keys verwalten

- Jede Bestellung wird in `data/orders.json` gespeichert und (falls gesetzt) per
  **Discord-Webhook** gemeldet — inklusive Key.
- **`/admin`** (mit `ADMIN_PASSWORD`): zeigt alle Bestellungen, Keys, Kontakt und Status.
  Button **Freischalten/Sperren** setzt `pending` ↔ `active`, sobald die Zahlung da ist.

### Preise/Pläne ändern
In `server.js` oben im Array `PLANS` — Name, Preis, Zeitraum, Features. Speichern, neu starten.

### Echte Zahlung nachrüsten
Aktuell „manuell" (Key sofort, Freischaltung nach Zahlung). Später integrierbar:
**Stripe** (Checkout-Session + Webhook), **PayPal** oder **Tebex** (FiveM-Standard).
Sag Bescheid, dann baue ich den gewünschten Anbieter in `server.js` ein.

> **Hinweis zur Key-Aktivierung in ArumiAC:** ArumiAC prüft Lizenzen gegen den
> Verify-Server des Anbieters (`InternalConfig.VerifyURL`) bzw. die `key.txt`. Damit ein hier
> verkaufter Key im Anticheat funktioniert, muss er in deinem Lizenzsystem hinterlegt sein.
> Dieser Shop erzeugt & verwaltet die Keys/Bestellungen — die Übergabe an den Kunden machst du
> (manuell oder per Anbindung an dein Verify-System).

---

## Struktur
```
ArumiAC-Panel/
├─ server.js            Backend (Express, JSON-Speicher, /api + /admin)
├─ package.json         nur express + dotenv
├─ ecosystem.config.js  pm2
├─ .env.example         -> .env
├─ data/orders.json     (wird automatisch angelegt)
└─ public/              Website (schwarz/weiß)
   ├─ index.html
   ├─ styles.css
   └─ app.js
```

*ArumiAC · Verkaufs-Website · Schwarz / Weiß*
