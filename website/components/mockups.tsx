import { Calendar, Car, CheckCircle2, Clock, Sparkles, Wrench } from "lucide-react";

import { cn } from "@/components/ui";

/* Browser-Rahmen um eine App-Ansicht */
export function BrowserFrame({ url, children, className }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-white shadow-[0_30px_70px_-30px_rgba(15,45,30,.32)]", className)}>
      <div className="flex h-9 items-center gap-1.5 border-b border-line bg-paper px-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="ml-3 flex h-5 flex-1 items-center rounded-md border border-line bg-white px-2.5 text-[11px] text-muted">{url}</span>
      </div>
      {children}
    </div>
  );
}

function Bar({ w, color = "bg-mint" }: { w: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-paper">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(w, 100)}%` }} />
    </div>
  );
}

/* Dashboard / Leitstand (Hero) */
export function DashboardMock() {
  const termine = [
    { t: "08:00", n: "Lisa Schneider", m: "Übungsstunde · Anna", c: "bg-mint-accent" },
    { t: "09:00", n: "Jonas Müller", m: "Überlandfahrt · Marco", c: "bg-[#16A34A]" },
    { t: "13:00", n: "Max Weber", m: "Autobahnfahrt · Anna", c: "bg-[#2563EB]" },
  ];
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-3 bg-paper p-4">
      <div className="rounded-xl border border-line bg-white">
        <div className="border-b border-line px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted">Heute · 8 Termine</div>
        {termine.map((x, i) => (
          <div key={i} className={cn("flex gap-3 px-3.5 py-2.5", i > 0 && "border-t border-line")}>
            <div className="w-10 shrink-0 text-[12px] font-bold tnum">{x.t}</div>
            <div className={cn("w-[3px] shrink-0 rounded", x.c)} />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold">{x.n}</div>
              <div className="text-[11px] text-muted">{x.m}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3">
        {[
          { l: "Auslastung Woche", v: "60 %", c: "text-mint", w: 60, bc: "bg-mint" },
          { l: "No-Show 30 Tage", v: "8 %", c: "text-[#C27C0E]", w: 8, bc: "bg-[#C27C0E]" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-line bg-white p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{k.l}</div>
            <div className={cn("font-sans text-[22px] font-bold leading-tight", k.c)}>{k.v}</div>
            <div className="mt-1.5">
              <Bar w={k.w} color={k.bc} />
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Offene Posten</div>
          <div className="font-sans text-[22px] font-bold leading-tight text-[#D23F3F]">5.550 €</div>
          <div className="text-[11px] text-muted">davon 4.200 € überfällig</div>
        </div>
      </div>
    </div>
  );
}

/* Disposition – Board */
export function DispoMock() {
  const lanes = [
    { who: "Anna", av: "bg-mint", blk: [{ l: 2, w: 12, c: "border-mint-accent bg-mint-accent/15", n: "Lisa · Übung" }, { l: 44, w: 22, c: "border-[#2563EB] bg-[#2563EB]/12", n: "Max · Autobahn" }] },
    { who: "Marco", av: "bg-[#2563EB]", blk: [{ l: 16, w: 22, c: "border-[#16A34A] bg-[#16A34A]/13", n: "Jonas · Überland" }, { l: 72, w: 12, c: "border-mint-accent bg-mint-accent/15", n: "Sarah" }] },
    { who: "Thomas", av: "bg-[#D97706]", blk: [{ l: 6, w: 12, c: "border-mint-accent bg-mint-accent/15", n: "Ben" }, { l: 52, w: 12, c: "border-[#4F46E5] bg-[#4F46E5]/12", n: "Jan · Nacht" }] },
  ];
  return (
    <div className="bg-white p-4">
      <div className="ml-[62px] flex border-b border-line text-[10px] text-muted">
        {["8", "10", "12", "14", "16", "18"].map((h) => (
          <span key={h} className="flex-1 border-l border-line py-1.5 pl-1">{h}:00</span>
        ))}
      </div>
      {lanes.map((L) => (
        <div key={L.who} className="flex min-h-[46px] border-b border-line last:border-0">
          <div className="flex w-[62px] shrink-0 items-center gap-1.5 border-r border-line py-2 pr-1.5">
            <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white", L.av)}>{L.who[0]}</span>
            <span className="text-[11px] font-semibold">{L.who}</span>
          </div>
          <div
            className="relative flex-1"
            style={{ backgroundImage: "repeating-linear-gradient(to right, transparent, transparent calc(16.66% - 1px), #E1DACD 16.66%)" }}
          >
            {L.blk.map((b, i) => (
              <div key={i} className={cn("absolute bottom-1.5 top-1.5 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[9.5px] font-semibold text-ink", b.c)} style={{ left: `${b.l}%`, width: `${b.w}%` }}>
                {b.n}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Chef-Cockpit */
export function CockpitMock() {
  const lehrer = [
    { n: "Anna", h: "32,0 h", q: 80 },
    { n: "Marco", h: "28,0 h", q: 70 },
    { n: "Thomas", h: "21,0 h", q: 53, warn: true },
  ];
  const aging = [
    { l: "Nicht fällig", v: "1.350 €", w: 32, c: "bg-line2" },
    { l: "1–30 Tage", v: "1.950 €", w: 100, c: "bg-[#C27C0E]" },
    { l: "über 60 Tage", v: "1.150 €", w: 59, c: "bg-[#D23F3F]" },
  ];
  return (
    <div className="grid gap-3 bg-paper p-4 sm:grid-cols-2">
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        {[
          { l: "Auslastung", v: "60 %", c: "text-mint" },
          { l: "No-Show", v: "8 %", c: "text-[#C27C0E]" },
          { l: "Fahrstunden Woche", v: "96", c: "text-ink" },
          { l: "Offene Posten", v: "5.550 €", c: "text-[#D23F3F]" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-line bg-white p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{k.l}</div>
            <div className={cn("font-sans text-[20px] font-bold", k.c)}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-white p-3.5">
        <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted">Auslastung Fahrlehrer</div>
        <div className="grid gap-2.5">
          {lehrer.map((l) => (
            <div key={l.n}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="font-medium">{l.n}</span>
                <span className="text-muted tnum">{l.h} · <b className="text-ink">{l.q}%</b></span>
              </div>
              <Bar w={l.q} color={l.warn ? "bg-[#C27C0E]" : "bg-mint"} />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-white p-3.5">
        <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-muted">Offene Posten nach Alter</div>
        <div className="grid gap-2.5">
          {aging.map((a) => (
            <div key={a.l}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-muted">{a.l}</span>
                <b>{a.v}</b>
              </div>
              <Bar w={a.w} color={a.c} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Schülerakte */
export function SchuelerakteMock() {
  const steps = [
    { l: "Theorie", w: 100, done: true },
    { l: "Überland", w: 80 },
    { l: "Autobahn", w: 50 },
    { l: "Nacht", w: 66 },
  ];
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-mint text-[14px] font-bold text-white">LS</span>
        <div>
          <div className="text-[15px] font-bold">Lisa Schneider</div>
          <div className="text-[12px] text-muted">Klasse B · seit März in Ausbildung</div>
        </div>
        <span className="ml-auto rounded-md bg-mint-soft px-2 py-1 text-[11px] font-bold text-mint">78 % · fast prüfungsreif</span>
      </div>
      <div className="mt-3 grid gap-2.5">
        {steps.map((s) => (
          <div key={s.l} className="flex items-center gap-3">
            <span className="w-16 text-[12px] text-muted">{s.l}</span>
            <div className="flex-1">
              <Bar w={s.w} color={s.done ? "bg-[#16A34A]" : "bg-mint"} />
            </div>
            <span className="w-9 text-right text-[11px] font-bold tnum">{s.w}%</span>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { l: "Fahrstunden", v: "26" },
          { l: "Offen", v: "0 €", c: "text-[#16A34A]" },
          { l: "Unterlagen", v: "vollständig" },
        ].map((x) => (
          <div key={x.l} className="rounded-lg border border-line bg-paper p-2">
            <div className={cn("text-[13px] font-bold", x.c)}>{x.v}</div>
            <div className="text-[10px] text-muted">{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Finanzen */
export function FinanzenMock() {
  const rows = [
    { nr: "RE-0142", n: "Jonas Müller", b: "180 €", s: "offen", c: "bg-[#C27C0E]/12 text-[#C27C0E]" },
    { nr: "RE-0139", n: "Max Weber", b: "320 €", s: "überfällig", c: "bg-[#D23F3F]/12 text-[#D23F3F]" },
    { nr: "RE-0137", n: "Sarah Klein", b: "250 €", s: "Ratenplan", c: "bg-mint-soft text-mint" },
    { nr: "RE-0119", n: "Lisa Schneider", b: "480 €", s: "bezahlt", c: "bg-[#16A34A]/12 text-[#16A34A]" },
  ];
  return (
    <div className="bg-white p-4">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Rechnungen</div>
      <div className="overflow-hidden rounded-xl border border-line">
        {rows.map((r, i) => (
          <div key={r.nr} className={cn("flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]", i > 0 && "border-t border-line")}>
            <span className="w-16 text-muted tnum">{r.nr}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.n}</span>
            <span className="font-bold tnum">{r.b}</span>
            <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", r.c)}>{r.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* KI-Assistent Chat */
export function ChatMock() {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2 border-b border-line pb-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-mint-soft text-mint">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-[13px] font-bold">Assistent</span>
        <span className="text-[11px] text-muted">KI · Beta</span>
      </div>
      <div className="mt-3 space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl bg-mint px-3 py-2 text-[12.5px] text-white">
            Plane Jonas nächste Woche zwei Fahrstunden ein, möglichst nach 17 Uhr.
          </div>
        </div>
        <div className="flex gap-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-mint-soft text-mint">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="max-w-[92%] whitespace-pre-line rounded-2xl bg-paper px-3 py-2 text-[12.5px]">
              Zwei passende Termine gefunden:{"\n"}– Di 17:30 Uhr bei Lisa (B-FS 1234){"\n"}– Do 18:15 Uhr bei Marco (B-FS 5678){"\n"}Beide Fahrzeuge sind frei.
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-mint-soft px-1.5 py-0.5 text-[10.5px] font-bold text-mint">
                <Wrench className="h-3 w-3" /> Freie Termine geprüft
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-mint-soft px-1.5 py-0.5 text-[10.5px] font-bold text-mint">
                <CheckCircle2 className="h-3 w-3" /> 2 Termine angelegt
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Schüler-App im Handy-Rahmen */
export function PhoneMock() {
  return (
    <div className="mx-auto w-[240px] rounded-[36px] bg-ink p-2.5 shadow-[0_30px_70px_-30px_rgba(15,45,30,.4)]">
      <div className="overflow-hidden rounded-[28px] border border-ink bg-paper">
        <div className="bg-white px-4 pb-3 pt-4">
          <div className="text-[11px] text-muted">Fahrschule Weber</div>
          <div className="mt-0.5 flex items-center gap-1.5 font-sans text-[16px] font-bold">Hallo, Lisa <Calendar className="h-4 w-4 text-mint" /></div>
        </div>
        <div className="space-y-2.5 p-3">
          <div className="rounded-xl border border-line bg-white p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Nächster Termin</div>
            <div className="mt-1 flex items-center gap-1.5 text-[14px] font-bold">
              <Clock className="h-4 w-4 text-mint" /> Do · 09:00 Uhr
            </div>
            <div className="text-[11.5px] text-muted">Übungsstunde · Anna</div>
          </div>
          <div className="rounded-xl border border-line bg-white p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Fortschritt</div>
            <div className="mt-2">
              <Bar w={78} />
            </div>
            <div className="mt-1.5 text-[11.5px] text-muted">78 % · bald prüfungsreif</div>
          </div>
          <div className="rounded-xl border border-mint-hi bg-mint-soft p-3">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-mint">
              <Car className="h-4 w-4" /> Termin bestätigen
            </div>
            <div className="mt-0.5 text-[11.5px] text-mint-dark">Do 09:00 · tippen zum Zusagen ›</div>
          </div>
        </div>
      </div>
    </div>
  );
}
