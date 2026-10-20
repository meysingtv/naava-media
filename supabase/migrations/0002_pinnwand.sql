-- =====================================================================
-- Pinnwand: News & To-dos je Fahrschule (für die mobile App)
-- =====================================================================

do $$ begin
  create type public.pinnwand_typ as enum ('news', 'todo');
exception when duplicate_object then null; end $$;

create table if not exists public.pinnwand (
  id            uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschule(id) on delete cascade,
  typ           public.pinnwand_typ not null default 'news',
  titel         text not null,
  inhalt        text,
  erledigt      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists pinnwand_fahrschule_idx on public.pinnwand(fahrschule_id);

alter table public.pinnwand enable row level security;

-- Gleiche Logik wie überall: nur die eigene Fahrschule.
create policy "pinnwand_all" on public.pinnwand
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- Beispiel-Einträge für alle bestehenden Fahrschulen (einmalig, damit
-- die Pinnwand in der App direkt sichtbar ist). Kann gefahrlos bleiben.
insert into public.pinnwand (fahrschule_id, typ, titel, inhalt)
select id, 'news', 'Willkommen in der FahrschulApp 🎉',
       'Hier erscheinen Neuigkeiten und Aufgaben deiner Fahrschule.'
from public.fahrschule;

insert into public.pinnwand (fahrschule_id, typ, titel)
select id, 'todo', 'TÜV-/Prüfungstermine für nächste Woche prüfen'
from public.fahrschule;
