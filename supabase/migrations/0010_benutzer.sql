-- =====================================================================
-- Benutzer (Team) – erweiterte Stammdaten
-- =====================================================================
-- RLS unverändert über die bestehenden fahrlehrer-Policies.

alter table public.fahrlehrer
  add column if not exists kuerzel        text,
  add column if not exists telefon_privat text,
  add column if not exists strasse        text,
  add column if not exists plz            text,
  add column if not exists ort            text,
  add column if not exists geburtsdatum   date,
  add column if not exists geburtsort     text,
  add column if not exists notiz          text;
