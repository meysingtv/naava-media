-- =====================================================================
-- Digitale Unterschrift je Fahrstunde (Ausbildungsnachweis)
-- =====================================================================
-- Speichert die Unterschrift als SVG-Pfaddaten (Text). RLS gilt bereits
-- über die bestehende Policy auf public.fahrstunde.

alter table public.fahrstunde
  add column if not exists unterschrift text;
