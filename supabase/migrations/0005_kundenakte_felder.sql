-- =====================================================================
-- Kundenakte v2: weitere Stammdaten je Fahrschüler (Bearbeiten-Formular)
-- =====================================================================
-- Ergänzt Felder, die im ausführlichen Bearbeiten-Formular vorkommen.
-- RLS unverändert über die bestehende Policy "fahrschueler_all".

alter table public.fahrschueler
  add column if not exists anrede              text,
  add column if not exists geburtsort          text,
  add column if not exists staatsangehoerigkeit text,
  add column if not exists telefon_beruflich   text,
  add column if not exists schluesselzahl      text,
  add column if not exists erteilungsart       text,
  add column if not exists fuehrerscheinnummer text,
  add column if not exists kurs                text,
  add column if not exists bf17                boolean not null default false,
  add column if not exists zahlungsart         text,
  add column if not exists kostentraeger_email text,
  add column if not exists vorgangsnummer      text,
  add column if not exists pruefort            text,
  add column if not exists sehhilfe            boolean not null default false,
  add column if not exists ausbildung_beendet  boolean not null default false;
