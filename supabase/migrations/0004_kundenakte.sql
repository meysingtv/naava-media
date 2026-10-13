-- =====================================================================
-- Kundenakte: zusätzliche Stammdaten je Fahrschüler
-- =====================================================================
-- Erweitert die bestehende Tabelle public.fahrschueler um Verwaltungs- und
-- Prüfungsfelder, wie sie in einer vollständigen Kundenakte vorkommen.
-- RLS gilt unverändert über die bestehende Policy "fahrschueler_all".

alter table public.fahrschueler
  add column if not exists kundennummer      bigint,
  add column if not exists kostentraeger     text,
  add column if not exists filiale           text,
  add column if not exists prueforganisation text,
  add column if not exists preisliste        text,
  add column if not exists intensivkurs      boolean not null default false,
  add column if not exists iban              text,
  add column if not exists theorie_versuch   integer not null default 1,
  add column if not exists praxis_versuch    integer not null default 1,
  -- Lernstatus der Theorie-Lern-App (z. B. drive.buzz). Vorerst nur Anzeige,
  -- noch ohne externe Anbindung.
  add column if not exists lernstatus        integer not null default 0;

-- Fortlaufende, gut lesbare Kundennummer (z. B. 1000, 1001, …).
create sequence if not exists public.fahrschueler_kundennummer_seq start 1000;

update public.fahrschueler
  set kundennummer = nextval('public.fahrschueler_kundennummer_seq')
  where kundennummer is null;

alter table public.fahrschueler
  alter column kundennummer set default nextval('public.fahrschueler_kundennummer_seq');
