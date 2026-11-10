-- =====================================================================
-- Aufgaben (To-dos) je Fahrschule – fürs Dashboard
-- =====================================================================

create table if not exists public.aufgabe (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  titel         text not null,
  status        text not null default 'offen',     -- offen | erledigt
  prioritaet    text not null default 'mittel',     -- niedrig | mittel | hoch
  faellig_am    date,
  schueler_id   uuid references public.fahrschueler(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists aufgabe_fahrschule_idx on public.aufgabe(fahrschule_id);

alter table public.aufgabe enable row level security;

create policy "aufgabe_all" on public.aufgabe
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());
