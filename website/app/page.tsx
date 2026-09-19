import { Bell, Check, Gauge, Lock, Server, Shield, Sparkles, Users2, Wand2, X } from "lucide-react";

import { Btn, Container, cn } from "@/components/ui";
import { CtaBand, FeatureRow, SectionHead } from "@/components/bits";
import { GridMotif, RouteMotif } from "@/components/decor";
import {
  BrowserFrame,
  ChatMock,
  CockpitMock,
  DashboardMock,
  DispoMock,
  FinanzenMock,
  PhoneMock,
  SchuelerakteMock,
} from "@/components/mockups";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mint-soft/70 via-white to-white">
        <GridMotif className="opacity-70" />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(55% 50% at 90% -8%, rgba(44,186,117,.28), transparent 66%)" }}
          aria-hidden
        />
        <Container className="relative grid items-center gap-12 py-16 md:grid-cols-[1.02fr_.98fr] md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-mint shadow-sm">
              <span className="h-2 w-2 animate-pulse2 rounded-full bg-mint-accent" /> Software für Fahrschulen
            </span>
            <h1 className="mt-6 font-display text-[clamp(42px,6.2vw,70px)] font-extrabold leading-[0.95] tracking-[-0.03em] text-ink text-balance">
              Die Fahrschule läuft.
              <br />
              <span className="relative inline-block text-mint">
                Du hast den Kopf frei.
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none" aria-hidden>
                  <path d="M2 7 C 80 2, 220 2, 298 6" stroke="#9DF1C8" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-[42ch] text-[19px] leading-relaxed text-muted">
              FahrschulApp verbindet Disposition, Schüler, Finanzen, Prüfungen und Kommunikation in einer Software – damit
              weniger organisiert werden muss und mehr einfach läuft.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href="/demo" size="lg" arrow>
                Demo anfordern
              </Btn>
              <Btn href="/funktionen" variant="ghost" size="lg">
                Funktionen ansehen
              </Btn>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-muted">
              {["DSGVO-konform", "Made in Germany", "In Minuten startklar"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-mint" strokeWidth={3} /> {t}
                </span>
              ))}
            </div>
          </div>

          <div data-reveal data-delay="60ms" className="relative">
            {/* Farbige Bühne */}
            <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-mint to-mint-dark p-4 shadow-[0_50px_100px_-40px_rgba(15,45,30,.55)] sm:p-6">
              <RouteMotif className="text-white/15" />
              <div className="relative">
                <BrowserFrame url="app.fahrschulapp.de/leitstand">
                  <div className="flex items-center gap-2 border-b border-line bg-mint-soft/50 px-3 py-2">
                    <span className="font-display text-[14px] font-extrabold">
                      Fahrschul<span className="text-mint">App</span>
                    </span>
                    <span className="rounded-full border border-mint-hi bg-white px-2 py-0.5 text-[10px] font-bold text-mint">Leitstand</span>
                    <span className="ml-auto text-[11px] text-muted">Fahrschule Weber</span>
                  </div>
                  <DashboardMock />
                </BrowserFrame>
              </div>
            </div>
            {/* Schwebende Karte */}
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-2.5 rounded-2xl border border-line bg-white/95 px-3.5 py-2.5 shadow-[0_20px_40px_-16px_rgba(15,45,30,.35)] backdrop-blur sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint-soft text-mint">
                <Bell className="h-4.5 w-4.5" />
              </span>
              <div className="leading-tight">
                <div className="text-[13px] font-bold text-ink">Termin bestätigt ✓</div>
                <div className="text-[11.5px] text-muted">Lisa · Do 09:00</div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* TRUST STRIP */}
      <div className="border-y border-line bg-paper">
        <Container className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 py-5 text-[14px] font-semibold text-muted">
          {["Für Einzel- & Mehr-Standort-Fahrschulen", "Made in Germany", "DATEV · SEPA · XRechnung", "Persönlicher Support"].map(
            (t, i) => (
              <span key={t} className="inline-flex items-center gap-7">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-line2" aria-hidden />}
                {t}
              </span>
            ),
          )}
        </Container>
      </div>

      {/* PROBLEM -> LÖSUNG */}
      <section className="bg-paper py-20 md:py-24">
        <Container>
          <SectionHead
            center
            eyebrow="Das Problem"
            title="Schluss mit Zettel, Excel und Telefon."
            sub="Der Fahrschulalltag ist über zu viele Tools verteilt. Das kostet Zeit, Nerven und Geld."
          />
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5" data-reveal>
            {[
              "Termine in mehreren Kalendern",
              "Fahrlehrer ständig koordinieren",
              "Schüler fragen nach Terminen",
              "Absagen vergessen",
              "offene Rechnungen im Blick behalten",
              "Papierakten & Excel-Listen",
              "Infos an fünf verschiedenen Orten",
            ].map((p) => (
              <span key={p} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-[14px] text-ink/80">
                <X className="h-3.5 w-3.5 text-[#D23F3F]" strokeWidth={2.5} /> {p}
              </span>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center font-display text-[clamp(20px,2.6vw,28px)] font-bold text-ink text-balance">
            Ein System. Ein Überblick. <span className="text-mint">Weniger Nacharbeit.</span>
          </p>
        </Container>
      </section>

      {/* FUNKTIONEN */}
      <section id="funktionen">
        <Container>
          <SectionHead center eyebrow="Funktionen" title="Alles für den Fahrschulalltag" className="mb-4" />

          <FeatureRow
            kick="Disposition"
            title="Jede Fahrstunde dort, wo sie hingehört"
            text="Plane Fahrlehrer, Fahrzeuge und Schüler auf einer klaren Zeitachse. Verfügbarkeiten, Prüfungen und Sperrzeiten inklusive – Konflikte erkennt das System, bevor sie entstehen."
            points={["Ressourcen-Board für Lehrer & Fahrzeuge", "Freie Slots und Farbcodierung", "Prüfungen und Sperrzeiten berücksichtigt"]}
            cta={{ href: "/funktionen", label: "Mehr zur Disposition" }}
          >
            <BrowserFrame url="app.fahrschulapp.de/disposition">
              <DispoMock />
            </BrowserFrame>
          </FeatureRow>

          <FeatureRow
            reverse
            kick="Schülerverwaltung"
            title="Jeder Schüler. Jede Info. Eine digitale Akte."
            text="Stammdaten, Ausbildungsfortschritt, Theorie, Praxis, Dokumente, Termine und Zahlungen – papierlos und immer aktuell. Der Ausbildungsnachweis läuft mit."
            points={["Fortschritt & Prüfungsreife automatisch", "Digitaler Ausbildungsnachweis mit E-Signatur", "Unterlagen-Checkliste & Dokumente"]}
          >
            <BrowserFrame url="app.fahrschulapp.de/schueler">
              <SchuelerakteMock />
            </BrowserFrame>
          </FeatureRow>

          <FeatureRow
            kick="Finanzen"
            title="Finanzen, die nicht hinterherlaufen"
            text="Von der Rechnung über Ratenpläne bis zum Mahnwesen. Mit SEPA-Lastschrift, XRechnung und DATEV-Export – der Zahlungsstatus ist jederzeit klar."
            points={["Rechnungen, Ratenpläne, Mahnwesen", "Offene Posten nach Alter", "SEPA · XRechnung · DATEV"]}
          >
            <BrowserFrame url="app.fahrschulapp.de/finanzen">
              <FinanzenMock />
            </BrowserFrame>
          </FeatureRow>

          <FeatureRow
            reverse
            kick="Theorie & Prüfungen"
            title="Theorie und Praxis laufen zusammen"
            text="Theoriefortschritt, Prüfungstermine und offene Voraussetzungen an einem Ort. So weißt du früh, wer bereit ist – und wer noch etwas braucht."
            points={["Theoriefortschritt je Schüler", "Prüfungstermine & Status", "Erinnerungen an offene Voraussetzungen"]}
          >
            <BrowserFrame url="app.fahrschulapp.de/pruefungen">
              <div className="bg-white p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Anstehende Prüfungen</div>
                <div className="overflow-hidden rounded-xl border border-line">
                  {[
                    { d: "Di 18.09", n: "Mia Schäfer", a: "Praxis", o: "TÜV Nord", c: "text-mint" },
                    { d: "Do 19.09", n: "Sophie Bauer", a: "Theorie", o: "TÜV Süd", c: "text-[#C27C0E]" },
                    { d: "Mo 23.09", n: "Ben Krüger", a: "Praxis", o: "DEKRA", c: "text-mint" },
                  ].map((r, i) => (
                    <div key={r.n} className={cn("flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]", i > 0 && "border-t border-line")}>
                      <span className="w-16 font-bold tnum">{r.d}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{r.n}</span>
                      <span className={cn("font-semibold", r.c)}>{r.a}</span>
                      <span className="text-muted">{r.o}</span>
                    </div>
                  ))}
                </div>
              </div>
            </BrowserFrame>
          </FeatureRow>

          <FeatureRow
            id="schueler-app"
            kick="Schüler-App & Portal"
            title="Die Schüler sehen, was als Nächstes kommt"
            text="Termine, Fortschritt, Nachrichten, Zahlungen und Rechnungen – in einer eigenen App im Design deiner Fahrschule. Termine bestätigen die Schüler per Link."
            points={["Termine, Fortschritt & Zahlungen", "Online bezahlen & Termine bestätigen", "Weniger Rückfragen im Büro"]}
          >
            <PhoneMock />
          </FeatureRow>

          <FeatureRow
            reverse
            kick="Auswertung"
            title="Was läuft? Was fehlt? Wo musst du hinschauen?"
            text="Das Chef-Cockpit zeigt Live-Auslastung, No-Show-Quote und offene Posten nach Alter – die wichtigsten Zahlen, bevor du danach suchen musst."
            points={["Auslastung je Fahrlehrer & Fahrzeug", "No-Show-Quote in Echtzeit", "Offene Posten nach Alter"]}
          >
            <BrowserFrame url="app.fahrschulapp.de/cockpit">
              <CockpitMock />
            </BrowserFrame>
          </FeatureRow>
        </Container>
      </section>

      {/* HIGHLIGHTS (dark) */}
      <section id="highlights" className="mt-8 bg-ink py-20 text-white md:py-28">
        <Container>
          <SectionHead
            center
            eyebrow="Das hat sonst keiner"
            title={<span className="text-white">Vier Dinge, die deine Fahrschule spürbar entspannter machen</span>}
            sub={<span className="text-white/60">Funktionen, die andere Fahrschul-Programme so nicht haben – und die im Alltag Geld und Zeit sparen.</span>}
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <div data-reveal className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-9">
              <div className="flex items-center gap-2 text-mint-accent">
                <Sparkles className="h-5 w-5" />
                <span className="text-[13px] font-bold uppercase tracking-[0.12em]">KI-Assistent</span>
                <span className="ml-2 rounded-full bg-mint-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-mint-accent">Weltneuheit</span>
              </div>
              <h3 className="mt-4 font-display text-[26px] font-bold leading-tight">Sag einfach, was passieren soll.</h3>
              <p className="mt-3 max-w-[42ch] text-[15.5px] text-white/60">
                Der Assistent versteht Kontext und schlägt passende Aktionen vor – vom Termin planen bis zur Rechnung.
              </p>
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white">
                <ChatMock />
              </div>
            </div>
            <div className="grid gap-5">
              {[
                {
                  icon: Bell,
                  t: "No-Show-Killer",
                  tag: "Spart Geld",
                  d: "Automatische Erinnerungen per WhatsApp, SMS und E-Mail – mit Zusage-/Absage-Link. Weniger leere Sitze, weniger Nachtelefonieren.",
                },
                {
                  icon: Wand2,
                  t: "Smart-Disposition",
                  tag: "Spart Zeit",
                  d: "Die nächste sinnvolle Fahrstunde auf einen Klick – inklusive freiem Slot, Fahrlehrer und Fahrzeug.",
                },
                {
                  icon: Gauge,
                  t: "Chef-Cockpit",
                  tag: "Voller Überblick",
                  d: "Die wichtigsten Zahlen, bevor du danach suchen musst: Auslastung, Ausfälle, offene Posten.",
                },
              ].map((c) => (
                <div key={c.t} data-reveal className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-accent/15 text-mint-accent">
                      <c.icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-bold text-mint-accent">{c.tag}</span>
                  </div>
                  <h3 className="mt-3.5 font-display text-[20px] font-bold text-white">{c.t}</h3>
                  <p className="mt-2 text-[14.5px] text-white/60">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ABLAUF (Mint-Band) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-mint to-mint-dark py-20 text-white md:py-24">
        <RouteMotif className="text-white/12" />
        <Container className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-mint-hi">So einfach startest du</span>
            <h2 className="mt-3 font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.05] text-balance">In vier Schritten startklar</h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-4">
            {[
              { n: "01", t: "Demo ansehen", d: "Wir zeigen dir FahrschulApp anhand deines Alltags." },
              { n: "02", t: "Fahrschule einrichten", d: "Zugänge, Fahrlehrer und Fahrzeuge – in Minuten." },
              { n: "03", t: "Daten übernehmen", d: "Bestehende Schüler und Termine ziehen wir mit dir um." },
              { n: "04", t: "Loslegen", d: "Planen, abrechnen, den Kopf frei haben." },
            ].map((s) => (
              <li key={s.n} data-reveal className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm">
                <span className="font-display text-[16px] font-extrabold text-mint-hi">{s.n}</span>
                <h3 className="mt-2 font-display text-[19px] font-bold text-white">{s.t}</h3>
                <p className="mt-1.5 text-[14.5px] text-white/65">{s.d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* INTEGRATIONEN */}
      <section className="border-y border-line bg-paper py-16">
        <Container className="grid items-center gap-8 md:grid-cols-[1fr_1.4fr]">
          <SectionHead eyebrow="Integrationen" title="Passt in deinen bestehenden Fahrschul-Alltag" />
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-reveal>
              {["DATEV", "SEPA", "XRechnung", "TÜV", "DEKRA", "WhatsApp"].map((n) => (
                <div key={n} className="flex items-center justify-center rounded-xl border border-line bg-white px-4 py-4 text-[15px] font-bold text-ink/70">
                  {n}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-muted">Einzelne Schnittstellen sind in Umsetzung bzw. Planung – wir kennzeichnen den Status transparent im Gespräch.</p>
          </div>
        </Container>
      </section>

      {/* SICHERHEIT */}
      <section id="sicherheit" className="py-20 md:py-24">
        <Container className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <SectionHead eyebrow="Sicherheit & Datenschutz" title="Ernst gemeinter Datenschutz – ohne Kompromisse" sub="FahrschulApp ist von Grund auf DSGVO-orientiert gebaut. Jede Fahrschule sieht ausschließlich ihre eigenen Daten." />
            <div className="mt-8">
              <Btn href="/demo" variant="ghost" arrow>
                Fragen zum Datenschutz? Sprich mit uns
              </Btn>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2" data-reveal>
            {[
              { icon: Server, t: "Server in der EU", d: "Verschlüsselte Speicherung, regelmäßige Backups." },
              { icon: Lock, t: "Rollen & Rechte", d: "Chef, Büro und Fahrlehrer sehen genau ihr Nötiges." },
              { icon: Shield, t: "DSGVO-orientiert", d: "Auftragsverarbeitung, sichere Datenübertragung." },
              { icon: Users2, t: "Zugriffskontrolle", d: "Klare Trennung je Fahrschule und Standort." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-line bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-soft text-mint">
                  <c.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-[16.5px] font-bold">{c.t}</h3>
                <p className="mt-1 text-[14px] text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* IMPACT / ZAHLEN */}
      <section className="bg-ink py-16 text-white">
        <Container>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { v: "−30 %", l: "weniger Terminausfälle" },
              { v: "Std.", l: "weniger Nachtelefonieren pro Woche" },
              { v: "1 System", l: "statt Excel, Papier & Telefon" },
              { v: "100 %", l: "Überblick über Termine & Zahlen" },
            ].map((s) => (
              <div key={s.l} data-reveal className="text-center md:text-left">
                <div className="font-display text-[clamp(30px,4vw,44px)] font-extrabold text-mint-accent">{s.v}</div>
                <div className="mt-1 text-[14.5px] text-white/60">{s.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[12.5px] text-white/40 md:text-left">
            Beispielhafte Wirkung – keine veröffentlichten Kundendaten.
          </p>
        </Container>
      </section>

      {/* VERGLEICH */}
      <section className="py-20 md:py-24">
        <Container>
          <SectionHead center eyebrow="Vorher / Nachher" title="Der Unterschied ist spürbar" />
          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2" data-reveal>
            <div className="rounded-2xl border border-line bg-paper p-7">
              <h3 className="text-[17px] font-bold text-muted">Früher</h3>
              <ul className="mt-4 grid gap-2.5">
                {["Excel & Papier", "mehrere Kalender", "Telefon-Pingpong", "manuelle Erinnerungen", "verstreute Informationen", "kein echter Überblick"].map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-[15px] text-ink/70">
                    <X className="h-4 w-4 shrink-0 text-[#D23F3F]" strokeWidth={2.5} /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-mint bg-white p-7 shadow-[0_20px_50px_-24px_rgba(26,127,78,.35)]">
              <h3 className="text-[17px] font-bold text-mint">Mit FahrschulApp</h3>
              <ul className="mt-4 grid gap-2.5">
                {["zentrale Disposition", "digitale Schülerakte", "automatische Erinnerungen", "integrierte Finanzen", "Schülerportal", "Chef-Cockpit & KI-Assistent"].map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-[15px] font-medium text-ink">
                    <Check className="h-4 w-4 shrink-0 text-mint" strokeWidth={3} /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* TESTIMONIALS (Platzhalter) */}
      <section className="border-t border-line bg-paper py-20 md:py-24">
        <Container>
          <SectionHead center eyebrow="Stimmen" title="Was Fahrschulen sagen werden" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <figure key={i} data-reveal className="rounded-2xl border border-dashed border-line2 bg-white p-6">
                <div className="text-mint-accent tracking-[3px]">★★★★★</div>
                <blockquote className="mt-3 text-[16px] leading-relaxed text-ink/70">„[Platzhalter für die Kundenstimme eines Fahrschulinhabers.]"</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-line2 text-[12px] font-bold text-white">—</span>
                  <span className="text-[13px]">
                    <b className="block text-ink">Kundenstimme folgt</b>
                    <span className="text-muted">Fahrschule · Ort</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 text-center text-[12.5px] text-muted">Platzhalter – wird durch echte Kundenstimmen ersetzt.</p>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-24">
        <Container>
          <SectionHead center eyebrow="FAQ" title="Häufige Fragen" />
          <div className="mx-auto mt-10 max-w-3xl">
            {[
              { q: "Was ist FahrschulApp?", a: "Eine All-in-one-Software für Fahrschulen: Disposition, Schülerverwaltung, Finanzen, Theorie & Prüfungen, Schüler-App und Auswertung – an einem Ort." },
              { q: "Für welche Fahrschulen ist die Software geeignet?", a: "Von der Einzelfahrschule bis zu Betrieben mit mehreren Standorten. Rollen für Chef, Büro und Fahrlehrer sind eingebaut." },
              { q: "Kann ich mehrere Standorte verwalten?", a: "Ja. Mehrere Fahrschulen laufen unter einem Dach, mit Auswertungen je Standort und zentralem Überblick." },
              { q: "Wie funktioniert der KI-Assistent?", a: "Du sagst in normaler Sprache, was passieren soll – der Assistent versteht den Kontext und schlägt passende Aktionen vor oder führt sie nach Bestätigung aus." },
              { q: "Was macht der No-Show-Killer?", a: "Er verschickt automatische Terminerinnerungen per WhatsApp, SMS oder E-Mail. Schüler sagen per Link zu oder ab – das senkt Ausfälle." },
              { q: "Können Schüler ihre Termine selbst sehen?", a: "Ja, über die Schüler-App: Termine, Fortschritt, Nachrichten, Zahlungen und Rechnungen – im Design deiner Fahrschule." },
              { q: "Gibt es DATEV, SEPA und XRechnung?", a: "Die Finanzfunktionen sind auf den deutschen Fahrschulalltag ausgelegt. Den genauen Stand einzelner Schnittstellen klären wir transparent im Gespräch." },
              { q: "Wie werden meine Daten geschützt?", a: "DSGVO-orientierte Architektur, Speicherung in der EU, Rollen & Rechte sowie sichere Datenübertragung. Jede Fahrschule sieht nur ihre eigenen Daten." },
              { q: "Kann ich bestehende Daten übernehmen?", a: "Ja, beim Umstieg helfen wir dir persönlich, deine Schüler- und Termindaten zu übernehmen." },
              { q: "Wie bekomme ich eine Demo?", a: "Über das Formular auf der Demo-Seite. Wir melden uns persönlich und stimmen einen Termin mit dir ab." },
            ].map((f) => (
              <details key={f.q} className="group mb-3 overflow-hidden rounded-2xl border border-line bg-white">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-[16.5px] font-semibold marker:content-['']">
                  {f.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line2 text-muted transition-transform group-open:rotate-45">
                    <span className="text-[18px] leading-none">+</span>
                  </span>
                </summary>
                <p className="px-6 pb-6 text-[15.5px] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
