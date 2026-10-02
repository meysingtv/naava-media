-- =====================================================================
-- Profi-Ausbau: Prüfungen, Kassenbuch, Kommunikation, Mahnwesen, SEPA,
-- erweiterte Fahrzeug-/Fahrschul-Stammdaten.
-- Eine Migration für den kompletten Ausbau – einmal im Supabase
-- SQL-Editor ausführen. Alles additiv & idempotent (if not exists).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Rechnung: Mahnwesen + Bezahl-Datum
-- ---------------------------------------------------------------------
alter table public.rechnung
  add column if not exists mahnstufe      integer not null default 0,
  add column if not exists letzte_mahnung date,
  add column if not exists bezahlt_am     date;

-- ---------------------------------------------------------------------
-- 2) Fahrschüler: SEPA-Mandat (für Lastschrift-Einzug)
-- ---------------------------------------------------------------------
alter table public.fahrschueler
  add column if not exists sepa_mandat_ref text,
  add column if not exists sepa_mandat_am  date;

-- ---------------------------------------------------------------------
-- 3) Fahrschule: SEPA-Gläubigerdaten (für pain.008-Lastschriftdatei)
-- ---------------------------------------------------------------------
alter table public.fahrschule
  add column if not exists bic          text,
  add column if not exists glaeubiger_id text,   -- SEPA Creditor Identifier
  add column if not exists kontoinhaber  text;

-- ---------------------------------------------------------------------
-- 4) Fahrzeug: HU-Frist, Versicherung, km-Stand, Wartung
-- ---------------------------------------------------------------------
alter table public.fahrzeug
  add column if not exists hu_faellig       date,
  add column if not exists versicherung     text,
  add column if not exists km_stand         integer,
  add column if not exists naechste_wartung date;

-- ---------------------------------------------------------------------
-- 5) Prüfungen (Theorie & Praxis) je Schüler
-- ---------------------------------------------------------------------
create table if not exists public.pruefung (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id   uuid references public.fahrschueler(id) on delete cascade,
  art           text not null default 'theorie',   -- theorie | praxis
  klasse        text,
  datum         date not null,
  uhrzeit       time,
  pruefstelle   text,                                -- tuev | dekra | ...
  ergebnis      text not null default 'offen',       -- offen | bestanden | nicht_bestanden
  versuch       integer not null default 1,
  gebuehr       numeric(10,2),
  notiz         text,
  created_at    timestamptz not null default now()
);
create index if not exists pruefung_fahrschule_idx on public.pruefung(fahrschule_id);
create index if not exists pruefung_schueler_idx on public.pruefung(schueler_id);

alter table public.pruefung enable row level security;
drop policy if exists "pruefung_all" on public.pruefung;
create policy "pruefung_all" on public.pruefung
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- ---------------------------------------------------------------------
-- 6) Kassenbuch (Bareinnahmen/-ausgaben, GoBD-nah)
-- ---------------------------------------------------------------------
create table if not exists public.kassenbuch_eintrag (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  datum         date not null default current_date,
  typ           text not null default 'einnahme',   -- einnahme | ausgabe
  betrag        numeric(10,2) not null default 0,
  kategorie     text,
  beschreibung  text,
  beleg         text,
  created_at    timestamptz not null default now()
);
create index if not exists kassenbuch_fahrschule_idx on public.kassenbuch_eintrag(fahrschule_id);

alter table public.kassenbuch_eintrag enable row level security;
drop policy if exists "kassenbuch_all" on public.kassenbuch_eintrag;
create policy "kassenbuch_all" on public.kassenbuch_eintrag
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- ---------------------------------------------------------------------
-- 7) Kommunikation: Nachrichten-Protokoll
-- ---------------------------------------------------------------------
create table if not exists public.nachricht (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  kanal         text not null default 'email',       -- email | sms | notiz
  betreff       text,
  text          text not null default '',
  empfaenger    text,                                 -- freie Beschreibung (z. B. "12 Schüler")
  anzahl        integer not null default 0,
  status        text not null default 'gesendet',     -- entwurf | gesendet
  created_at    timestamptz not null default now()
);
create index if not exists nachricht_fahrschule_idx on public.nachricht(fahrschule_id);

alter table public.nachricht enable row level security;
drop policy if exists "nachricht_all" on public.nachricht;
create policy "nachricht_all" on public.nachricht
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());
