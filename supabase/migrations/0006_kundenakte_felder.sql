-- =====================================================================
-- Kundenakte v3: restliche Felder aus dem Bearbeiten-Formular
-- =====================================================================

alter table public.fahrschueler
  add column if not exists telefon_privat        text,
  add column if not exists bisherige_klasse      text,
  add column if not exists ausgabedatum          date,
  add column if not exists zweiter_preis         boolean not null default false,
  add column if not exists autom_leistungspakete boolean not null default false;
