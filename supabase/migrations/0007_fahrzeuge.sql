-- =====================================================================
-- Fahrzeuge: erweitertes Datenmodell (Stammdaten + Termine)
-- =====================================================================
-- RLS unverändert über die bestehende Policy "fahrzeug_all".

alter table public.fahrzeug
  add column if not exists name              text,
  add column if not exists nummer            bigint,
  add column if not exists fahrzeug_id_nr    text,
  add column if not exists getriebeart       text,
  add column if not exists klassen           text[] not null default '{}',
  add column if not exists fahrlehrer_ids    uuid[] not null default '{}',
  add column if not exists anhaenger         boolean not null default false,
  add column if not exists saison_von        date,
  add column if not exists saison_bis        date,
  add column if not exists hauptuntersuchung date;

-- Fortlaufende, lesbare Fahrzeug-Nummer (interne "ID").
create sequence if not exists public.fahrzeug_nummer_seq start 1;
update public.fahrzeug
  set nummer = nextval('public.fahrzeug_nummer_seq')
  where nummer is null;
alter table public.fahrzeug
  alter column nummer set default nextval('public.fahrzeug_nummer_seq');
