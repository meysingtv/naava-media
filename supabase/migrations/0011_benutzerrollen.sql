-- =====================================================================
-- Benutzerrollen (eigene Rollen mit Berechtigungen)
-- =====================================================================

create table if not exists public.benutzerrolle (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  name          text not null,
  beschreibung  text,
  zugangsart    text,                          -- z. B. "Fahrlehrer" | "Verwaltung"
  web_zugang    boolean not null default true,
  rechte        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists benutzerrolle_fahrschule_idx on public.benutzerrolle(fahrschule_id);

alter table public.benutzerrolle enable row level security;

create policy "benutzerrolle_all" on public.benutzerrolle
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());
