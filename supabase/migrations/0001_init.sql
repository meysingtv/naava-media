-- =====================================================================
-- FahrschulApp – Initiales Datenbank-Schema mit Row Level Security (RLS)
-- =====================================================================
-- Sicherheits-Grundprinzip: Jede Fahrschule sieht ausschließlich ihre
-- eigenen Daten. Die Zugehörigkeit eines Nutzers (auth.users) zu einer
-- Fahrschule wird über die Tabelle `fahrlehrer` (Spalte user_id) abgebildet.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.fahrlehrer_rolle as enum ('chef', 'fahrlehrer', 'buero');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fahrstunde_typ as enum ('normal', 'autobahn', 'nacht', 'ueberland', 'pruefung');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fahrstunde_status as enum ('geplant', 'abgeschlossen', 'ausgefallen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rechnung_status as enum ('offen', 'bezahlt', 'ueberfaellig');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Fahrschule (ein Datensatz pro Account/Betrieb)
-- ---------------------------------------------------------------------
create table if not exists public.fahrschule (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  strasse       text,
  plz           text,
  ort           text,
  telefon       text,
  email         text,
  website       text,
  logo_url      text,
  iban          text,
  steuernummer  text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Fahrlehrer / Mitarbeiter (verknüpft Nutzer <-> Fahrschule)
-- ---------------------------------------------------------------------
create table if not exists public.fahrlehrer (
  id                    uuid primary key default gen_random_uuid(),
  fahrschule_id         uuid not null references public.fahrschule(id) on delete cascade,
  user_id               uuid unique references auth.users(id) on delete set null,
  vorname               text not null,
  nachname              text not null,
  email                 text,
  telefon               text,
  fuehrerscheinklassen  text[] not null default '{}',
  rolle                 public.fahrlehrer_rolle not null default 'fahrlehrer',
  aktiv                 boolean not null default true,
  created_at            timestamptz not null default now()
);
create index if not exists fahrlehrer_fahrschule_idx on public.fahrlehrer(fahrschule_id);
create index if not exists fahrlehrer_user_idx on public.fahrlehrer(user_id);

-- ---------------------------------------------------------------------
-- Fahrschüler
-- ---------------------------------------------------------------------
create table if not exists public.fahrschueler (
  id                    uuid primary key default gen_random_uuid(),
  fahrschule_id         uuid not null references public.fahrschule(id) on delete cascade,
  vorname               text not null,
  nachname              text not null,
  geburtsdatum          date,
  strasse               text,
  plz                   text,
  ort                   text,
  telefon               text,
  email                 text,
  fuehrerscheinklassen  text[] not null default '{}',
  anmeldedatum          date not null default current_date,
  theorie_bestanden     boolean not null default false,
  theorie_termin        date,
  pruefung_termin       date,
  notizen               text,
  avatar_farbe          text not null default '#2563EB',
  created_at            timestamptz not null default now()
);
create index if not exists fahrschueler_fahrschule_idx on public.fahrschueler(fahrschule_id);

-- ---------------------------------------------------------------------
-- Fortschritt je Führerscheinklasse
-- ---------------------------------------------------------------------
create table if not exists public.schueler_fortschritt (
  id                    uuid primary key default gen_random_uuid(),
  schueler_id           uuid not null references public.fahrschueler(id) on delete cascade,
  klasse                text not null,
  fahrstunden_gesamt    integer not null default 0,
  fahrstunden_bezahlt   integer not null default 0,
  normalfahrten         integer not null default 0,
  autobahnfahrten       integer not null default 0,
  nachtfahrten          integer not null default 0,
  ueberlandfahrten      integer not null default 0,
  pruefungsreif         boolean not null default false,
  unique (schueler_id, klasse)
);
create index if not exists fortschritt_schueler_idx on public.schueler_fortschritt(schueler_id);

-- ---------------------------------------------------------------------
-- Fahrzeuge
-- ---------------------------------------------------------------------
create table if not exists public.fahrzeug (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  kennzeichen   text not null,
  marke         text,
  modell        text,
  klasse        text,
  aktiv         boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists fahrzeug_fahrschule_idx on public.fahrzeug(fahrschule_id);

-- ---------------------------------------------------------------------
-- Fahrstunden
-- ---------------------------------------------------------------------
create table if not exists public.fahrstunde (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id   uuid references public.fahrschueler(id) on delete set null,
  fahrlehrer_id uuid references public.fahrlehrer(id) on delete set null,
  fahrzeug_id   uuid references public.fahrzeug(id) on delete set null,
  datum         date not null,
  uhrzeit       time not null,
  dauer_minuten integer not null default 45,
  typ           public.fahrstunde_typ not null default 'normal',
  status        public.fahrstunde_status not null default 'geplant',
  notiz         text,
  created_at    timestamptz not null default now()
);
create index if not exists fahrstunde_fahrschule_idx on public.fahrstunde(fahrschule_id);
create index if not exists fahrstunde_datum_idx on public.fahrstunde(datum);
create index if not exists fahrstunde_fahrlehrer_idx on public.fahrstunde(fahrlehrer_id);

-- ---------------------------------------------------------------------
-- Rechnungen
-- ---------------------------------------------------------------------
create table if not exists public.rechnung (
  id                uuid primary key default gen_random_uuid(),
  fahrschule_id     uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id       uuid references public.fahrschueler(id) on delete set null,
  nummer            text not null,
  betrag_netto      numeric(10,2) not null default 0,
  steuersatz        integer not null default 19,
  betrag_brutto     numeric(10,2) not null default 0,
  status            public.rechnung_status not null default 'offen',
  rechnungsdatum    date not null default current_date,
  faelligkeitsdatum date,
  notiz             text,
  created_at        timestamptz not null default now()
);
create index if not exists rechnung_fahrschule_idx on public.rechnung(fahrschule_id);

create table if not exists public.rechnung_position (
  id            uuid primary key default gen_random_uuid(),
  rechnung_id   uuid not null references public.rechnung(id) on delete cascade,
  beschreibung  text not null,
  menge         numeric(10,2) not null default 1,
  einheit       text default 'Stk',
  einzelpreis   numeric(10,2) not null default 0
);
create index if not exists rechnung_position_rechnung_idx on public.rechnung_position(rechnung_id);

-- ---------------------------------------------------------------------
-- Theoriestunden + Teilnahme
-- ---------------------------------------------------------------------
create table if not exists public.theoriestunde (
  id              uuid primary key default gen_random_uuid(),
  fahrschule_id   uuid not null references public.fahrschule(id) on delete cascade,
  datum           date not null,
  uhrzeit         time not null,
  thema           text,
  max_teilnehmer  integer default 20,
  created_at      timestamptz not null default now()
);
create index if not exists theoriestunde_fahrschule_idx on public.theoriestunde(fahrschule_id);

create table if not exists public.theorie_teilnahme (
  id                uuid primary key default gen_random_uuid(),
  theoriestunde_id  uuid not null references public.theoriestunde(id) on delete cascade,
  schueler_id       uuid not null references public.fahrschueler(id) on delete cascade,
  anwesend          boolean not null default false,
  unique (theoriestunde_id, schueler_id)
);

-- =====================================================================
-- Hilfsfunktionen (SECURITY DEFINER, um Rekursion in RLS zu vermeiden)
-- =====================================================================

-- Liefert die Fahrschul-ID des aktuell angemeldeten Nutzers.
create or replace function public.current_fahrschule_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select fahrschule_id
  from public.fahrlehrer
  where user_id = auth.uid()
  limit 1;
$$;

-- Liefert die Rolle des aktuell angemeldeten Nutzers.
create or replace function public.current_rolle()
returns public.fahrlehrer_rolle
language sql
stable
security definer
set search_path = public
as $$
  select rolle
  from public.fahrlehrer
  where user_id = auth.uid()
  limit 1;
$$;

-- Onboarding: legt Fahrschule + zugehörigen Chef-Datensatz atomar an.
create or replace function public.setup_fahrschule(
  p_name      text,
  p_vorname   text,
  p_nachname  text,
  p_strasse   text default null,
  p_plz       text default null,
  p_ort       text default null,
  p_telefon   text default null,
  p_email     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_fahrschule_id uuid;
begin
  if v_uid is null then
    raise exception 'Nicht authentifiziert';
  end if;

  if exists (select 1 from public.fahrlehrer where user_id = v_uid) then
    raise exception 'Dieser Nutzer gehört bereits zu einer Fahrschule';
  end if;

  insert into public.fahrschule (name, strasse, plz, ort, telefon, email)
  values (p_name, p_strasse, p_plz, p_ort, p_telefon, p_email)
  returning id into v_fahrschule_id;

  insert into public.fahrlehrer (fahrschule_id, user_id, vorname, nachname, email, rolle, aktiv)
  values (
    v_fahrschule_id,
    v_uid,
    p_vorname,
    p_nachname,
    coalesce(p_email, (select email from auth.users where id = v_uid)),
    'chef',
    true
  );

  return v_fahrschule_id;
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.fahrschule          enable row level security;
alter table public.fahrlehrer           enable row level security;
alter table public.fahrschueler         enable row level security;
alter table public.schueler_fortschritt enable row level security;
alter table public.fahrzeug             enable row level security;
alter table public.fahrstunde           enable row level security;
alter table public.rechnung             enable row level security;
alter table public.rechnung_position    enable row level security;
alter table public.theoriestunde        enable row level security;
alter table public.theorie_teilnahme    enable row level security;

-- ---- Fahrschule ----------------------------------------------------
-- Lesen/Ändern nur der eigenen Fahrschule. Das INSERT erfolgt
-- ausschließlich über setup_fahrschule() (SECURITY DEFINER).
create policy "fahrschule_select" on public.fahrschule
  for select to authenticated
  using (id = public.current_fahrschule_id());

create policy "fahrschule_update" on public.fahrschule
  for update to authenticated
  using (id = public.current_fahrschule_id())
  with check (id = public.current_fahrschule_id());

-- ---- Fahrlehrer ----------------------------------------------------
-- Alle im Betrieb dürfen das Team sehen; nur der Chef darf ändern.
create policy "fahrlehrer_select" on public.fahrlehrer
  for select to authenticated
  using (fahrschule_id = public.current_fahrschule_id());

create policy "fahrlehrer_modify" on public.fahrlehrer
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id() and public.current_rolle() = 'chef')
  with check (fahrschule_id = public.current_fahrschule_id() and public.current_rolle() = 'chef');

-- ---- Fahrschüler ---------------------------------------------------
create policy "fahrschueler_all" on public.fahrschueler
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- ---- Schüler-Fortschritt (über Eltern-Datensatz abgesichert) -------
create policy "fortschritt_all" on public.schueler_fortschritt
  for all to authenticated
  using (exists (
    select 1 from public.fahrschueler s
    where s.id = schueler_id and s.fahrschule_id = public.current_fahrschule_id()
  ))
  with check (exists (
    select 1 from public.fahrschueler s
    where s.id = schueler_id and s.fahrschule_id = public.current_fahrschule_id()
  ));

-- ---- Fahrzeuge -----------------------------------------------------
create policy "fahrzeug_all" on public.fahrzeug
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- ---- Fahrstunden ---------------------------------------------------
create policy "fahrstunde_all" on public.fahrstunde
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- ---- Rechnungen ----------------------------------------------------
create policy "rechnung_all" on public.rechnung
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

create policy "rechnung_position_all" on public.rechnung_position
  for all to authenticated
  using (exists (
    select 1 from public.rechnung r
    where r.id = rechnung_id and r.fahrschule_id = public.current_fahrschule_id()
  ))
  with check (exists (
    select 1 from public.rechnung r
    where r.id = rechnung_id and r.fahrschule_id = public.current_fahrschule_id()
  ));

-- ---- Theorie -------------------------------------------------------
create policy "theoriestunde_all" on public.theoriestunde
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

create policy "theorie_teilnahme_all" on public.theorie_teilnahme
  for all to authenticated
  using (exists (
    select 1 from public.theoriestunde t
    where t.id = theoriestunde_id and t.fahrschule_id = public.current_fahrschule_id()
  ))
  with check (exists (
    select 1 from public.theoriestunde t
    where t.id = theoriestunde_id and t.fahrschule_id = public.current_fahrschule_id()
  ));

-- =====================================================================
-- Rechte
-- =====================================================================
grant execute on function public.current_fahrschule_id() to authenticated;
grant execute on function public.current_rolle() to authenticated;
grant execute on function public.setup_fahrschule(text, text, text, text, text, text, text, text) to authenticated;
