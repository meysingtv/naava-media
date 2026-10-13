-- =====================================================================
-- Verwaltungs-Ausbau: Kurse, Lohn, Dokumente, Zahlungen, Ratenzahlung.
-- Additiv & idempotent. Einmal im Supabase SQL-Editor ausführen.
-- =====================================================================

-- 1) Kurse (Theoriekurse als Gruppe) -----------------------------------
create table if not exists public.kurs (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  name          text not null,
  klasse        text,
  beschreibung  text,
  start_datum   date,
  status        text not null default 'geplant',   -- geplant | laufend | beendet
  created_at    timestamptz not null default now()
);
create index if not exists kurs_fs_idx on public.kurs(fahrschule_id);
alter table public.kurs enable row level security;
drop policy if exists "kurs_all" on public.kurs;
create policy "kurs_all" on public.kurs for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

create table if not exists public.kurs_teilnahme (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  kurs_id       uuid not null references public.kurs(id) on delete cascade,
  schueler_id   uuid not null references public.fahrschueler(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique(kurs_id, schueler_id)
);
create index if not exists kurs_teilnahme_kurs_idx on public.kurs_teilnahme(kurs_id);
alter table public.kurs_teilnahme enable row level security;
drop policy if exists "kurs_teilnahme_all" on public.kurs_teilnahme;
create policy "kurs_teilnahme_all" on public.kurs_teilnahme for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- Theoriestunde optional einem Kurs zuordnen
alter table public.theoriestunde
  add column if not exists kurs_id uuid references public.kurs(id) on delete set null;

-- 2) Lohn: Sätze je Fahrlehrer ----------------------------------------
alter table public.fahrlehrer
  add column if not exists stundenlohn         numeric(10,2),
  add column if not exists lohn_pro_fahrstunde numeric(10,2);

-- 3) Dokumente je Schüler (klein, als Data-URL) ------------------------
create table if not exists public.dokument (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id   uuid references public.fahrschueler(id) on delete cascade,
  name          text not null,
  kategorie     text,
  mime          text,
  groesse       integer,
  datei         text not null,
  created_at    timestamptz not null default now()
);
create index if not exists dokument_schueler_idx on public.dokument(schueler_id);
alter table public.dokument enable row level security;
drop policy if exists "dokument_all" on public.dokument;
create policy "dokument_all" on public.dokument for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- 4) Zahlungen (Zahlungseingänge) -------------------------------------
create table if not exists public.zahlung (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id   uuid references public.fahrschueler(id) on delete set null,
  rechnung_id   uuid references public.rechnung(id) on delete set null,
  betrag        numeric(10,2) not null default 0,
  datum         date not null default current_date,
  art           text not null default 'ueberweisung',  -- bar | ueberweisung | lastschrift | karte
  notiz         text,
  created_at    timestamptz not null default now()
);
create index if not exists zahlung_fs_idx on public.zahlung(fahrschule_id);
alter table public.zahlung enable row level security;
drop policy if exists "zahlung_all" on public.zahlung;
create policy "zahlung_all" on public.zahlung for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- 5) Raten / Zahlplan je Schüler --------------------------------------
create table if not exists public.rate (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id   uuid not null references public.fahrschueler(id) on delete cascade,
  betrag        numeric(10,2) not null default 0,
  faellig_am    date,
  bezahlt       boolean not null default false,
  notiz         text,
  created_at    timestamptz not null default now()
);
create index if not exists rate_schueler_idx on public.rate(schueler_id);
alter table public.rate enable row level security;
drop policy if exists "rate_all" on public.rate;
create policy "rate_all" on public.rate for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());
