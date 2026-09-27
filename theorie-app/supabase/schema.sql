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

-- 9) Elo-Bestenliste (nur wer schon ein Rangliste-Duell beendet hat) ----
create or replace function public.lern_elo_rangliste()
returns table(platz bigint, id uuid, name text, benutzername text, elo integer)
language sql stable security definer set search_path = public
as $$
  select row_number() over (order by p.elo desc, p.created_at) as platz,
         p.id, p.name, p.benutzername, p.elo
    from public.lern_profil p
   where exists (
     select 1 from public.lern_duell d
      where d.art = 'rangliste' and d.status = 'fertig' and (d.spieler1 = p.id or d.spieler2 = p.id)
   )
   order by p.elo desc, p.created_at
   limit 100;
$$;
grant execute on function public.lern_elo_rangliste() to authenticated;

-- 10) Clips: kurze Videos wie bei TikTok --------------------------------
-- Ansehen dürfen alle (auch ohne Konto). Hochladen darf der Inhaber der App
-- (E-Mail in lern_inhaber, bestätigt) und jeder, den er in den
-- Einstellungen freischaltet. Liken, Kommentieren und Folgen braucht ein Konto.

create table if not exists public.lern_inhaber (
  email text primary key
);
alter table public.lern_inhaber enable row level security;
-- Keine Policies: nur die Funktionen unten lesen diese Tabelle.
insert into public.lern_inhaber (email) values ('leon.scheulen@gmail.com') on conflict do nothing;

-- Inhaber = angemeldet mit einer bestätigten E-Mail aus lern_inhaber.
create or replace function public.lern_ist_inhaber()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from auth.users u
      join public.lern_inhaber i on lower(i.email) = lower(u.email)
     where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

create table if not exists public.lern_clip_ersteller (
  user_id         uuid primary key references public.lern_profil(id) on delete cascade,
  hinzugefuegt_am timestamptz not null default now()
);
alter table public.lern_clip_ersteller enable row level security;
-- Lesen und Schreiben nur über die Funktionen unten.

create or replace function public.lern_darf_hochladen()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.lern_ist_inhaber() or exists (select 1 from public.lern_clip_ersteller e where e.user_id = auth.uid()));
$$;

create or replace function public.lern_clip_rechte()
returns table(inhaber boolean, ersteller boolean)
language sql stable security definer set search_path = public
as $$
  select public.lern_ist_inhaber(), public.lern_darf_hochladen();
$$;
grant execute on function public.lern_clip_rechte() to authenticated;

create table if not exists public.lern_clip (
  id           uuid primary key default gen_random_uuid(),
  autor        uuid not null references public.lern_profil(id) on delete cascade,
  titel        text not null check (char_length(titel) between 1 and 120),
  beschreibung text not null default '' check (char_length(beschreibung) <= 1000),
  video_pfad   text not null,
  bild_pfad    text,
  breite       integer,
  hoehe        integer,
  dauer        real,
  likes        integer not null default 0,
  kommentare   integer not null default 0,
  geteilt      integer not null default 0,
  erstellt_am  timestamptz not null default now()
);
create index if not exists lern_clip_zeit_idx on public.lern_clip(erstellt_am desc);
create index if not exists lern_clip_autor_idx on public.lern_clip(autor, erstellt_am desc);
alter table public.lern_clip enable row level security;
drop policy if exists "lern_clip_lesen" on public.lern_clip;
create policy "lern_clip_lesen" on public.lern_clip for select to anon, authenticated using (true);
-- Anlegen, Löschen und Zähler nur über die Funktionen unten.

create table if not exists public.lern_clip_like (
  clip_id     uuid not null references public.lern_clip(id) on delete cascade,
  user_id     uuid not null references public.lern_profil(id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  primary key (clip_id, user_id)
);
create index if not exists lern_clip_like_nutzer_idx on public.lern_clip_like(user_id);
alter table public.lern_clip_like enable row level security;
drop policy if exists "lern_clip_like_eigen" on public.lern_clip_like;
create policy "lern_clip_like_eigen" on public.lern_clip_like for select to authenticated using (user_id = auth.uid());

create table if not exists public.lern_folgen (
  folger      uuid not null references public.lern_profil(id) on delete cascade,
  folgt       uuid not null references public.lern_profil(id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  primary key (folger, folgt),
  check (folger <> folgt)
);
create index if not exists lern_folgen_folgt_idx on public.lern_folgen(folgt);
alter table public.lern_folgen enable row level security;
drop policy if exists "lern_folgen_eigen" on public.lern_folgen;
create policy "lern_folgen_eigen" on public.lern_folgen for select to authenticated using (folger = auth.uid());

create table if not exists public.lern_clip_kommentar (
  id          uuid primary key default gen_random_uuid(),
  clip_id     uuid not null references public.lern_clip(id) on delete cascade,
  autor       uuid not null references public.lern_profil(id) on delete cascade,
  inhalt      text not null check (char_length(inhalt) between 1 and 500),
  erstellt_am timestamptz not null default now()
);
create index if not exists lern_clip_kommentar_clip_idx on public.lern_clip_kommentar(clip_id, erstellt_am desc);
alter table public.lern_clip_kommentar enable row level security;
-- Lesen über lern_clip_kommentare(), Schreiben über die Funktionen unten.

create table if not exists public.lern_clip_meldung (
  id          uuid primary key default gen_random_uuid(),
  clip_id     uuid not null references public.lern_clip(id) on delete cascade,
  user_id     uuid not null references public.lern_profil(id) on delete cascade,
  grund       text not null default '',
  erstellt_am timestamptz not null default now(),
  unique (clip_id, user_id)
);
alter table public.lern_clip_meldung enable row level security;
-- Meldungen sieht nur der Inhaber im Supabase-Dashboard.

-- Profilbilder: liegen öffentlich lesbar im Speicher, damit sie im Feed und
-- in Kommentaren bei allen erscheinen. Jeder schreibt nur in seinen Ordner.
alter table public.lern_profil add column if not exists bild_pfad text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lern-profilbilder', 'lern-profilbilder', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lern_profilbild_hochladen" on storage.objects;
create policy "lern_profilbild_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "lern_profilbild_eigene_lesen" on storage.objects;
create policy "lern_profilbild_eigene_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'lern-profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "lern_profilbild_loeschen" on storage.objects;
create policy "lern_profilbild_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lern-profilbilder' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.lern_profilbild_setzen(p_pfad text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_pfad is not null and split_part(p_pfad, '/', 1) <> auth.uid()::text then raise exception 'Ungültiger Pfad'; end if;
  update public.lern_profil p set bild_pfad = p_pfad where p.id = auth.uid();
end;
$$;
grant execute on function public.lern_profilbild_setzen(text) to authenticated;

-- Speicher für Videos und Vorschaubilder: öffentlich lesbar, schnell per CDN.
-- Jeder lädt in seinen eigenen Ordner (<user-id>/...). 50 MB je Datei ist die
-- Obergrenze im kostenlosen Supabase-Tarif.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lern-clips', 'lern-clips', true, 52428800, array['video/mp4', 'video/quicktime', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lern_clips_hochladen" on storage.objects;
create policy "lern_clips_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-clips' and (storage.foldername(name))[1] = auth.uid()::text and public.lern_darf_hochladen());

drop policy if exists "lern_clips_eigene_lesen" on storage.objects;
create policy "lern_clips_eigene_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'lern-clips' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "lern_clips_loeschen" on storage.objects;
create policy "lern_clips_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lern-clips' and ((storage.foldername(name))[1] = auth.uid()::text or public.lern_ist_inhaber()));

-- Feed: „entdecken“ (alle, neueste zuerst) oder „folge_ich“. Weiterblättern mit p_vor.
drop function if exists public.lern_clip_feed(text, timestamptz, integer);
create or replace function public.lern_clip_feed(p_art text default 'entdecken', p_vor timestamptz default null, p_anzahl integer default 10)
returns table(
  id uuid, titel text, beschreibung text, video_pfad text, bild_pfad text, breite integer, hoehe integer, dauer real,
  likes integer, kommentare integer, geteilt integer, erstellt_am timestamptz,
  autor uuid, autor_name text, autor_benutzername text, autor_farbe text, autor_bild text,
  gemocht boolean, folge_ich boolean
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.titel, c.beschreibung, c.video_pfad, c.bild_pfad, c.breite, c.hoehe, c.dauer,
         c.likes, c.kommentare, c.geteilt, c.erstellt_am,
         c.autor, p.name, p.benutzername, p.avatar_farbe, p.bild_pfad,
         exists (select 1 from public.lern_clip_like l where l.clip_id = c.id and l.user_id = auth.uid()),
         exists (select 1 from public.lern_folgen f where f.folger = auth.uid() and f.folgt = c.autor)
    from public.lern_clip c
    join public.lern_profil p on p.id = c.autor
   where (p_vor is null or c.erstellt_am < p_vor)
     and (coalesce(p_art, 'entdecken') <> 'folge_ich'
          or exists (select 1 from public.lern_folgen f where f.folger = auth.uid() and f.folgt = c.autor))
   order by c.erstellt_am desc
   limit greatest(1, least(coalesce(p_anzahl, 10), 30));
$$;
grant execute on function public.lern_clip_feed(text, timestamptz, integer) to anon, authenticated;

-- Neuen Clip anlegen, nachdem Video (und Vorschaubild) hochgeladen sind.
create or replace function public.lern_clip_anlegen(
  p_video text, p_bild text, p_titel text, p_beschreibung text, p_breite integer, p_hoehe integer, p_dauer real
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_id  uuid;
begin
  if v_ich is null or not public.lern_darf_hochladen() then raise exception 'Keine Berechtigung zum Hochladen'; end if;
  if split_part(p_video, '/', 1) <> v_ich::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'lern-clips' and o.name = p_video) then
    raise exception 'Video nicht gefunden';
  end if;
  if p_bild is not null and split_part(p_bild, '/', 1) <> v_ich::text then raise exception 'Vorschaubild ungültig'; end if;
  insert into public.lern_clip (autor, titel, beschreibung, video_pfad, bild_pfad, breite, hoehe, dauer)
  values (v_ich, left(btrim(coalesce(p_titel, '')), 120), left(btrim(coalesce(p_beschreibung, '')), 1000),
          p_video, p_bild, p_breite, p_hoehe, p_dauer)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.lern_clip_anlegen(text, text, text, text, integer, integer, real) to authenticated;

-- Clip löschen (eigener Clip oder Inhaber). Die Dateien löscht die App.
create or replace function public.lern_clip_loeschen(p_clip uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.lern_clip c where c.id = p_clip and (c.autor = auth.uid() or public.lern_ist_inhaber());
  if not found then raise exception 'Clip nicht gefunden'; end if;
end;
$$;
grant execute on function public.lern_clip_loeschen(uuid) to authenticated;

-- Gefällt mir setzen oder entfernen; liefert die neue Anzahl.
create or replace function public.lern_clip_liken(p_clip uuid, p_an boolean)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_neu    integer;
  v_anzahl integer;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_an then
    insert into public.lern_clip_like (clip_id, user_id) values (p_clip, v_ich) on conflict do nothing;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip c set likes = c.likes + 1 where c.id = p_clip; end if;
  else
    delete from public.lern_clip_like l where l.clip_id = p_clip and l.user_id = v_ich;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip c set likes = greatest(0, c.likes - 1) where c.id = p_clip; end if;
  end if;
  select c.likes into v_anzahl from public.lern_clip c where c.id = p_clip;
  return coalesce(v_anzahl, 0);
end;
$$;
grant execute on function public.lern_clip_liken(uuid, boolean) to authenticated;

-- Jemandem folgen oder entfolgen.
create or replace function public.lern_folgen_setzen(p_nutzer uuid, p_an boolean)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_nutzer = v_ich then return false; end if;
  if p_an then
    insert into public.lern_folgen (folger, folgt) values (v_ich, p_nutzer) on conflict do nothing;
  else
    delete from public.lern_folgen f where f.folger = v_ich and f.folgt = p_nutzer;
  end if;
  return p_an;
end;
$$;
grant execute on function public.lern_folgen_setzen(uuid, boolean) to authenticated;

-- Kommentare eines Clips (neueste zuerst).
drop function if exists public.lern_clip_kommentare(uuid, timestamptz);
create or replace function public.lern_clip_kommentare(p_clip uuid, p_vor timestamptz default null)
returns table(id uuid, inhalt text, erstellt_am timestamptz, autor uuid, autor_name text, autor_benutzername text, autor_farbe text, autor_bild text, loeschbar boolean)
language sql stable security definer set search_path = public
as $$
  select k.id, k.inhalt, k.erstellt_am, k.autor, p.name, p.benutzername, p.avatar_farbe, p.bild_pfad,
         coalesce(k.autor = auth.uid()
                  or public.lern_ist_inhaber()
                  or exists (select 1 from public.lern_clip c where c.id = k.clip_id and c.autor = auth.uid()), false)
    from public.lern_clip_kommentar k
    join public.lern_profil p on p.id = k.autor
   where k.clip_id = p_clip and (p_vor is null or k.erstellt_am < p_vor)
   order by k.erstellt_am desc
   limit 50;
$$;
grant execute on function public.lern_clip_kommentare(uuid, timestamptz) to anon, authenticated;

create or replace function public.lern_clip_kommentieren(p_clip uuid, p_inhalt text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_text text := left(btrim(coalesce(p_inhalt, '')), 500);
  v_id   uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if v_text = '' then raise exception 'Kommentar ist leer'; end if;
  if (select count(*) from public.lern_clip_kommentar k where k.autor = v_ich and k.erstellt_am > now() - interval '1 minute') >= 10 then
    raise exception 'Zu viele Kommentare – bitte kurz warten';
  end if;
  insert into public.lern_clip_kommentar (clip_id, autor, inhalt) values (p_clip, v_ich, v_text) returning id into v_id;
  update public.lern_clip c set kommentare = c.kommentare + 1 where c.id = p_clip;
  return v_id;
end;
$$;
grant execute on function public.lern_clip_kommentieren(uuid, text) to authenticated;

create or replace function public.lern_clip_kommentar_loeschen(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_clip uuid;
begin
  delete from public.lern_clip_kommentar k
   where k.id = p_id
     and (k.autor = auth.uid()
          or public.lern_ist_inhaber()
          or exists (select 1 from public.lern_clip c where c.id = k.clip_id and c.autor = auth.uid()))
  returning k.clip_id into v_clip;
  if v_clip is not null then
    update public.lern_clip c set kommentare = greatest(0, c.kommentare - 1) where c.id = v_clip;
  end if;
end;
$$;
grant execute on function public.lern_clip_kommentar_loeschen(uuid) to authenticated;

create or replace function public.lern_clip_geteilt(p_clip uuid)
returns integer
language sql security definer set search_path = public
as $$
  update public.lern_clip c set geteilt = c.geteilt + 1 where c.id = p_clip returning c.geteilt;
$$;
grant execute on function public.lern_clip_geteilt(uuid) to authenticated;

create or replace function public.lern_clip_melden(p_clip uuid, p_grund text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  insert into public.lern_clip_meldung (clip_id, user_id, grund)
  values (p_clip, auth.uid(), left(coalesce(p_grund, ''), 200))
  on conflict (clip_id, user_id) do update set grund = excluded.grund, erstellt_am = now();
end;
$$;
grant execute on function public.lern_clip_melden(uuid, text) to authenticated;

-- Inhaber: Ersteller verwalten (per Benutzername oder E-Mail).
drop function if exists public.lern_clip_ersteller_liste();
create or replace function public.lern_clip_ersteller_liste()
returns table(id uuid, name text, benutzername text, avatar_farbe text, bild_pfad text, hinzugefuegt_am timestamptz)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return query
    select p.id, p.name, p.benutzername, p.avatar_farbe, p.bild_pfad, e.hinzugefuegt_am
      from public.lern_clip_ersteller e
      join public.lern_profil p on p.id = e.user_id
     order by e.hinzugefuegt_am desc;
end;
$$;
grant execute on function public.lern_clip_ersteller_liste() to authenticated;

create or replace function public.lern_clip_ersteller_hinzufuegen(p_kennung text)
returns table(id uuid, name text, benutzername text)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_kennung text := lower(btrim(coalesce(p_kennung, '')));
  v_id      uuid;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if position('@' in v_kennung) > 1 then
    select u.id into v_id from auth.users u where lower(u.email) = v_kennung;
  else
    select p.id into v_id from public.lern_profil p where p.benutzername = ltrim(v_kennung, '@');
  end if;
  if v_id is null or not exists (select 1 from public.lern_profil p where p.id = v_id) then
    raise exception 'Kein Konto mit diesem Benutzernamen oder dieser E-Mail gefunden';
  end if;
  insert into public.lern_clip_ersteller (user_id) values (v_id) on conflict do nothing;
  return query select p.id, p.name, p.benutzername from public.lern_profil p where p.id = v_id;
end;
$$;
grant execute on function public.lern_clip_ersteller_hinzufuegen(text) to authenticated;

create or replace function public.lern_clip_ersteller_entfernen(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  delete from public.lern_clip_ersteller e where e.user_id = p_id;
end;
$$;
grant execute on function public.lern_clip_ersteller_entfernen(uuid) to authenticated;

-- 11) Benutzernamen ändern (Einstellungen) ------------------------------
create or replace function public.lern_benutzername_aendern(p_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_name, '')));
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if v_name !~ '^[a-z0-9_.]{3,20}$' then
    raise exception 'Benutzername: 3–20 Zeichen, nur Buchstaben, Zahlen, Punkt und Unterstrich';
  end if;
  if exists (select 1 from public.lern_profil p where p.benutzername = v_name and p.id <> v_ich) then
    raise exception 'Dieser Benutzername ist schon vergeben';
  end if;
  update public.lern_profil p set benutzername = v_name where p.id = v_ich;
  return v_name;
end;
$$;
grant execute on function public.lern_benutzername_aendern(text) to authenticated;

notify pgrst, 'reload schema';
