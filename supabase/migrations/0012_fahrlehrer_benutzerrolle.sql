-- =====================================================================
-- Benutzer (Fahrlehrer) mit einer eigenen Rolle (benutzerrolle) verknüpfen
-- =====================================================================

alter table public.fahrlehrer
  add column if not exists benutzerrolle_id uuid references public.benutzerrolle(id) on delete set null;

create index if not exists fahrlehrer_benutzerrolle_idx on public.fahrlehrer(benutzerrolle_id);
