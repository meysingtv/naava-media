-- =====================================================================
-- Preisliste/Leistungskatalog, Unterlagen-Checkliste, Ausbildungsvertrag
-- Additiv & idempotent. Einmal im Supabase SQL-Editor ausführen.
-- =====================================================================

-- 1) Leistungskatalog / Preisliste
create table if not exists public.leistung (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  name          text not null,
  kategorie     text,                 -- Fahrstunde | Gebühr | Material | ...
  preis         numeric(10,2) not null default 0,
  einheit       text not null default 'Stk',
  klasse        text,
  aktiv         boolean not null default true,
  sortierung    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists leistung_fahrschule_idx on public.leistung(fahrschule_id);

alter table public.leistung enable row level security;
drop policy if exists "leistung_all" on public.leistung;
create policy "leistung_all" on public.leistung
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- 2) Unterlagen-Checkliste + Ausbildungsvertrag je Schüler
alter table public.fahrschueler
  add column if not exists sehtest_am         date,
  add column if not exists passbild_ok        boolean not null default false,
  add column if not exists erste_hilfe_am     date,
  add column if not exists antrag_gestellt_am date,
  add column if not exists ausweis_ok         boolean not null default false,
  add column if not exists vertrag_unterschrift text,
  add column if not exists vertrag_am         date;
