-- =====================================================================
-- Spur – Lern-App für die Führerschein-Theorie
-- Einmal im SQL-Editor eines (am besten eigenen) Supabase-Projekts
-- ausführen. Alle Tabellen beginnen mit lern_, stören also keine
-- anderen Tabellen. Mehrfaches Ausführen ist unschädlich.
-- =====================================================================

-- 1) Profil je Nutzer (öffentlich lesbar für die Rangliste) -------------
create table if not exists public.lern_profil (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  benutzername  text not null unique,
  klasse        text not null default 'B',
  avatar_farbe  text not null default '#F47B45',
  xp            integer not null default 0,
  xp_woche      integer not null default 0,
  woche_start   date not null default (date_trunc('week', now() at time zone 'Europe/Berlin'))::date,
  serie         integer not null default 0,
  beste_serie   integer not null default 0,
  fragen_gesamt integer not null default 0,
  fragen_richtig integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.lern_profil enable row level security;

drop policy if exists "lern_profil_lesen" on public.lern_profil;
create policy "lern_profil_lesen" on public.lern_profil
  for select to authenticated using (true);

drop policy if exists "lern_profil_aendern" on public.lern_profil;
create policy "lern_profil_aendern" on public.lern_profil
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Nur Name, Klasse und Farbe darf man selbst ändern – XP nur per Funktion.
revoke update on public.lern_profil from authenticated;
grant update (name, klasse, avatar_farbe) on public.lern_profil to authenticated;

-- 2) Gesicherter Lernstand (nur für einen selbst) ----------------------
create table if not exists public.lern_sync (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  daten           jsonb not null default '{}'::jsonb,
  aktualisiert_am timestamptz not null default now()
);

alter table public.lern_sync enable row level security;

drop policy if exists "lern_sync_eigen" on public.lern_sync;
create policy "lern_sync_eigen" on public.lern_sync
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Profil bei der Registrierung anlegen --------------------------------
create or replace function public.lern_neuer_nutzer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  basis    text := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'benutzername', ''), split_part(new.email, '@', 1)), '[^a-zA-Z0-9_.]', '', 'g'));
  kandidat text;
begin
  if basis = '' then basis := 'fahrer'; end if;
  kandidat := left(basis, 20);
  while exists (select 1 from public.lern_profil where benutzername = kandidat) loop
    kandidat := left(basis, 15) || floor(random() * 90000 + 10000)::int;
  end loop;

  insert into public.lern_profil (id, name, benutzername, klasse)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), kandidat),
    kandidat,
    coalesce(nullif(new.raw_user_meta_data->>'klasse', ''), 'B')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists lern_neuer_nutzer on auth.users;
create trigger lern_neuer_nutzer
  after insert on auth.users
  for each row execute function public.lern_neuer_nutzer();

-- 4) Ist ein Benutzername noch frei? (auch vor der Anmeldung) ----------
create or replace function public.lern_benutzername_frei(p_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.lern_profil where benutzername = lower(p_name));
$$;
grant execute on function public.lern_benutzername_frei(text) to anon, authenticated;

-- 5) XP gutschreiben – mit Obergrenze je Aufruf gegen Schummeln --------
create or replace function public.lern_xp_buchen(p_xp integer, p_gesamt integer, p_richtig integer, p_serie integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_woche date := (date_trunc('week', now() at time zone 'Europe/Berlin'))::date;
  v_xp    integer := greatest(0, least(coalesce(p_xp, 0), 600));
  v_ges   integer := greatest(0, least(coalesce(p_gesamt, 0), 120));
begin
  update public.lern_profil p set
    xp             = p.xp + v_xp,
    xp_woche       = (case when p.woche_start = v_woche then p.xp_woche else 0 end) + v_xp,
    woche_start    = v_woche,
    fragen_gesamt  = p.fragen_gesamt + v_ges,
    fragen_richtig = p.fragen_richtig + greatest(0, least(coalesce(p_richtig, 0), v_ges)),
    serie          = greatest(0, least(coalesce(p_serie, 0), 3650)),
    beste_serie    = greatest(p.beste_serie, least(coalesce(p_serie, 0), 3650))
  where p.id = auth.uid();
end;
$$;
grant execute on function public.lern_xp_buchen(integer, integer, integer, integer) to authenticated;

-- 6) Rangliste der laufenden Woche --------------------------------------
create or replace function public.lern_rangliste()
returns table(platz bigint, id uuid, name text, benutzername text, avatar_farbe text, klasse text, xp_woche integer)
language sql stable security definer set search_path = public
as $$
  select row_number() over (order by p.xp_woche desc, p.created_at) as platz,
         p.id, p.name, p.benutzername, p.avatar_farbe, p.klasse, p.xp_woche
    from public.lern_profil p
   where p.woche_start = (date_trunc('week', now() at time zone 'Europe/Berlin'))::date
     and p.xp_woche > 0
   order by p.xp_woche desc, p.created_at
   limit 100;
$$;
grant execute on function public.lern_rangliste() to authenticated;

notify pgrst, 'reload schema';
