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
-- (Rangliste siehe Abschnitt 7 – mit Bundesland-Filter)

-- 7) Bundesland und Duell-Elo -------------------------------------------
alter table public.lern_profil
  add column if not exists bundesland text,
  add column if not exists elo integer not null default 1000;
grant update (name, klasse, avatar_farbe, bundesland) on public.lern_profil to authenticated;

-- Bundesland aus der Registrierung übernehmen.
create or replace function public.lern_bundesland_setzen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.lern_profil
     set bundesland = nullif(new.raw_user_meta_data->>'bundesland', '')
   where id = new.id and bundesland is null;
  return new;
end;
$$;
drop trigger if exists lern_zz_bundesland on auth.users;
create trigger lern_zz_bundesland
  after insert on auth.users
  for each row execute function public.lern_bundesland_setzen();

drop function if exists public.lern_rangliste();
create or replace function public.lern_rangliste(p_bundesland text default null)
returns table(platz bigint, id uuid, name text, benutzername text, avatar_farbe text, klasse text, bundesland text, xp_woche integer)
language sql stable security definer set search_path = public
as $$
  select row_number() over (order by p.xp_woche desc, p.created_at) as platz,
         p.id, p.name, p.benutzername, p.avatar_farbe, p.klasse, p.bundesland, p.xp_woche
    from public.lern_profil p
   where p.woche_start = (date_trunc('week', now() at time zone 'Europe/Berlin'))::date
     and p.xp_woche > 0
     and (p_bundesland is null or p.bundesland = p_bundesland)
   order by p.xp_woche desc, p.created_at
   limit 100;
$$;
grant execute on function public.lern_rangliste(text) to authenticated;

-- 8) Duelle: Rangliste (zufälliger Gegner) und Freunde (Code) -----------
-- Asynchron: Wer ein Duell eröffnet, spielt zuerst; der Gegner spielt
-- dieselben Fragen später. Erst wenn beide fertig sind, steht der Sieger fest.
create table if not exists public.lern_duell (
  id            uuid primary key default gen_random_uuid(),
  art           text not null check (art in ('rangliste', 'freund')),
  code          text unique,
  fragen        text[] not null,
  spieler1      uuid not null references public.lern_profil(id) on delete cascade,
  spieler2      uuid references public.lern_profil(id) on delete cascade,
  punkte1       integer,
  zeit1         integer,
  punkte2       integer,
  zeit2         integer,
  status        text not null default 'wartet' check (status in ('wartet', 'laeuft', 'fertig')),
  sieger        uuid,
  elo_aenderung integer,
  erstellt_am   timestamptz not null default now(),
  fertig_am     timestamptz
);
create index if not exists lern_duell_s1_idx on public.lern_duell(spieler1, erstellt_am desc);
create index if not exists lern_duell_s2_idx on public.lern_duell(spieler2, erstellt_am desc);
create index if not exists lern_duell_suche_idx on public.lern_duell(art, status, erstellt_am);

alter table public.lern_duell enable row level security;
drop policy if exists "lern_duell_lesen" on public.lern_duell;
create policy "lern_duell_lesen" on public.lern_duell
  for select to authenticated using (spieler1 = auth.uid() or spieler2 = auth.uid());
-- Schreiben nur über die Funktionen unten.

-- Rangliste-Duell: offenes Duell eines anderen (ähnliche Elo) übernehmen oder neues eröffnen.
create or replace function public.lern_duell_rangliste(p_fragen text[])
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_elo integer;
  v_duell public.lern_duell;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select elo into v_elo from public.lern_profil where id = v_ich;

  select d.* into v_duell
    from public.lern_duell d
    join public.lern_profil p on p.id = d.spieler1
   where d.art = 'rangliste' and d.status = 'wartet' and d.spieler2 is null
     and d.spieler1 <> v_ich and d.punkte1 is not null
     and d.erstellt_am > now() - interval '3 days'
   order by abs(p.elo - coalesce(v_elo, 1000)), d.erstellt_am
   limit 1
   for update of d skip locked;

  if found then
    update public.lern_duell set spieler2 = v_ich, status = 'laeuft' where id = v_duell.id returning * into v_duell;
    return v_duell;
  end if;

  insert into public.lern_duell (art, fragen, spieler1) values ('rangliste', p_fragen[1:10], v_ich) returning * into v_duell;
  return v_duell;
end;
$$;
grant execute on function public.lern_duell_rangliste(text[]) to authenticated;

-- Freundes-Duell mit kurzem Code eröffnen.
create or replace function public.lern_duell_freund(p_fragen text[])
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_code text;
  v_duell public.lern_duell;
  v_zeichen text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_zeichen, 1 + floor(random() * length(v_zeichen))::int, 1);
    end loop;
    exit when not exists (select 1 from public.lern_duell where code = v_code);
  end loop;
  insert into public.lern_duell (art, code, fragen, spieler1) values ('freund', v_code, p_fragen[1:10], v_ich) returning * into v_duell;
  return v_duell;
end;
$$;
grant execute on function public.lern_duell_freund(text[]) to authenticated;

-- Einem Freundes-Duell per Code beitreten.
create or replace function public.lern_duell_beitreten(p_code text)
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_duell public.lern_duell;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  update public.lern_duell
     set spieler2 = v_ich, status = 'laeuft'
   where code = upper(trim(p_code)) and art = 'freund' and spieler2 is null and spieler1 <> v_ich
  returning * into v_duell;
  if v_duell.id is null then raise exception 'Code ungültig oder schon vergeben'; end if;
  return v_duell;
end;
$$;
grant execute on function public.lern_duell_beitreten(text) to authenticated;

-- Eigenes Ergebnis melden; sind beide fertig, Sieger und Elo berechnen.
create or replace function public.lern_duell_ergebnis(p_id uuid, p_punkte integer, p_zeit integer)
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_duell public.lern_duell;
  v_punkte integer;
  v_zeit integer := greatest(0, least(coalesce(p_zeit, 0), 3600));
  v_sieger uuid;
  v_elo1 integer;
  v_elo2 integer;
  v_erwartet double precision;
  v_wert double precision;
  v_aenderung integer := null;
begin
  select * into v_duell from public.lern_duell where id = p_id for update;
  if v_duell.id is null or (v_duell.spieler1 <> v_ich and v_duell.spieler2 is distinct from v_ich) then
    raise exception 'Duell nicht gefunden';
  end if;
  v_punkte := greatest(0, least(coalesce(p_punkte, 0), coalesce(array_length(v_duell.fragen, 1), 10)));

  if v_duell.spieler1 = v_ich and v_duell.punkte1 is null then
    update public.lern_duell set punkte1 = v_punkte, zeit1 = v_zeit where id = p_id returning * into v_duell;
  elsif v_duell.spieler2 = v_ich and v_duell.punkte2 is null then
    update public.lern_duell set punkte2 = v_punkte, zeit2 = v_zeit where id = p_id returning * into v_duell;
  end if;

  if v_duell.punkte1 is not null and v_duell.punkte2 is not null and v_duell.status <> 'fertig' then
    v_sieger := case
      when v_duell.punkte1 > v_duell.punkte2 then v_duell.spieler1
      when v_duell.punkte2 > v_duell.punkte1 then v_duell.spieler2
      when v_duell.zeit1 < v_duell.zeit2 then v_duell.spieler1
      when v_duell.zeit2 < v_duell.zeit1 then v_duell.spieler2
      else null end;
    if v_duell.art = 'rangliste' then
      select elo into v_elo1 from public.lern_profil where id = v_duell.spieler1;
      select elo into v_elo2 from public.lern_profil where id = v_duell.spieler2;
      v_erwartet := 1 / (1 + power(10, (v_elo2 - v_elo1) / 400.0));
      v_wert := case when v_sieger = v_duell.spieler1 then 1 when v_sieger = v_duell.spieler2 then 0 else 0.5 end;
      v_aenderung := round(32 * (v_wert - v_erwartet));
      update public.lern_profil set elo = greatest(100, elo + v_aenderung) where id = v_duell.spieler1;
      update public.lern_profil set elo = greatest(100, elo - v_aenderung) where id = v_duell.spieler2;
    end if;
    update public.lern_duell
       set status = 'fertig', sieger = v_sieger, elo_aenderung = v_aenderung, fertig_am = now()
     where id = p_id
    returning * into v_duell;
  end if;
  return v_duell;
end;
$$;
grant execute on function public.lern_duell_ergebnis(uuid, integer, integer) to authenticated;

notify pgrst, 'reload schema';
