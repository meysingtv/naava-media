-- =====================================================================
-- Fahrschul Pro – Lern-App für die Führerschein-Theorie
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

-- Antworten (eine Ebene: Antworten hängen am obersten Kommentar) und Likes.
alter table public.lern_clip_kommentar
  add column if not exists antwort_auf uuid references public.lern_clip_kommentar(id) on delete cascade,
  add column if not exists likes integer not null default 0;
create index if not exists lern_clip_kommentar_antwort_idx on public.lern_clip_kommentar(antwort_auf);

create table if not exists public.lern_kommentar_like (
  kommentar_id uuid not null references public.lern_clip_kommentar(id) on delete cascade,
  user_id      uuid not null references public.lern_profil(id) on delete cascade,
  erstellt_am  timestamptz not null default now(),
  primary key (kommentar_id, user_id)
);
alter table public.lern_kommentar_like enable row level security;

-- Emoji-Reaktionen: eine je Person und Kommentar, feste Auswahl.
create table if not exists public.lern_kommentar_reaktion (
  kommentar_id uuid not null references public.lern_clip_kommentar(id) on delete cascade,
  user_id      uuid not null references public.lern_profil(id) on delete cascade,
  emoji        text not null check (emoji in ('👍', '❤️', '😂', '😮', '🔥', '👏')),
  erstellt_am  timestamptz not null default now(),
  primary key (kommentar_id, user_id)
);
create index if not exists lern_kommentar_reaktion_idx on public.lern_kommentar_reaktion(kommentar_id);
alter table public.lern_kommentar_reaktion enable row level security;
-- Beide Tabellen: Lesen und Schreiben nur über die Funktionen unten.

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

-- Kommentare eines Clips samt Antworten (neueste zuerst), mit Likes und Reaktionen.
drop function if exists public.lern_clip_kommentare(uuid, timestamptz);
create or replace function public.lern_clip_kommentare(p_clip uuid, p_vor timestamptz default null)
returns table(
  id uuid, antwort_auf uuid, inhalt text, erstellt_am timestamptz,
  autor uuid, autor_name text, autor_benutzername text, autor_farbe text, autor_bild text,
  loeschbar boolean, likes integer, gemocht boolean, reaktionen jsonb, meine_reaktion text
)
language sql stable security definer set search_path = public
as $$
  select k.id, k.antwort_auf, k.inhalt, k.erstellt_am, k.autor, p.name, p.benutzername, p.avatar_farbe, p.bild_pfad,
         coalesce(k.autor = auth.uid()
                  or public.lern_ist_inhaber()
                  or exists (select 1 from public.lern_clip c where c.id = k.clip_id and c.autor = auth.uid()), false),
         k.likes,
         exists (select 1 from public.lern_kommentar_like l where l.kommentar_id = k.id and l.user_id = auth.uid()),
         coalesce((select jsonb_object_agg(x.emoji, x.anzahl)
                     from (select r.emoji, count(*) as anzahl
                             from public.lern_kommentar_reaktion r
                            where r.kommentar_id = k.id
                            group by r.emoji) x), '{}'::jsonb),
         (select r.emoji from public.lern_kommentar_reaktion r where r.kommentar_id = k.id and r.user_id = auth.uid())
    from public.lern_clip_kommentar k
    join public.lern_profil p on p.id = k.autor
   where k.clip_id = p_clip and (p_vor is null or k.erstellt_am < p_vor)
   order by k.erstellt_am desc
   limit 200;
$$;
grant execute on function public.lern_clip_kommentare(uuid, timestamptz) to anon, authenticated;

drop function if exists public.lern_clip_kommentieren(uuid, text);
create or replace function public.lern_clip_kommentieren(p_clip uuid, p_inhalt text, p_antwort_auf uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_text   text := left(btrim(coalesce(p_inhalt, '')), 500);
  v_eltern uuid;
  v_id     uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if v_text = '' then raise exception 'Kommentar ist leer'; end if;
  if (select count(*) from public.lern_clip_kommentar k where k.autor = v_ich and k.erstellt_am > now() - interval '1 minute') >= 10 then
    raise exception 'Zu viele Kommentare – bitte kurz warten';
  end if;
  if p_antwort_auf is not null then
    -- Antworten hängen immer am obersten Kommentar.
    select coalesce(k.antwort_auf, k.id) into v_eltern
      from public.lern_clip_kommentar k
     where k.id = p_antwort_auf and k.clip_id = p_clip;
    if v_eltern is null then raise exception 'Kommentar nicht gefunden'; end if;
  end if;
  insert into public.lern_clip_kommentar (clip_id, autor, inhalt, antwort_auf) values (p_clip, v_ich, v_text, v_eltern) returning id into v_id;
  update public.lern_clip c set kommentare = c.kommentare + 1 where c.id = p_clip;
  return v_id;
end;
$$;
grant execute on function public.lern_clip_kommentieren(uuid, text, uuid) to authenticated;

drop function if exists public.lern_clip_kommentar_loeschen(uuid);
create or replace function public.lern_clip_kommentar_loeschen(p_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_clip   uuid;
  v_anzahl integer;
begin
  select k.clip_id, 1 + (select count(*)::int from public.lern_clip_kommentar a where a.antwort_auf = k.id)
    into v_clip, v_anzahl
    from public.lern_clip_kommentar k
   where k.id = p_id
     and (k.autor = auth.uid()
          or public.lern_ist_inhaber()
          or exists (select 1 from public.lern_clip c where c.id = k.clip_id and c.autor = auth.uid()));
  if v_clip is null then return 0; end if;
  delete from public.lern_clip_kommentar k where k.id = p_id; -- Antworten fallen mit weg
  update public.lern_clip c set kommentare = greatest(0, c.kommentare - v_anzahl) where c.id = v_clip;
  return v_anzahl;
end;
$$;
grant execute on function public.lern_clip_kommentar_loeschen(uuid) to authenticated;

-- Kommentar liken; liefert die neue Anzahl.
create or replace function public.lern_kommentar_liken(p_kommentar uuid, p_an boolean)
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
    insert into public.lern_kommentar_like (kommentar_id, user_id) values (p_kommentar, v_ich) on conflict do nothing;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip_kommentar k set likes = k.likes + 1 where k.id = p_kommentar; end if;
  else
    delete from public.lern_kommentar_like l where l.kommentar_id = p_kommentar and l.user_id = v_ich;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip_kommentar k set likes = greatest(0, k.likes - 1) where k.id = p_kommentar; end if;
  end if;
  select k.likes into v_anzahl from public.lern_clip_kommentar k where k.id = p_kommentar;
  return coalesce(v_anzahl, 0);
end;
$$;
grant execute on function public.lern_kommentar_liken(uuid, boolean) to authenticated;

-- Mit Emoji reagieren (null entfernt die eigene Reaktion); liefert alle Reaktionen.
create or replace function public.lern_kommentar_reagieren(p_kommentar uuid, p_emoji text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_ergebnis jsonb;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if coalesce(p_emoji, '') = '' then
    delete from public.lern_kommentar_reaktion r where r.kommentar_id = p_kommentar and r.user_id = v_ich;
  else
    insert into public.lern_kommentar_reaktion (kommentar_id, user_id, emoji) values (p_kommentar, v_ich, p_emoji)
    on conflict (kommentar_id, user_id) do update set emoji = excluded.emoji, erstellt_am = now();
  end if;
  select coalesce(jsonb_object_agg(x.emoji, x.anzahl), '{}'::jsonb) into v_ergebnis
    from (select r.emoji, count(*) as anzahl from public.lern_kommentar_reaktion r where r.kommentar_id = p_kommentar group by r.emoji) x;
  return v_ergebnis;
end;
$$;
grant execute on function public.lern_kommentar_reagieren(uuid, text) to authenticated;

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

-- 12) Ersteller-Profil: Kopf mit Zahlen und alle Clips einer Person ------
drop function if exists public.lern_ersteller_profil(uuid);
create or replace function public.lern_ersteller_profil(p_nutzer uuid)
returns table(
  id uuid, name text, benutzername text, avatar_farbe text, bild_pfad text,
  clips integer, follower integer, folgt integer, likes integer, folge_ich boolean, ich boolean
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.benutzername, p.avatar_farbe, p.bild_pfad,
         (select count(*)::int from public.lern_clip c where c.autor = p.id),
         (select count(*)::int from public.lern_folgen f where f.folgt = p.id),
         (select count(*)::int from public.lern_folgen f where f.folger = p.id),
         (select coalesce(sum(c.likes), 0)::int from public.lern_clip c where c.autor = p.id),
         exists (select 1 from public.lern_folgen f where f.folger = auth.uid() and f.folgt = p.id),
         coalesce(p.id = auth.uid(), false)
    from public.lern_profil p
   where p.id = p_nutzer;
$$;
grant execute on function public.lern_ersteller_profil(uuid) to anon, authenticated;

drop function if exists public.lern_clips_von(uuid, timestamptz, integer);
create or replace function public.lern_clips_von(p_nutzer uuid, p_vor timestamptz default null, p_anzahl integer default 30)
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
   where c.autor = p_nutzer and (p_vor is null or c.erstellt_am < p_vor)
   order by c.erstellt_am desc
   limit greatest(1, least(coalesce(p_anzahl, 30), 60));
$$;
grant execute on function public.lern_clips_von(uuid, timestamptz, integer) to anon, authenticated;

-- 13) Rolle (Fahrschüler/Fahrlehrer) und Anmelden mit Benutzername -----
-- Fahrlehrer dürfen Clips hochladen. Die Rolle wählt man bei der
-- Registrierung (oder später in den Einstellungen).
alter table public.lern_profil
  add column if not exists rolle text not null default 'schueler';
do $$ begin
  alter table public.lern_profil add constraint lern_profil_rolle_pruefen check (rolle in ('schueler', 'fahrlehrer'));
exception when duplicate_object then null; end $$;

-- Rolle aus der Registrierung übernehmen (läuft nach lern_neuer_nutzer).
create or replace function public.lern_rolle_uebernehmen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'rolle' = 'fahrlehrer' then
    update public.lern_profil set rolle = 'fahrlehrer' where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists lern_zz_rolle on auth.users;
create trigger lern_zz_rolle
  after insert on auth.users
  for each row execute function public.lern_rolle_uebernehmen();

-- Rolle selbst wählen (Einstellungen oder nach Google/Apple).
create or replace function public.lern_rolle_setzen(p_rolle text)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_rolle not in ('schueler', 'fahrlehrer') then raise exception 'Unbekannte Rolle'; end if;
  update public.lern_profil set rolle = p_rolle where id = auth.uid();
  return p_rolle;
end;
$$;
grant execute on function public.lern_rolle_setzen(text) to authenticated;

-- Hochladen dürfen: Inhaber, freigeschaltete Ersteller und alle Fahrlehrer.
create or replace function public.lern_darf_hochladen()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.lern_ist_inhaber()
          or exists (select 1 from public.lern_clip_ersteller e where e.user_id = auth.uid())
          or exists (select 1 from public.lern_profil p where p.id = auth.uid() and p.rolle = 'fahrlehrer'));
$$;

-- Anmelden mit Benutzername: Die E-Mail gibt es nur zurück, wenn das Passwort
-- stimmt – so lassen sich keine E-Mail-Adressen über Benutzernamen abfragen.
-- Gegen Durchprobieren: höchstens 10 Fehlversuche je Benutzername in 15 Minuten.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.lern_anmeldeversuch (
  kennung text not null,
  zeit    timestamptz not null default now()
);
create index if not exists lern_anmeldeversuch_kennung on public.lern_anmeldeversuch (kennung, zeit);
alter table public.lern_anmeldeversuch enable row level security;
-- Keine Policies: nur die Funktion unten liest und schreibt.

create or replace function public.lern_anmelde_email(p_benutzername text, p_passwort text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_name  text := lower(ltrim(btrim(coalesce(p_benutzername, '')), '@'));
  v_email text;
  v_hash  text;
begin
  if v_name = '' or coalesce(p_passwort, '') = '' then return null; end if;
  if (select count(*) from public.lern_anmeldeversuch a where a.kennung = v_name and a.zeit > now() - interval '15 minutes') >= 10 then
    raise exception 'Zu viele Versuche. Bitte warte ein paar Minuten.';
  end if;
  select u.email, u.encrypted_password into v_email, v_hash
    from public.lern_profil p
    join auth.users u on u.id = p.id
   where p.benutzername = v_name;
  if v_email is not null and v_hash like '$2%' and v_hash = extensions.crypt(p_passwort, v_hash) then
    delete from public.lern_anmeldeversuch where kennung = v_name;
    return v_email;
  end if;
  insert into public.lern_anmeldeversuch (kennung) values (v_name);
  delete from public.lern_anmeldeversuch where zeit < now() - interval '1 day';
  return null;
end;
$$;
grant execute on function public.lern_anmelde_email(text, text) to anon, authenticated;

-- 14) Sicherheit: Rechte, Grenzen, Schutz vor Spam und Schummeln -------
-- (dasselbe wie supabase/update-sicherheit.sql)
-- a) Gültige Werte im Profil ------------------------------------------------
create or replace function public.lern_bundesland_gueltig(p text)
returns boolean
language sql immutable
as $$
  select p in ('Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen',
               'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
               'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen');
$$;

-- „not valid“: gilt für alle neuen Änderungen, bestehende Zeilen bleiben, wie sie sind.
do $$ begin
  alter table public.lern_profil add constraint lern_profil_name_laenge check (char_length(name) <= 40) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lern_profil add constraint lern_profil_klasse_form check (klasse ~ '^[A-Z0-9]{1,4}$') not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lern_profil add constraint lern_profil_farbe_form check (avatar_farbe ~ '^#[0-9A-Fa-f]{6}$') not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lern_profil add constraint lern_profil_bundesland_gueltig check (bundesland is null or public.lern_bundesland_gueltig(bundesland)) not valid;
exception when duplicate_object then null; end $$;

-- Gesicherter Lernstand höchstens 5 MB.
do $$ begin
  alter table public.lern_sync add constraint lern_sync_groesse check (octet_length(daten::text) <= 5000000) not valid;
exception when duplicate_object then null; end $$;

-- Registrierung: Werte aus der App kürzen bzw. prüfen, bevor sie ins Profil gehen.
create or replace function public.lern_neuer_nutzer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  basis    text := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'benutzername', ''), split_part(new.email, '@', 1)), '[^a-zA-Z0-9_.]', '', 'g'));
  kandidat text;
  v_klasse text := upper(coalesce(new.raw_user_meta_data->>'klasse', ''));
begin
  if basis = '' then basis := 'fahrer'; end if;
  kandidat := left(basis, 20);
  while exists (select 1 from public.lern_profil where benutzername = kandidat) loop
    kandidat := left(basis, 15) || floor(random() * 90000 + 10000)::int;
  end loop;
  if v_klasse !~ '^[A-Z0-9]{1,4}$' then v_klasse := 'B'; end if;

  insert into public.lern_profil (id, name, benutzername, klasse)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), kandidat), 40), kandidat, v_klasse)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.lern_bundesland_setzen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.lern_bundesland_gueltig(new.raw_user_meta_data->>'bundesland') then
    update public.lern_profil
       set bundesland = new.raw_user_meta_data->>'bundesland'
     where id = new.id and bundesland is null;
  end if;
  return new;
end;
$$;

-- b) Mengenbremse für alles, was man oft hintereinander aufrufen könnte ---
create table if not exists public.lern_limit (
  user_id uuid not null,
  art     text not null,
  zeit    timestamptz not null default now()
);
create index if not exists lern_limit_idx on public.lern_limit (user_id, art, zeit);
alter table public.lern_limit enable row level security;
-- Keine Policies: nur die Funktionen unten lesen und schreiben.

create or replace function public.lern_limit_pruefen(p_art text, p_max integer, p_fenster interval)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if (select count(*) from public.lern_limit l where l.user_id = v_ich and l.art = p_art and l.zeit > now() - p_fenster) >= p_max then
    raise exception 'Zu viele Anfragen – bitte warte kurz.';
  end if;
  insert into public.lern_limit (user_id, art) values (v_ich, p_art);
  delete from public.lern_limit l where l.user_id = v_ich and l.zeit < now() - interval '1 day';
end;
$$;

-- c) XP: je Aufruf und je Tag gedeckelt, Serie nie länger als das Konto alt ist
alter table public.lern_profil
  add column if not exists xp_tag date,
  add column if not exists xp_heute integer not null default 0,
  add column if not exists fragen_heute integer not null default 0;

create or replace function public.lern_xp_buchen(p_xp integer, p_gesamt integer, p_richtig integer, p_serie integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ich   uuid := auth.uid();
  v_heute date := (now() at time zone 'Europe/Berlin')::date;
  v_woche date := (date_trunc('week', now() at time zone 'Europe/Berlin'))::date;
  v_p     public.lern_profil;
  v_xp    integer;
  v_ges   integer;
  v_serie integer;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select * into v_p from public.lern_profil where id = v_ich for update;
  if not found then return; end if;
  if v_p.xp_tag is distinct from v_heute then
    v_p.xp_heute := 0;
    v_p.fragen_heute := 0;
  end if;
  v_xp    := greatest(0, least(coalesce(p_xp, 0), 600, 5000 - v_p.xp_heute));
  v_ges   := greatest(0, least(coalesce(p_gesamt, 0), 120, 2000 - v_p.fragen_heute));
  v_serie := greatest(0, least(coalesce(p_serie, 0), (v_heute - (v_p.created_at at time zone 'Europe/Berlin')::date) + 1));
  update public.lern_profil p set
    xp             = p.xp + v_xp,
    xp_woche       = (case when p.woche_start = v_woche then p.xp_woche else 0 end) + v_xp,
    woche_start    = v_woche,
    xp_tag         = v_heute,
    xp_heute       = v_p.xp_heute + v_xp,
    fragen_heute   = v_p.fragen_heute + v_ges,
    fragen_gesamt  = p.fragen_gesamt + v_ges,
    fragen_richtig = p.fragen_richtig + greatest(0, least(coalesce(p_richtig, 0), v_ges)),
    serie          = v_serie,
    beste_serie    = greatest(p.beste_serie, v_serie)
  where p.id = v_ich;
end;
$$;

-- d) Duelle: gültige Fragen, Mengenbremse, plausible Ergebnisse -----------
alter table public.lern_duell add column if not exists beigetreten_am timestamptz;

create or replace function public.lern_fragen_gueltig(p_fragen text[])
returns boolean
language sql immutable
as $$
  select coalesce(array_length(p_fragen, 1), 0) between 1 and 10
     and not exists (select 1 from unnest(p_fragen) f where f is null or f !~ '^[A-Za-z0-9_.-]{1,40}$');
$$;

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
  if not public.lern_fragen_gueltig(p_fragen) then raise exception 'Ungültige Fragen'; end if;
  perform public.lern_limit_pruefen('duell', 60, interval '1 day');
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
    update public.lern_duell set spieler2 = v_ich, status = 'laeuft', beigetreten_am = now() where id = v_duell.id returning * into v_duell;
    return v_duell;
  end if;

  insert into public.lern_duell (art, fragen, spieler1) values ('rangliste', p_fragen[1:10], v_ich) returning * into v_duell;
  return v_duell;
end;
$$;

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
  if not public.lern_fragen_gueltig(p_fragen) then raise exception 'Ungültige Fragen'; end if;
  perform public.lern_limit_pruefen('duell', 60, interval '1 day');
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

-- Codes durchprobieren bringt nichts: höchstens 30 Versuche in 10 Minuten.
-- Ein falscher Code liefert ein leeres Duell statt eines Fehlers – sonst
-- würde die Datenbank den gezählten Versuch mit zurückrollen.
create or replace function public.lern_duell_beitreten(p_code text)
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_duell public.lern_duell;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('duell_code', 30, interval '10 minutes');
  update public.lern_duell
     set spieler2 = v_ich, status = 'laeuft', beigetreten_am = now()
   where code = upper(btrim(coalesce(p_code, ''))) and art = 'freund' and spieler2 is null and spieler1 <> v_ich
  returning * into v_duell;
  return v_duell;
end;
$$;

-- Ergebnis: Wer schneller „fertig“ ist, als man die Fragen lesen kann
-- (unter 1 Sekunde je Frage seit dem Start), bekommt 0 Punkte.
create or replace function public.lern_duell_ergebnis(p_id uuid, p_punkte integer, p_zeit integer)
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_duell public.lern_duell;
  v_anzahl integer;
  v_punkte integer;
  v_zeit integer;
  v_start timestamptz;
  v_sieger uuid;
  v_elo1 integer;
  v_elo2 integer;
  v_erwartet double precision;
  v_wert double precision;
  v_aenderung integer := null;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select * into v_duell from public.lern_duell where id = p_id for update;
  if v_duell.id is null or (v_duell.spieler1 <> v_ich and v_duell.spieler2 is distinct from v_ich) then
    raise exception 'Duell nicht gefunden';
  end if;
  v_anzahl := coalesce(array_length(v_duell.fragen, 1), 10);
  v_punkte := greatest(0, least(coalesce(p_punkte, 0), v_anzahl));
  v_zeit := greatest(v_anzahl, least(coalesce(p_zeit, 0), 3600));
  v_start := case when v_duell.spieler1 = v_ich then v_duell.erstellt_am else coalesce(v_duell.beigetreten_am, v_duell.erstellt_am) end;
  if extract(epoch from now() - v_start) < v_anzahl then v_punkte := 0; end if;

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

-- e) Clips, Likes, Kommentare, Folgen: Mengenbremse ------------------------
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
  perform public.lern_limit_pruefen('clip', 20, interval '1 day');
  if split_part(p_video, '/', 1) <> v_ich::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'lern-clips' and o.name = p_video) then
    raise exception 'Video nicht gefunden';
  end if;
  if p_bild is not null and (split_part(p_bild, '/', 1) <> v_ich::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'lern-clips' and o.name = p_bild)) then
    raise exception 'Vorschaubild ungültig';
  end if;
  insert into public.lern_clip (autor, titel, beschreibung, video_pfad, bild_pfad, breite, hoehe, dauer)
  values (v_ich, left(btrim(coalesce(p_titel, '')), 120), left(btrim(coalesce(p_beschreibung, '')), 1000),
          p_video, p_bild,
          nullif(greatest(0, least(coalesce(p_breite, 0), 10000)), 0),
          nullif(greatest(0, least(coalesce(p_hoehe, 0), 10000)), 0),
          nullif(greatest(0, least(coalesce(p_dauer, 0), 600)), 0))
  returning id into v_id;
  return v_id;
end;
$$;

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
  perform public.lern_limit_pruefen('like', 600, interval '1 hour');
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

create or replace function public.lern_folgen_setzen(p_nutzer uuid, p_an boolean)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_nutzer = v_ich then return false; end if;
  perform public.lern_limit_pruefen('folgen', 300, interval '1 hour');
  if p_an then
    insert into public.lern_folgen (folger, folgt) values (v_ich, p_nutzer) on conflict do nothing;
  else
    delete from public.lern_folgen f where f.folger = v_ich and f.folgt = p_nutzer;
  end if;
  return p_an;
end;
$$;

create or replace function public.lern_clip_kommentieren(p_clip uuid, p_inhalt text, p_antwort_auf uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_text   text := left(btrim(coalesce(p_inhalt, '')), 500);
  v_eltern uuid;
  v_id     uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if v_text = '' then raise exception 'Kommentar ist leer'; end if;
  if (select count(*) from public.lern_clip_kommentar k where k.autor = v_ich and k.erstellt_am > now() - interval '1 minute') >= 10 then
    raise exception 'Zu viele Kommentare – bitte kurz warten';
  end if;
  perform public.lern_limit_pruefen('kommentar', 300, interval '1 day');
  if p_antwort_auf is not null then
    -- Antworten hängen immer am obersten Kommentar.
    select coalesce(k.antwort_auf, k.id) into v_eltern
      from public.lern_clip_kommentar k
     where k.id = p_antwort_auf and k.clip_id = p_clip;
    if v_eltern is null then raise exception 'Kommentar nicht gefunden'; end if;
  end if;
  insert into public.lern_clip_kommentar (clip_id, autor, inhalt, antwort_auf) values (p_clip, v_ich, v_text, v_eltern) returning id into v_id;
  update public.lern_clip c set kommentare = c.kommentare + 1 where c.id = p_clip;
  return v_id;
end;
$$;

create or replace function public.lern_kommentar_liken(p_kommentar uuid, p_an boolean)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_neu    integer;
  v_anzahl integer;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('like', 600, interval '1 hour');
  if p_an then
    insert into public.lern_kommentar_like (kommentar_id, user_id) values (p_kommentar, v_ich) on conflict do nothing;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip_kommentar k set likes = k.likes + 1 where k.id = p_kommentar; end if;
  else
    delete from public.lern_kommentar_like l where l.kommentar_id = p_kommentar and l.user_id = v_ich;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip_kommentar k set likes = greatest(0, k.likes - 1) where k.id = p_kommentar; end if;
  end if;
  select k.likes into v_anzahl from public.lern_clip_kommentar k where k.id = p_kommentar;
  return coalesce(v_anzahl, 0);
end;
$$;

create or replace function public.lern_kommentar_reagieren(p_kommentar uuid, p_emoji text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_ergebnis jsonb;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('like', 600, interval '1 hour');
  if coalesce(p_emoji, '') = '' then
    delete from public.lern_kommentar_reaktion r where r.kommentar_id = p_kommentar and r.user_id = v_ich;
  else
    insert into public.lern_kommentar_reaktion (kommentar_id, user_id, emoji) values (p_kommentar, v_ich, p_emoji)
    on conflict (kommentar_id, user_id) do update set emoji = excluded.emoji, erstellt_am = now();
  end if;
  select coalesce(jsonb_object_agg(x.emoji, x.anzahl), '{}'::jsonb) into v_ergebnis
    from (select r.emoji, count(*) as anzahl from public.lern_kommentar_reaktion r where r.kommentar_id = p_kommentar group by r.emoji) x;
  return v_ergebnis;
end;
$$;

-- Teilen zählt nur mit Konto und höchstens 60-mal pro Stunde.
drop function if exists public.lern_clip_geteilt(uuid);
create or replace function public.lern_clip_geteilt(p_clip uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_anzahl integer;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('teilen', 60, interval '1 hour');
  update public.lern_clip c set geteilt = c.geteilt + 1 where c.id = p_clip returning c.geteilt into v_anzahl;
  return v_anzahl;
end;
$$;

create or replace function public.lern_clip_melden(p_clip uuid, p_grund text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('melden', 30, interval '1 day');
  insert into public.lern_clip_meldung (clip_id, user_id, grund)
  values (p_clip, auth.uid(), left(coalesce(p_grund, ''), 200))
  on conflict (clip_id, user_id) do update set grund = excluded.grund, erstellt_am = now();
end;
$$;

-- Benutzernamen und Rolle: nicht im Sekundentakt wechseln.
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
  perform public.lern_limit_pruefen('benutzername', 10, interval '1 day');
  update public.lern_profil p set benutzername = v_name where p.id = v_ich;
  return v_name;
end;
$$;

create or replace function public.lern_rolle_setzen(p_rolle text)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_rolle not in ('schueler', 'fahrlehrer') then raise exception 'Unbekannte Rolle'; end if;
  perform public.lern_limit_pruefen('rolle', 20, interval '1 day');
  update public.lern_profil set rolle = p_rolle where id = auth.uid();
  return p_rolle;
end;
$$;

-- f) Speicher: höchstens 10 Profilbilder und 400 Clip-Dateien je Konto -----
create or replace function public.lern_speicher_anzahl(p_bucket text)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
    from storage.objects o
   where o.bucket_id = p_bucket and (storage.foldername(o.name))[1] = auth.uid()::text;
$$;

drop policy if exists "lern_profilbild_hochladen" on storage.objects;
create policy "lern_profilbild_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-profilbilder' and (storage.foldername(name))[1] = auth.uid()::text
              and public.lern_speicher_anzahl('lern-profilbilder') < 10);

drop policy if exists "lern_clips_hochladen" on storage.objects;
create policy "lern_clips_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-clips' and (storage.foldername(name))[1] = auth.uid()::text
              and public.lern_darf_hochladen() and public.lern_speicher_anzahl('lern-clips') < 400);

-- g) Wer darf welche Funktion aufrufen? ------------------------------------
-- Supabase gibt neuen Funktionen Ausführungsrecht für alle – auch ohne Konto.
-- Erst allen lern_-Funktionen „ohne Konto“ entziehen, angemeldeten geben …
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, pg_get_function_result(p.oid) as ergebnis
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'lern\_%'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.ergebnis <> 'trigger' then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;

-- … dann ohne Konto nur das, was Gäste brauchen: Clips und Kommentare
-- ansehen, Profile ansehen, Benutzername prüfen, mit Benutzername anmelden.
grant execute on function public.lern_benutzername_frei(text) to anon;
grant execute on function public.lern_clip_feed(text, timestamptz, integer) to anon;
grant execute on function public.lern_clip_kommentare(uuid, timestamptz) to anon;
grant execute on function public.lern_ersteller_profil(uuid) to anon;
grant execute on function public.lern_clips_von(uuid, timestamptz, integer) to anon;
grant execute on function public.lern_anmelde_email(text, text) to anon;

-- Die Mengenbremse ruft nur der Server selbst auf.
revoke execute on function public.lern_limit_pruefen(text, integer, interval) from authenticated;

-- 15) Ohne E-Mail-Bestätigung ------------------------------------------
-- Neue Konten mit E-Mail + Passwort sind sofort nutzbar. Die Adresse wird dabei
-- nie geprüft – solche Konten tragen in den App-Metadaten "email_ungeprueft"
-- und bekommen keine Inhaber-Rechte über die E-Mail (nur mit geprüfter Adresse
-- oder Google/Apple). Im Dashboard „Confirm email“ ausschalten.
create or replace function public.lern_ohne_bestaetigung()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email' then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('email_ungeprueft', true);
    if new.email_confirmed_at is null then
      new.email_confirmed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lern_ohne_bestaetigung on auth.users;
create trigger lern_ohne_bestaetigung
  before insert on auth.users
  for each row execute function public.lern_ohne_bestaetigung();

revoke execute on function public.lern_ohne_bestaetigung() from public, anon, authenticated;

-- Wer sich schon registriert, aber nie bestätigt hat, kann sich ab jetzt anmelden
-- (Markierung „vorher“ = Konto stammt aus der Zeit vor der Umstellung).
update auth.users
   set email_confirmed_at = now(),
       raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('email_ungeprueft', 'vorher')
 where email_confirmed_at is null
   and coalesce(raw_app_meta_data->>'provider', 'email') = 'email';

-- Inhaber-Konten aus der Zeit vor der Umstellung gelten als geprüft (das bist du).
-- Neue Registrierungen mit einer Inhaber-Adresse bleiben markiert – auch wenn
-- diese Datei später noch einmal läuft.
update auth.users u
   set raw_app_meta_data = u.raw_app_meta_data - 'email_ungeprueft'
  from public.lern_inhaber i
 where lower(i.email) = lower(u.email)
   and u.raw_app_meta_data->>'email_ungeprueft' = 'vorher';

-- Inhaber nur mit geprüfter Adresse oder mit Google/Apple-Anmeldung.
create or replace function public.lern_ist_inhaber()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from auth.users u
      join public.lern_inhaber i on lower(i.email) = lower(u.email)
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
       and (
         not (coalesce(u.raw_app_meta_data, '{}'::jsonb) ? 'email_ungeprueft')
         or exists (select 1 from auth.identities a where a.user_id = u.id and a.provider in ('google', 'apple'))
       )
  );
$$;

revoke execute on function public.lern_ist_inhaber() from public, anon;
grant execute on function public.lern_ist_inhaber() to authenticated;

notify pgrst, 'reload schema';

-- 16) Crew: gemeinsam lernen ----------------------------------------------
-- 2 bis 6 Leute lernen zusammen: gemeinsame Crew-Flamme (wächst nur, wenn
-- alle ihr Tagesziel schaffen), Anstupsen, Einladungen und jede Woche ein
-- Boss aus dem schwächsten Thema der Crew, den alle zusammen besiegen.
-- Wiederholbar; derselbe Inhalt steht in schema.sql (Abschnitt 16).

-- a) Tabellen – Lesen und Schreiben nur über die Funktionen unten -----------
create table if not exists public.lern_crew (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Meine Crew' check (char_length(name) between 1 and 30),
  code         text not null unique,
  erstellt_von uuid references auth.users(id) on delete set null,
  flamme       integer not null default 0,
  flamme_tag   date,
  flamme_beste integer not null default 0,
  erstellt_am  timestamptz not null default now()
);

-- Jede Person ist in höchstens einer Crew.
create table if not exists public.lern_crew_mitglied (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  crew_id        uuid not null references public.lern_crew(id) on delete cascade,
  beigetreten_am timestamptz not null default now()
);
create index if not exists lern_crew_mitglied_crew on public.lern_crew_mitglied (crew_id);

create table if not exists public.lern_crew_einladung (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.lern_crew(id) on delete cascade,
  von         uuid not null references auth.users(id) on delete cascade,
  an          uuid not null references auth.users(id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  unique (crew_id, an)
);
create index if not exists lern_crew_einladung_an on public.lern_crew_einladung (an);

create table if not exists public.lern_crew_boss (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.lern_crew(id) on delete cascade,
  woche      date not null,
  thema      text not null,
  hp_max     integer not null,
  hp         integer not null,
  besiegt_am timestamptz,
  unique (crew_id, woche)
);

create table if not exists public.lern_crew_belohnung (
  boss_id     uuid not null references public.lern_crew_boss(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  abgeholt_am timestamptz,
  primary key (boss_id, user_id)
);

-- Was in der Crew passiert (für die Live-Liste): gruendung, beitritt, austritt,
-- stupser, treffer, flamme, sieg.
create table if not exists public.lern_crew_ereignis (
  id          bigint generated always as identity primary key,
  crew_id     uuid not null references public.lern_crew(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  ziel        uuid references auth.users(id) on delete cascade,
  art         text not null,
  wert        integer not null default 0,
  richtig     integer not null default 0,
  falsch      integer not null default 0,
  erstellt_am timestamptz not null default now()
);
create index if not exists lern_crew_ereignis_crew on public.lern_crew_ereignis (crew_id, erstellt_am desc);

-- Push-Token (Expo) für Anstupsen, Einladungen und Boss-Sieg.
create table if not exists public.lern_push (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  token           text not null,
  aktualisiert_am timestamptz not null default now()
);

alter table public.lern_crew enable row level security;
alter table public.lern_crew_mitglied enable row level security;
alter table public.lern_crew_einladung enable row level security;
alter table public.lern_crew_boss enable row level security;
alter table public.lern_crew_belohnung enable row level security;
alter table public.lern_crew_ereignis enable row level security;
alter table public.lern_push enable row level security;

-- Push-Mitteilungen verschickt die Datenbank selbst (Erweiterung pg_net).
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net nicht verfügbar – Crew funktioniert, nur ohne Push-Mitteilungen.';
end $$;

-- b) Hilfen – im eigenen Schema lern_intern, das die App nicht erreicht ------
-- (so bleiben sie gesperrt, auch wenn später Rechte für alle lern_-Funktionen
-- in public neu vergeben werden).
create schema if not exists lern_intern;
revoke all on schema lern_intern from public, anon, authenticated;

create or replace function lern_intern.heute()
returns date
language sql stable
as $$ select (now() at time zone 'Europe/Berlin')::date $$;

-- Tagesziel aus dem gesicherten Lernstand (5–200, sonst 30).
create or replace function lern_intern.tagesziel(p_daten jsonb)
returns integer
language sql immutable
as $$
  select case
           when coalesce(p_daten->>'tagesziel', '') ~ '^[0-9]{1,4}$' then greatest(5, least(200, (p_daten->>'tagesziel')::integer))
           else 30
         end
$$;

create or replace function lern_intern.anzeigename(p_id uuid)
returns text
language sql stable security definer set search_path = public
as $$ select coalesce(nullif(btrim(name), ''), benutzername) from public.lern_profil where id = p_id $$;

create or replace function lern_intern.crew_code_neu()
returns text
language plpgsql
as $$
declare
  v_zeichen text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_zeichen, 1 + floor(random() * length(v_zeichen))::integer, 1);
    end loop;
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    exit when not exists (select 1 from public.lern_crew where code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Push an mehrere Personen (Expo Push-Dienst). Ohne pg_net passiert nichts.
create or replace function lern_intern.push_senden(p_an uuid[], p_titel text, p_text text, p_ziel text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_nachrichten jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', token, 'title', p_titel, 'body', p_text, 'sound', 'default',
           'data', jsonb_build_object('url', p_ziel)))
    into v_nachrichten
    from public.lern_push
   where user_id = any(p_an);
  if v_nachrichten is null then return; end if;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using 'https://exp.host/--/api/v2/push/send', v_nachrichten,
            '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb;
  exception when others then
    null; -- Push ist ein Zusatz; ohne pg_net oder bei Fehlern läuft alles andere weiter.
  end;
end;
$$;

-- Crew-Flamme: zählt den heutigen Tag, sobald alle Mitglieder ihr Tagesziel haben.
create or replace function lern_intern.crew_flamme_pruefen(p_crew uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_heute date := lern_intern.heute();
  v_crew  public.lern_crew;
  v_neu   integer;
begin
  select * into v_crew from public.lern_crew where id = p_crew for update;
  if not found or v_crew.flamme_tag = v_heute then return; end if;
  if exists (
    select 1
      from public.lern_crew_mitglied m
      join public.lern_profil p on p.id = m.user_id
      left join public.lern_sync s on s.user_id = m.user_id
     where m.crew_id = p_crew
       and not (p.xp_tag = v_heute and p.fragen_heute >= lern_intern.tagesziel(s.daten))
  ) then
    return;
  end if;
  v_neu := case when v_crew.flamme_tag = v_heute - 1 then v_crew.flamme + 1 else 1 end;
  update public.lern_crew
     set flamme = v_neu, flamme_tag = v_heute, flamme_beste = greatest(flamme_beste, v_neu)
   where id = p_crew;
  insert into public.lern_crew_ereignis (crew_id, art, wert) values (p_crew, 'flamme', v_neu);
end;
$$;

-- Boss der laufenden Woche holen oder anlegen: das schwächste Thema der Crew
-- (letzte 60 Tage, Themen ohne Antworten zählen als unsicher), nicht dasselbe wie letzte Woche.
create or replace function lern_intern.crew_boss_sichern(p_crew uuid)
returns public.lern_crew_boss
language plpgsql security definer set search_path = public
as $$
declare
  v_woche   date := (date_trunc('week', now() at time zone 'Europe/Berlin'))::date;
  v_boss    public.lern_crew_boss;
  v_thema   text;
  v_letztes text;
  v_hp      integer;
begin
  select * into v_boss from public.lern_crew_boss where crew_id = p_crew and woche = v_woche;
  if found then return v_boss; end if;

  select thema into v_letztes from public.lern_crew_boss where crew_id = p_crew order by woche desc limit 1;

  with themen(thema) as (
    values ('gefahren'), ('vorfahrt'), ('zeichen'), ('umwelt'), ('technik'), ('manoever'),
           ('tempo'), ('parken'), ('autobahn'), ('mensch'), ('zahlen')
  ),
  werte as (
    select t.key as thema,
           sum(case when (t.value->>0) ~ '^[0-9]{1,6}$' then (t.value->>0)::integer else 0 end) as richtig,
           sum(case when (t.value->>1) ~ '^[0-9]{1,6}$' then (t.value->>1)::integer else 0 end) as falsch
      from public.lern_crew_mitglied m
      join public.lern_sync s on s.user_id = m.user_id
      cross join lateral jsonb_each(case when jsonb_typeof(s.daten->'themaTage') = 'object' then s.daten->'themaTage' else '{}'::jsonb end) as d(tag, inhalt)
      cross join lateral jsonb_each(case when jsonb_typeof(d.inhalt) = 'object' then d.inhalt else '{}'::jsonb end) as t(key, value)
     where m.crew_id = p_crew
       and d.tag >= to_char(v_woche - 60, 'YYYY-MM-DD')
       and jsonb_typeof(t.value) = 'array'
     group by t.key
  )
  select th.thema into v_thema
    from themen th
    left join werte w on w.thema = th.thema
   where th.thema is distinct from v_letztes
   order by (coalesce(w.richtig, 0) + 1)::numeric / (coalesce(w.richtig, 0) + coalesce(w.falsch, 0) + 2), random()
   limit 1;

  select greatest(160, 80 * count(*)) into v_hp from public.lern_crew_mitglied where crew_id = p_crew;

  insert into public.lern_crew_boss (crew_id, woche, thema, hp_max, hp)
  values (p_crew, v_woche, coalesce(v_thema, 'vorfahrt'), v_hp, v_hp)
  on conflict (crew_id, woche) do nothing
  returning * into v_boss;
  if v_boss.id is null then
    select * into v_boss from public.lern_crew_boss where crew_id = p_crew and woche = v_woche;
  end if;
  return v_boss;
end;
$$;

-- Jemanden aufnehmen (nach Code oder angenommener Einladung).
create or replace function lern_intern.crew_aufnehmen(p_crew uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_andere uuid[];
begin
  perform 1 from public.lern_crew where id = p_crew for update;
  if not found then raise exception 'Diese Crew gibt es nicht mehr.'; end if;
  if exists (select 1 from public.lern_crew_mitglied where user_id = p_user) then
    raise exception 'Du bist schon in einer Crew – verlasse sie zuerst.';
  end if;
  if (select count(*) from public.lern_crew_mitglied where crew_id = p_crew) >= 6 then
    raise exception 'Diese Crew ist schon voll (6 Leute).';
  end if;
  select array_agg(user_id) into v_andere from public.lern_crew_mitglied where crew_id = p_crew;
  insert into public.lern_crew_mitglied (crew_id, user_id) values (p_crew, p_user);
  delete from public.lern_crew_einladung where an = p_user;
  insert into public.lern_crew_ereignis (crew_id, user_id, art) values (p_crew, p_user, 'beitritt');
  perform lern_intern.push_senden(v_andere, 'Neu in deiner Crew', lern_intern.anzeigename(p_user) || ' ist jetzt dabei. Zusammen lernt es sich leichter!', '/crew');
end;
$$;

-- c) Für die App -----------------------------------------------------------

-- Alles für Home, Crew- und Boss-Seite in einem Aufruf.
create or replace function public.lern_crew_laden()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich   uuid := auth.uid();
  v_crew  uuid;
  v_heute date := lern_intern.heute();
  v_boss  public.lern_crew_boss;
  v_daten jsonb;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select crew_id into v_crew from public.lern_crew_mitglied where user_id = v_ich;

  if v_crew is null then
    return jsonb_build_object(
      'crew', null,
      'einladungen', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', e.id,
                 'crew_name', c.name,
                 'von_name', lern_intern.anzeigename(e.von),
                 'von_bild', p.bild_pfad,
                 'von_farbe', p.avatar_farbe,
                 'mitglieder', (select count(*) from public.lern_crew_mitglied x where x.crew_id = c.id))
               order by e.erstellt_am desc)
          from public.lern_crew_einladung e
          join public.lern_crew c on c.id = e.crew_id
          join public.lern_profil p on p.id = e.von
         where e.an = v_ich), '[]'::jsonb));
  end if;

  perform lern_intern.crew_flamme_pruefen(v_crew);
  v_boss := lern_intern.crew_boss_sichern(v_crew);
  delete from public.lern_crew_ereignis where crew_id = v_crew and erstellt_am < now() - interval '30 days';

  select jsonb_build_object(
    'crew', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'code', c.code,
      'flamme', case when c.flamme_tag >= v_heute - 1 then c.flamme else 0 end,
      'flamme_heute', coalesce(c.flamme_tag = v_heute, false),
      'flamme_beste', c.flamme_beste,
      'gruender', c.erstellt_von = v_ich),
    'mitglieder', (
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'name', coalesce(nullif(btrim(p.name), ''), p.benutzername),
               'benutzername', p.benutzername,
               'bild', p.bild_pfad,
               'farbe', p.avatar_farbe,
               'heute', case when p.xp_tag = v_heute then p.fragen_heute else 0 end,
               'ziel', lern_intern.tagesziel(s.daten),
               'ich', p.id = v_ich,
               -- Schaden am Boss dieser Woche (Treffer minus Heilung)
               'schaden', coalesce((
                 select sum(e.wert)
                   from public.lern_crew_ereignis e
                  where e.crew_id = c.id and e.user_id = p.id and e.art = 'treffer'
                    and e.erstellt_am >= (v_boss.woche::timestamp at time zone 'Europe/Berlin')), 0))
             order by m.beigetreten_am)
        from public.lern_crew_mitglied m
        join public.lern_profil p on p.id = m.user_id
        left join public.lern_sync s on s.user_id = m.user_id
       where m.crew_id = c.id),
    'boss', jsonb_build_object(
      'id', v_boss.id,
      'thema', v_boss.thema,
      'hp', v_boss.hp,
      'hp_max', v_boss.hp_max,
      'woche', v_boss.woche,
      'bis', v_boss.woche + 7,
      'besiegt', v_boss.besiegt_am is not null),
    'ereignisse', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.zeit desc)
        from (
          select e.id, e.art, e.wert, e.richtig, e.falsch, e.erstellt_am as zeit, e.user_id,
                 lern_intern.anzeigename(e.user_id) as name,
                 p.bild_pfad as bild, p.avatar_farbe as farbe,
                 coalesce(e.ziel = v_ich, false) as an_mich,
                 lern_intern.anzeigename(e.ziel) as ziel_name
            from public.lern_crew_ereignis e
            left join public.lern_profil p on p.id = e.user_id
           where e.crew_id = c.id
           order by e.erstellt_am desc
           limit 30
        ) x), '[]'::jsonb),
    'stupser', (
      select jsonb_build_object('von', lern_intern.anzeigename(e.user_id), 'zeit', e.erstellt_am)
        from public.lern_crew_ereignis e
       where e.crew_id = c.id and e.art = 'stupser' and e.ziel = v_ich and e.erstellt_am > now() - interval '12 hours'
       order by e.erstellt_am desc
       limit 1),
    'belohnungen', (select count(*) from public.lern_crew_belohnung b where b.user_id = v_ich and b.abgeholt_am is null)
  )
    into v_daten
    from public.lern_crew c
   where c.id = v_crew;
  return v_daten;
end;
$$;

create or replace function public.lern_crew_gruenden(p_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if exists (select 1 from public.lern_crew_mitglied where user_id = v_ich) then
    raise exception 'Du bist schon in einer Crew – verlasse sie zuerst.';
  end if;
  perform public.lern_limit_pruefen('crew_gruenden', 5, interval '1 day');
  insert into public.lern_crew (name, code, erstellt_von)
  values (coalesce(nullif(left(btrim(coalesce(p_name, '')), 30), ''), 'Meine Crew'), lern_intern.crew_code_neu(), v_ich)
  returning id into v_crew;
  insert into public.lern_crew_mitglied (crew_id, user_id) values (v_crew, v_ich);
  delete from public.lern_crew_einladung where an = v_ich;
  insert into public.lern_crew_ereignis (crew_id, user_id, art) values (v_crew, v_ich, 'gruendung');
  return public.lern_crew_laden();
end;
$$;

-- Beitreten per Code (mit oder ohne Bindestrich, egal ob groß oder klein).
create or replace function public.lern_crew_beitreten(p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_roh  text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('crew_beitreten', 10, interval '10 minutes');
  if length(v_roh) = 8 then
    select id into v_crew from public.lern_crew where code = substr(v_roh, 1, 4) || '-' || substr(v_roh, 5, 4);
  end if;
  if v_crew is null then raise exception 'Code ungültig – prüf ihn nochmal.'; end if;
  perform lern_intern.crew_aufnehmen(v_crew, v_ich);
  return public.lern_crew_laden();
end;
$$;

create or replace function public.lern_crew_verlassen()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.lern_crew_mitglied where user_id = v_ich returning crew_id into v_crew;
  if v_crew is null then return; end if;
  if not exists (select 1 from public.lern_crew_mitglied where crew_id = v_crew) then
    delete from public.lern_crew where id = v_crew;
  else
    insert into public.lern_crew_ereignis (crew_id, user_id, art) values (v_crew, v_ich, 'austritt');
    perform lern_intern.crew_flamme_pruefen(v_crew);
  end if;
end;
$$;

-- Jemanden einladen (z. B. aus seinem Profil); er sieht die Einladung auf Home.
create or replace function public.lern_crew_einladen(p_an uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew public.lern_crew;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select c.* into v_crew
    from public.lern_crew_mitglied m join public.lern_crew c on c.id = m.crew_id
   where m.user_id = v_ich;
  if v_crew.id is null then raise exception 'Gründe zuerst eine Crew.'; end if;
  if p_an is null or p_an = v_ich or not exists (select 1 from public.lern_profil where id = p_an) then
    raise exception 'Diese Person gibt es nicht.';
  end if;
  if exists (select 1 from public.lern_crew_mitglied where user_id = p_an and crew_id = v_crew.id) then
    raise exception 'Ist schon in deiner Crew.';
  end if;
  if (select count(*) from public.lern_crew_mitglied where crew_id = v_crew.id) >= 6 then
    raise exception 'Deine Crew ist schon voll (6 Leute).';
  end if;
  perform public.lern_limit_pruefen('crew_einladen', 20, interval '1 day');
  insert into public.lern_crew_einladung (crew_id, von, an) values (v_crew.id, v_ich, p_an)
  on conflict (crew_id, an) do update set von = excluded.von, erstellt_am = now();
  perform lern_intern.push_senden(array[p_an], 'Einladung in eine Crew',
    lern_intern.anzeigename(v_ich) || ' lädt dich in die Crew „' || v_crew.name || '“ ein.', '/crew');
end;
$$;

create or replace function public.lern_crew_einladung_antworten(p_id uuid, p_annehmen boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_e   public.lern_crew_einladung;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.lern_crew_einladung where id = p_id and an = v_ich returning * into v_e;
  if v_e.id is null then raise exception 'Diese Einladung gibt es nicht mehr.'; end if;
  if coalesce(p_annehmen, false) then
    perform lern_intern.crew_aufnehmen(v_e.crew_id, v_ich);
  end if;
  return public.lern_crew_laden();
end;
$$;

-- Anstupsen: höchstens einmal in 3 Stunden je Person.
create or replace function public.lern_crew_stupsen(p_ziel uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_ziel = v_ich then raise exception 'Dich selbst kannst du nicht anstupsen.'; end if;
  select crew_id into v_crew from public.lern_crew_mitglied where user_id = v_ich;
  if v_crew is null or not exists (select 1 from public.lern_crew_mitglied where user_id = p_ziel and crew_id = v_crew) then
    raise exception 'Diese Person ist nicht in deiner Crew.';
  end if;
  if exists (select 1 from public.lern_crew_ereignis
              where art = 'stupser' and user_id = v_ich and ziel = p_ziel and erstellt_am > now() - interval '3 hours') then
    raise exception 'Schon angestupst – in ein paar Stunden geht es wieder.';
  end if;
  insert into public.lern_crew_ereignis (crew_id, user_id, ziel, art) values (v_crew, v_ich, p_ziel, 'stupser');
  perform lern_intern.push_senden(array[p_ziel], lern_intern.anzeigename(v_ich) || ' hat dich angestupst',
    'Die Crew-Flamme wartet auf dich – mach heute dein Tagesziel.', '/crew');
end;
$$;

-- Antworten im Boss-Thema: richtig = 5 Schaden, falsch heilt ihn um 3.
-- Je Aufruf höchstens 30 und je Tag höchstens 200 gewertete Antworten.
create or replace function public.lern_crew_treffer(p_thema text, p_richtig integer, p_falsch integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_crew   uuid;
  v_boss   public.lern_crew_boss;
  v_r      integer := greatest(0, least(coalesce(p_richtig, 0), 30));
  v_f      integer := greatest(0, least(coalesce(p_falsch, 0), 30));
  v_heute  integer;
  v_delta  integer;
  v_alle   uuid[];
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select crew_id into v_crew from public.lern_crew_mitglied where user_id = v_ich;
  if v_crew is null then return null; end if;
  v_boss := lern_intern.crew_boss_sichern(v_crew);
  if v_boss.thema is distinct from p_thema or v_boss.besiegt_am is not null or v_r + v_f = 0 then
    return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', v_boss.besiegt_am is not null, 'schaden', 0);
  end if;

  select coalesce(sum(richtig + falsch), 0) into v_heute
    from public.lern_crew_ereignis
   where user_id = v_ich and art = 'treffer'
     and erstellt_am >= (lern_intern.heute()::timestamp at time zone 'Europe/Berlin');
  if v_heute >= 200 then
    return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', false, 'schaden', 0);
  end if;
  if v_heute + v_r + v_f > 200 then
    v_r := least(v_r, 200 - v_heute);
    v_f := least(v_f, 200 - v_heute - v_r);
  end if;

  v_delta := 5 * v_r - 3 * v_f;
  update public.lern_crew_boss
     set hp = greatest(0, least(hp_max, hp - v_delta)),
         besiegt_am = case when hp - v_delta <= 0 then now() else null end
   where id = v_boss.id and besiegt_am is null
  returning * into v_boss;
  if v_boss.id is null then
    select * into v_boss from public.lern_crew_boss where crew_id = v_crew order by woche desc limit 1;
    return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', true, 'schaden', 0);
  end if;

  insert into public.lern_crew_ereignis (crew_id, user_id, art, wert, richtig, falsch)
  values (v_crew, v_ich, 'treffer', v_delta, v_r, v_f);

  -- Gerade besiegt: Belohnung für alle, die jetzt in der Crew sind.
  if v_boss.besiegt_am is not null then
    insert into public.lern_crew_ereignis (crew_id, user_id, art, wert) values (v_crew, v_ich, 'sieg', v_boss.hp_max);
    insert into public.lern_crew_belohnung (boss_id, user_id)
    select v_boss.id, m.user_id from public.lern_crew_mitglied m where m.crew_id = v_crew
    on conflict do nothing;
    select array_agg(user_id) into v_alle from public.lern_crew_mitglied where crew_id = v_crew and user_id <> v_ich;
    perform lern_intern.push_senden(v_alle, 'Boss besiegt!',
      lern_intern.anzeigename(v_ich) || ' hat den letzten Treffer gelandet. Hol dir deine XP-Truhe ab!', '/crew-boss');
  end if;

  return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', v_boss.besiegt_am is not null, 'schaden', v_delta);
end;
$$;

-- Belohnungen für besiegte Bosse abholen (die App schreibt die XP gut).
create or replace function public.lern_crew_belohnungen_abholen()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_ergebnis jsonb;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  with abgeholt as (
    update public.lern_crew_belohnung b
       set abgeholt_am = now()
     where b.user_id = v_ich and b.abgeholt_am is null
    returning b.boss_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('thema', x.thema, 'woche', x.woche)), '[]'::jsonb)
    into v_ergebnis
    from public.lern_crew_boss x
   where x.id in (select boss_id from abgeholt);
  return v_ergebnis;
end;
$$;

-- Push-Token speichern (leer oder ungültig = löschen).
create or replace function public.lern_push_token_setzen(p_token text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,}\]$' then
    delete from public.lern_push where user_id = v_ich;
    return;
  end if;
  insert into public.lern_push (user_id, token) values (v_ich, p_token)
  on conflict (user_id) do update set token = excluded.token, aktualisiert_am = now();
end;
$$;

-- d) Crew-Flamme nach jedem Lernen prüfen (beim Buchen der Fragen) ---------
create or replace function lern_intern.crew_nach_lernen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  begin
    perform lern_intern.crew_flamme_pruefen(m.crew_id) from public.lern_crew_mitglied m where m.user_id = new.id;
  exception when others then
    null; -- Die Crew darf das Buchen der Fragen nie verhindern.
  end;
  return new;
end;
$$;

drop trigger if exists lern_crew_nach_lernen on public.lern_profil;
create trigger lern_crew_nach_lernen
  after update of fragen_heute, xp_tag on public.lern_profil
  for each row
  when (new.fragen_heute is distinct from old.fragen_heute or new.xp_tag is distinct from old.xp_tag)
  execute function lern_intern.crew_nach_lernen();

-- e) Rechte ------------------------------------------------------------------
-- Hilfen: nur für die Funktionen oben, nicht für die App.
revoke execute on all functions in schema lern_intern from public, anon, authenticated;

-- Für angemeldete Nutzer der App.
revoke execute on function public.lern_crew_laden() from public, anon;
revoke execute on function public.lern_crew_gruenden(text) from public, anon;
revoke execute on function public.lern_crew_beitreten(text) from public, anon;
revoke execute on function public.lern_crew_verlassen() from public, anon;
revoke execute on function public.lern_crew_einladen(uuid) from public, anon;
revoke execute on function public.lern_crew_einladung_antworten(uuid, boolean) from public, anon;
revoke execute on function public.lern_crew_stupsen(uuid) from public, anon;
revoke execute on function public.lern_crew_treffer(text, integer, integer) from public, anon;
revoke execute on function public.lern_crew_belohnungen_abholen() from public, anon;
revoke execute on function public.lern_push_token_setzen(text) from public, anon;
grant execute on function public.lern_crew_laden() to authenticated;
grant execute on function public.lern_crew_gruenden(text) to authenticated;
grant execute on function public.lern_crew_beitreten(text) to authenticated;
grant execute on function public.lern_crew_verlassen() to authenticated;
grant execute on function public.lern_crew_einladen(uuid) to authenticated;
grant execute on function public.lern_crew_einladung_antworten(uuid, boolean) to authenticated;
grant execute on function public.lern_crew_stupsen(uuid) to authenticated;
grant execute on function public.lern_crew_treffer(text, integer, integer) to authenticated;
grant execute on function public.lern_crew_belohnungen_abholen() to authenticated;
grant execute on function public.lern_push_token_setzen(text) to authenticated;

-- 17) Live-Stream: nur der Inhaber geht live -------------------------------
-- Der Inhaber der App (E-Mail in lern_inhaber) sendet aus der App, alle
-- anderen schauen in Clips zu. Bild und Ton laufen über LiveKit (die Edge
-- Function live-token gibt die Zugänge aus), Status und Chat über Supabase.
-- Wer zugestimmt hat, bekommt beim Start eine Push-Mitteilung.

create table if not exists public.lern_live (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null default '' check (char_length(titel) <= 80),
  raum          text not null unique,
  status        text not null default 'vorbereitung' check (status in ('vorbereitung', 'live', 'beendet')),
  erstellt_am   timestamptz not null default now(),
  gestartet_am  timestamptz,
  beendet_am    timestamptz,
  puls_am       timestamptz not null default now(),
  zuschauer_max integer not null default 0
);
create index if not exists lern_live_status_idx on public.lern_live (status, erstellt_am desc);

create table if not exists public.lern_live_chat (
  id          bigint generated always as identity primary key,
  live_id     uuid not null references public.lern_live(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default '',
  bild_pfad   text,
  text        text not null default '',
  erstellt_am timestamptz not null default now(),
  geloescht   boolean not null default false,
  constraint lern_live_chat_text check (geloescht or char_length(text) between 1 and 200)
);
create index if not exists lern_live_chat_idx on public.lern_live_chat (live_id, id desc);

-- Wer im Live-Chat nicht mehr schreiben darf (setzt der Inhaber).
create table if not exists public.lern_live_stumm (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seit    timestamptz not null default now()
);

-- Wer beim Start eines Lives eine Mitteilung bekommen möchte.
create table if not exists public.lern_live_abo (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seit    timestamptz not null default now()
);

-- Gemeldete Chat-Nachrichten (sieht nur der Inhaber im Supabase-Dashboard).
create table if not exists public.lern_live_meldung (
  id          uuid primary key default gen_random_uuid(),
  chat_id     bigint not null references public.lern_live_chat(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  grund       text not null default '',
  erstellt_am timestamptz not null default now(),
  unique (chat_id, user_id)
);

alter table public.lern_live enable row level security;
alter table public.lern_live_chat enable row level security;
alter table public.lern_live_stumm enable row level security;
alter table public.lern_live_abo enable row level security;
alter table public.lern_live_meldung enable row level security;

-- Lesen dürfen alle (auch Gäste) – aber nichts aus der Vorbereitung. Schreiben
-- nur über die Funktionen unten. Stumm, Abo und Meldungen: keine Policies.
drop policy if exists lern_live_lesen on public.lern_live;
create policy lern_live_lesen on public.lern_live
  for select to anon, authenticated using (status <> 'vorbereitung');
drop policy if exists lern_live_chat_lesen on public.lern_live_chat;
create policy lern_live_chat_lesen on public.lern_live_chat
  for select to anon, authenticated
  using (exists (select 1 from public.lern_live l where l.id = live_id and l.status <> 'vorbereitung'));
grant select on public.lern_live, public.lern_live_chat to anon, authenticated;

-- Änderungen in Echtzeit an die App (Supabase Realtime).
do $$
declare
  v_tabelle text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_tabelle in array array['lern_live', 'lern_live_chat'] loop
      if not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_tabelle) then
        execute format('alter publication supabase_realtime add table public.%I', v_tabelle);
      end if;
    end loop;
  end if;
end $$;

-- Grobe Schimpfwörter blocken (den Rest moderiert der Inhaber).
create or replace function lern_intern.live_grob(p_text text)
returns boolean
language sql immutable
as $$
  select lower(p_text) ~ '(hurens(o|ö)hn|wichser|fotze|missgeburt|\mspast|schlampe|\mnutte|arschloch|\mfick|\mhure\M|schwuchtel|\mneger|kanake|sieg heil|heil hitler)'
$$;

-- Push an alle mit Abo, in Paketen zu 100 (Grenze des Expo-Push-Dienstes).
create or replace function lern_intern.live_push(p_titel text, p_text text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_paket jsonb;
begin
  for v_paket in
    select jsonb_agg(jsonb_build_object(
             'to', t.token, 'title', p_titel, 'body', p_text, 'sound', 'default',
             'data', jsonb_build_object('url', '/live')))
      from (select pu.token, (row_number() over (order by pu.user_id) - 1) / 100 as paket
              from public.lern_live_abo a
              join public.lern_push pu on pu.user_id = a.user_id
             where a.user_id is distinct from auth.uid()) t
     group by t.paket
  loop
    begin
      execute 'select net.http_post(url := $1, body := $2, headers := $3)'
        using 'https://exp.host/--/api/v2/push/send', v_paket,
              '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb;
    exception when others then
      null; -- Push ist ein Zusatz; ohne pg_net läuft das Live trotzdem.
    end;
  end loop;
end;
$$;

-- Läuft gerade ein Live? Für alle, auch Gäste. Ohne Lebenszeichen der App des
-- Inhabers seit 2 Minuten gilt es als beendet (z. B. Akku leer).
create or replace function public.lern_live_aktuell()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'id', l.id,
           'titel', l.titel,
           'gestartet_am', l.gestartet_am,
           'gastgeber', (
             select jsonb_build_object(
                      'id', p.id,
                      'name', coalesce(nullif(btrim(p.name), ''), p.benutzername),
                      'bild_pfad', p.bild_pfad,
                      'avatar_farbe', p.avatar_farbe)
               from public.lern_inhaber i
               join auth.users u on lower(u.email) = lower(i.email)
               join public.lern_profil p on p.id = u.id
              order by p.created_at
              limit 1))
    from public.lern_live l
   where l.status = 'live'
     and l.puls_am > now() - interval '2 minutes'
   order by l.gestartet_am desc
   limit 1
$$;

-- Inhaber: neues Live vorbereiten (noch unsichtbar, Kamera läuft schon).
create or replace function public.lern_live_vorbereiten(p_titel text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_live public.lern_live;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  update public.lern_live set status = 'beendet', beendet_am = now() where status <> 'beendet';
  insert into public.lern_live (titel, raum)
  values (left(btrim(coalesce(p_titel, '')), 80), 'live-' || replace(gen_random_uuid()::text, '-', ''))
  returning * into v_live;
  return jsonb_build_object('id', v_live.id, 'raum', v_live.raum);
end;
$$;

-- Inhaber: Live für alle sichtbar machen und Abonnenten benachrichtigen.
create or replace function public.lern_live_freigeben(p_live uuid, p_titel text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_live public.lern_live;
  v_name text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  update public.lern_live
     set status = 'live',
         titel = left(btrim(coalesce(p_titel, titel)), 80),
         gestartet_am = now(),
         puls_am = now()
   where id = p_live and status = 'vorbereitung'
  returning * into v_live;
  if not found then return; end if; -- schon live oder beendet: keine zweite Mitteilung
  select coalesce(nullif(btrim(p.name), ''), p.benutzername) into v_name
    from public.lern_profil p where p.id = auth.uid();
  perform lern_intern.live_push(
    '🔴 ' || coalesce(v_name, 'Fahrschul Pro') || ' ist jetzt live',
    coalesce(nullif(v_live.titel, ''), 'Komm rein und stell deine Fragen!'));
end;
$$;

-- Inhaber: Lebenszeichen alle 30 Sekunden, dazu die Zahl der Zuschauer.
create or replace function public.lern_live_puls(p_live uuid, p_zuschauer integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  update public.lern_live
     set puls_am = now(),
         zuschauer_max = greatest(zuschauer_max, least(coalesce(p_zuschauer, 0), 1000000))
   where id = p_live and status <> 'beendet';
end;
$$;

-- Inhaber: Live beenden.
create or replace function public.lern_live_beenden(p_live uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  update public.lern_live set status = 'beendet', beendet_am = now()
   where id = p_live and status <> 'beendet';
end;
$$;

-- Im Live-Chat schreiben (angemeldet, nicht stummgeschaltet, ohne Links).
create or replace function public.lern_live_schreiben(p_live uuid, p_text text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_text text := left(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')), 200);
  v_id   bigint;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if v_text = '' then return null; end if;
  if not exists (select 1 from public.lern_live where id = p_live and status = 'live') then
    raise exception 'Das Live ist vorbei.';
  end if;
  if exists (select 1 from public.lern_live_stumm where user_id = v_ich) then
    raise exception 'Du kannst im Live-Chat gerade nicht schreiben.';
  end if;
  if v_text ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|de|net|org|io|ly|gg|me|info|app)\M)' then
    raise exception 'Links sind im Live-Chat nicht erlaubt.';
  end if;
  if lern_intern.live_grob(v_text) then raise exception 'Bitte bleib freundlich.'; end if;
  if not public.lern_ist_inhaber() then
    perform public.lern_limit_pruefen('live_chat_kurz', 1, interval '2 seconds');
    perform public.lern_limit_pruefen('live_chat', 12, interval '1 minute');
  end if;
  insert into public.lern_live_chat (live_id, user_id, name, bild_pfad, text)
  select p_live, v_ich, coalesce(nullif(btrim(p.name), ''), p.benutzername), p.bild_pfad, v_text
    from public.lern_profil p
   where p.id = v_ich
  returning id into v_id;
  return v_id;
end;
$$;

-- Nachricht entfernen: eigene oder (Inhaber) jede.
create or replace function public.lern_live_loeschen(p_nachricht bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  update public.lern_live_chat
     set geloescht = true, text = ''
   where id = p_nachricht
     and not geloescht
     and (user_id = auth.uid() or public.lern_ist_inhaber());
end;
$$;

-- Inhaber: jemanden im Live-Chat stummschalten (seine Nachrichten verschwinden)
-- oder wieder freigeben.
create or replace function public.lern_live_stummschalten(p_nutzer uuid, p_stumm boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if p_stumm then
    insert into public.lern_live_stumm (user_id) values (p_nutzer) on conflict do nothing;
    update public.lern_live_chat set geloescht = true, text = ''
     where user_id = p_nutzer and not geloescht
       and live_id in (select id from public.lern_live where status <> 'beendet');
  else
    delete from public.lern_live_stumm where user_id = p_nutzer;
  end if;
end;
$$;

-- Nachricht melden.
create or replace function public.lern_live_melden(p_nachricht bigint, p_grund text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  insert into public.lern_live_meldung (chat_id, user_id, grund)
  values (p_nachricht, auth.uid(), left(coalesce(p_grund, ''), 200))
  on conflict (chat_id, user_id) do nothing;
end;
$$;

-- Mitteilung beim Live-Start an/aus.
create or replace function public.lern_live_abo_setzen(p_an boolean)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_an then
    insert into public.lern_live_abo (user_id) values (auth.uid()) on conflict do nothing;
  else
    delete from public.lern_live_abo where user_id = auth.uid();
  end if;
  return p_an;
end;
$$;

create or replace function public.lern_live_abo_status()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.lern_live_abo where user_id = auth.uid()) $$;

-- Rechte ---------------------------------------------------------------------
revoke execute on function lern_intern.live_grob(text) from public, anon, authenticated;
revoke execute on function lern_intern.live_push(text, text) from public, anon, authenticated;

revoke execute on function public.lern_live_aktuell() from public;
revoke execute on function public.lern_live_vorbereiten(text) from public, anon;
revoke execute on function public.lern_live_freigeben(uuid, text) from public, anon;
revoke execute on function public.lern_live_puls(uuid, integer) from public, anon;
revoke execute on function public.lern_live_beenden(uuid) from public, anon;
revoke execute on function public.lern_live_schreiben(uuid, text) from public, anon;
revoke execute on function public.lern_live_loeschen(bigint) from public, anon;
revoke execute on function public.lern_live_stummschalten(uuid, boolean) from public, anon;
revoke execute on function public.lern_live_melden(bigint, text) from public, anon;
revoke execute on function public.lern_live_abo_setzen(boolean) from public, anon;
revoke execute on function public.lern_live_abo_status() from public, anon;

grant execute on function public.lern_live_aktuell() to anon, authenticated;
grant execute on function public.lern_live_vorbereiten(text) to authenticated;
grant execute on function public.lern_live_freigeben(uuid, text) to authenticated;
grant execute on function public.lern_live_puls(uuid, integer) to authenticated;
grant execute on function public.lern_live_beenden(uuid) to authenticated;
grant execute on function public.lern_live_schreiben(uuid, text) to authenticated;
grant execute on function public.lern_live_loeschen(bigint) to authenticated;
grant execute on function public.lern_live_stummschalten(uuid, boolean) to authenticated;
grant execute on function public.lern_live_melden(bigint, text) to authenticated;
grant execute on function public.lern_live_abo_setzen(boolean) to authenticated;
grant execute on function public.lern_live_abo_status() to authenticated;

notify pgrst, 'reload schema';

-- 18) Live-Quiz: Prüfungsfragen im Live --------------------------------------
-- Der Inhaber blendet im Live eine Frage aus dem Katalog ein, alle Zuschauer
-- tippen ihre Antwort. Nach Ablauf der Zeit kommt die Auflösung mit Verteilung,
-- Punkten (schnell + richtig = mehr) und einer Rangliste über das ganze Live.

-- Eine eingeblendete Frage. Text und Antworten werden mitgespeichert, damit alle
-- dasselbe sehen – auch mit einer älteren App-Version. Lösung und Erklärung
-- kommen erst mit der Auflösung dazu.
create table if not exists public.lern_live_quiz (
  id           uuid primary key default gen_random_uuid(),
  live_id      uuid not null references public.lern_live(id) on delete cascade,
  nummer       integer not null default 1,
  frage_id     text not null check (char_length(frage_id) between 1 and 40),
  frage        text not null check (char_length(frage) between 1 and 500),
  bild         text check (char_length(bild) <= 40),
  thema        text not null default '' check (char_length(thema) <= 40),
  antworten    text[] not null check (cardinality(antworten) between 2 and 6),
  reihenfolge  smallint[] not null,
  dauer        smallint not null default 20 check (dauer between 5 and 120),
  status       text not null default 'offen' check (status in ('offen', 'aufgeloest', 'rangliste', 'fertig')),
  gestartet_am timestamptz not null default now(),
  endet_am     timestamptz not null,
  richtig      smallint[],
  erklaerung   text not null default '' check (char_length(erklaerung) <= 1000),
  verteilung   integer[],
  teilnehmer   integer not null default 0,
  richtige     integer not null default 0,
  bestenliste  jsonb not null default '[]'::jsonb
);
create index if not exists lern_live_quiz_idx on public.lern_live_quiz (live_id, gestartet_am desc);

-- Eine Antwort je Person und Frage. Punkte gibt es erst bei der Auflösung.
create table if not exists public.lern_live_quiz_antwort (
  quiz_id     uuid not null references public.lern_live_quiz(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  auswahl     smallint[] not null,
  zeit_ms     integer not null,
  richtig     boolean,
  punkte      integer not null default 0,
  erstellt_am timestamptz not null default now(),
  primary key (quiz_id, user_id)
);
create index if not exists lern_live_quiz_antwort_user_idx on public.lern_live_quiz_antwort (user_id);

alter table public.lern_live_quiz enable row level security;
alter table public.lern_live_quiz_antwort enable row level security;

-- Fragen lesen dürfen alle (auch Gäste), solange das Live sichtbar ist.
-- Antworten: keine Policies – nur über die Funktionen unten.
drop policy if exists lern_live_quiz_lesen on public.lern_live_quiz;
create policy lern_live_quiz_lesen on public.lern_live_quiz
  for select to anon, authenticated
  using (exists (select 1 from public.lern_live l where l.id = live_id and l.status <> 'vorbereitung'));
grant select on public.lern_live_quiz to anon, authenticated;

-- Neue Fragen und Auflösungen in Echtzeit an die App.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lern_live_quiz') then
    alter publication supabase_realtime add table public.lern_live_quiz;
  end if;
end $$;

-- Endet das Live (auch durch ein neues), enden auch seine Fragen.
create or replace function lern_intern.live_quiz_schliessen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.lern_live_quiz set status = 'fertig' where live_id = new.id and status <> 'fertig';
  return new;
end;
$$;
drop trigger if exists lern_live_quiz_schliessen on public.lern_live;
create trigger lern_live_quiz_schliessen
  after update of status on public.lern_live
  for each row when (new.status = 'beendet' and old.status is distinct from 'beendet')
  execute function lern_intern.live_quiz_schliessen();

-- Wertung über alle aufgelösten Fragen eines Lives: Punkte, dann richtige
-- Antworten, dann Gesamtzeit der richtigen Antworten. Stummgeschaltete fehlen.
create or replace function lern_intern.live_quiz_wertung(p_live uuid)
returns table (user_id uuid, punkte integer, richtige integer, zeit bigint, platz integer, spieler integer)
language sql stable set search_path = public
as $$
  select t.user_id, t.punkte, t.richtige, t.zeit,
         (row_number() over (order by t.punkte desc, t.richtige desc, t.zeit, t.user_id))::integer,
         (count(*) over ())::integer
    from (select a.user_id,
                 sum(a.punkte)::integer as punkte,
                 (count(*) filter (where a.richtig))::integer as richtige,
                 coalesce(sum(a.zeit_ms) filter (where a.richtig), 0)::bigint as zeit
            from public.lern_live_quiz_antwort a
            join public.lern_live_quiz q on q.id = a.quiz_id
           where q.live_id = p_live
             and a.richtig is not null
             and not exists (select 1 from public.lern_live_stumm s where s.user_id = a.user_id)
           group by a.user_id) t
$$;

-- Die Besten mit Name und Profilbild (für die Anzeige im Live).
create or replace function lern_intern.live_quiz_bestenliste(p_live uuid, p_anzahl integer)
returns jsonb
language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', w.user_id,
           'name', coalesce(nullif(btrim(p.name), ''), p.benutzername),
           'bild_pfad', p.bild_pfad,
           'avatar_farbe', p.avatar_farbe,
           'punkte', w.punkte,
           'richtige', w.richtige,
           'platz', w.platz) order by w.platz), '[]'::jsonb)
    from lern_intern.live_quiz_wertung(p_live) w
    join public.lern_profil p on p.id = w.user_id
   where w.platz <= p_anzahl
$$;

-- Inhaber: Frage einblenden. Eine noch laufende Frage endet dabei ohne Wertung.
create or replace function public.lern_live_quiz_starten(
  p_live uuid, p_frage_id text, p_frage text, p_bild text, p_thema text,
  p_antworten text[], p_reihenfolge integer[], p_dauer integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_quiz  public.lern_live_quiz;
  v_n     integer := coalesce(cardinality(p_antworten), 0);
  v_dauer integer := least(greatest(coalesce(p_dauer, 20), 5), 120);
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if not exists (select 1 from public.lern_live where id = p_live and status = 'live') then
    raise exception 'Das Live läuft gerade nicht.';
  end if;
  if v_n not between 2 and 6
     or exists (select 1 from unnest(p_antworten) t where t is null or char_length(btrim(t)) not between 1 and 300) then
    raise exception 'Ungültige Antworten';
  end if;
  if p_reihenfolge is null or cardinality(p_reihenfolge) <> v_n
     or (select array_agg(x order by x) from unnest(p_reihenfolge) x) <> (select array_agg(i order by i) from generate_series(0, v_n - 1) i) then
    raise exception 'Ungültige Reihenfolge';
  end if;
  update public.lern_live_quiz set status = 'fertig' where live_id = p_live and status <> 'fertig';
  insert into public.lern_live_quiz (live_id, nummer, frage_id, frage, bild, thema, antworten, reihenfolge, dauer, endet_am)
  values (p_live,
          coalesce((select max(q.nummer) from public.lern_live_quiz q where q.live_id = p_live), 0) + 1,
          left(btrim(coalesce(p_frage_id, '')), 40),
          left(btrim(coalesce(p_frage, '')), 500),
          nullif(left(btrim(coalesce(p_bild, '')), 40), ''),
          left(btrim(coalesce(p_thema, '')), 40),
          (select array_agg(btrim(t) order by o) from unnest(p_antworten) with ordinality u(t, o)),
          p_reihenfolge::smallint[],
          v_dauer,
          now() + make_interval(secs => v_dauer))
  returning * into v_quiz;
  return to_jsonb(v_quiz) || jsonb_build_object('jetzt', now());
end;
$$;

-- Mitspielen: eine Antwort je Frage, solange die Zeit läuft (angemeldet und
-- nicht stummgeschaltet). Gilt die erste Antwort; zurück kommt die gespeicherte.
create or replace function public.lern_live_quiz_antworten(p_quiz uuid, p_auswahl integer[])
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_quiz public.lern_live_quiz;
  v_zeit integer;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  -- Teilsperre: Eine gleichzeitige Auflösung wartet, bis die Antwort drin ist.
  select q.* into v_quiz
    from public.lern_live_quiz q
    join public.lern_live l on l.id = q.live_id and l.status = 'live'
   where q.id = p_quiz
     for share of q;
  if not found or v_quiz.status <> 'offen' or now() > v_quiz.endet_am + interval '2 seconds' then
    raise exception 'Die Zeit für diese Frage ist um.';
  end if;
  if public.lern_ist_inhaber() then raise exception 'Als Gastgeber spielst du nicht mit.'; end if;
  if exists (select 1 from public.lern_live_stumm where user_id = v_ich) then
    raise exception 'Du kannst gerade nicht mitspielen.';
  end if;
  if p_auswahl is null or cardinality(p_auswahl) = 0
     or exists (select 1 from unnest(p_auswahl) x where x is null or x < 0 or x >= cardinality(v_quiz.antworten))
     or (select count(distinct x) from unnest(p_auswahl) x) <> cardinality(p_auswahl) then
    raise exception 'Ungültige Antwort';
  end if;
  v_zeit := least(greatest((extract(epoch from now() - v_quiz.gestartet_am) * 1000)::integer, 0), v_quiz.dauer * 1000);
  insert into public.lern_live_quiz_antwort (quiz_id, user_id, auswahl, zeit_ms)
  values (p_quiz, v_ich, (select array_agg(x order by x) from unnest(p_auswahl) x)::smallint[], v_zeit)
  on conflict (quiz_id, user_id) do nothing;
  return (select jsonb_build_object('auswahl', a.auswahl, 'zeit_ms', a.zeit_ms)
            from public.lern_live_quiz_antwort a
           where a.quiz_id = p_quiz and a.user_id = v_ich);
end;
$$;

-- Inhaber: Zwischenstand, solange die Zeit läuft (Stimmen je Antwort).
create or replace function public.lern_live_quiz_stand(p_quiz uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_quiz public.lern_live_quiz;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  select * into v_quiz from public.lern_live_quiz where id = p_quiz;
  if not found then return null; end if;
  return jsonb_build_object(
    'teilnehmer', (select count(*) from public.lern_live_quiz_antwort a where a.quiz_id = p_quiz),
    'verteilung', (select jsonb_agg((select count(*) from public.lern_live_quiz_antwort a
                                      where a.quiz_id = p_quiz and i::smallint = any(a.auswahl)) order by i)
                     from generate_series(0, cardinality(v_quiz.antworten) - 1) i));
end;
$$;

-- Inhaber: Auflösen. Richtig ist nur, wer genau die richtigen Antworten gewählt
-- hat (wie in der Prüfung). Punkte: 500 fürs Richtige plus bis zu 500 fürs Tempo.
create or replace function public.lern_live_quiz_aufloesen(p_quiz uuid, p_richtig integer[], p_erklaerung text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_quiz    public.lern_live_quiz;
  v_richtig smallint[];
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  select * into v_quiz from public.lern_live_quiz where id = p_quiz for update;
  if not found then raise exception 'Frage nicht gefunden'; end if;
  if v_quiz.status <> 'offen' then
    return to_jsonb(v_quiz) || jsonb_build_object('jetzt', now()); -- schon aufgelöst
  end if;
  if p_richtig is null or cardinality(p_richtig) = 0
     or exists (select 1 from unnest(p_richtig) x where x is null or x < 0 or x >= cardinality(v_quiz.antworten)) then
    raise exception 'Ungültige Lösung';
  end if;
  v_richtig := (select array_agg(distinct x order by x) from unnest(p_richtig) x)::smallint[];

  update public.lern_live_quiz_antwort a
     set richtig = (a.auswahl @> v_richtig and a.auswahl <@ v_richtig),
         punkte = case when a.auswahl @> v_richtig and a.auswahl <@ v_richtig
                       then 500 + round(500 * greatest(0, 1 - a.zeit_ms / (v_quiz.dauer * 1000.0)))::integer
                       else 0 end
   where a.quiz_id = p_quiz;

  update public.lern_live_quiz q
     set status = 'aufgeloest',
         richtig = v_richtig,
         erklaerung = left(btrim(coalesce(p_erklaerung, '')), 1000),
         endet_am = least(q.endet_am, now()),
         teilnehmer = (select count(*) from public.lern_live_quiz_antwort a where a.quiz_id = p_quiz),
         richtige = (select count(*) from public.lern_live_quiz_antwort a where a.quiz_id = p_quiz and a.richtig),
         verteilung = (select array_agg((select count(*) from public.lern_live_quiz_antwort a
                                          where a.quiz_id = p_quiz and i::smallint = any(a.auswahl))::integer order by i)
                         from generate_series(0, cardinality(q.antworten) - 1) i)
   where q.id = p_quiz;

  update public.lern_live_quiz q
     set bestenliste = lern_intern.live_quiz_bestenliste(q.live_id, 5)
   where q.id = p_quiz
  returning * into v_quiz;
  return to_jsonb(v_quiz) || jsonb_build_object('jetzt', now());
end;
$$;

-- Inhaber: Rangliste für alle zeigen ('rangliste') oder die Frage ausblenden
-- ('fertig' – eine noch laufende Frage endet dann ohne Wertung).
create or replace function public.lern_live_quiz_weiter(p_quiz uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_quiz public.lern_live_quiz;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if p_status is null or p_status not in ('rangliste', 'fertig') then raise exception 'Ungültiger Schritt'; end if;
  update public.lern_live_quiz q
     set status = p_status,
         bestenliste = case when p_status = 'rangliste' then lern_intern.live_quiz_bestenliste(q.live_id, 5) else q.bestenliste end
   where q.id = p_quiz
     and q.status <> 'fertig'
     and (p_status = 'fertig' or q.status in ('aufgeloest', 'rangliste'))
  returning * into v_quiz;
  if not found then
    select * into v_quiz from public.lern_live_quiz where id = p_quiz;
  end if;
  return to_jsonb(v_quiz) || jsonb_build_object('jetzt', now());
end;
$$;

-- Für alle (auch Gäste): die eingeblendete Frage im Live, dazu die eigene
-- Antwort und – nach der Auflösung – der eigene Platz im Live. „jetzt“ ist die
-- Serverzeit, damit der Countdown auf jedem Handy gleich läuft.
create or replace function public.lern_live_quiz_laden(p_live uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_ich   uuid := auth.uid();
  v_quiz  public.lern_live_quiz;
  v_mein  jsonb;
  v_stand jsonb;
begin
  select q.* into v_quiz
    from public.lern_live_quiz q
    join public.lern_live l on l.id = q.live_id and l.status = 'live'
   where q.live_id = p_live and q.status <> 'fertig'
   order by q.gestartet_am desc
   limit 1;
  if not found then
    return jsonb_build_object('jetzt', now(), 'quiz', null, 'mein', null, 'stand', null);
  end if;
  if v_ich is not null then
    select jsonb_build_object('auswahl', a.auswahl, 'zeit_ms', a.zeit_ms, 'richtig', a.richtig, 'punkte', a.punkte) into v_mein
      from public.lern_live_quiz_antwort a
     where a.quiz_id = v_quiz.id and a.user_id = v_ich;
    if v_quiz.status <> 'offen' then
      select jsonb_build_object('punkte', w.punkte, 'richtige', w.richtige, 'platz', w.platz, 'spieler', w.spieler) into v_stand
        from lern_intern.live_quiz_wertung(p_live) w
       where w.user_id = v_ich;
    end if;
  end if;
  return jsonb_build_object('jetzt', now(), 'quiz', to_jsonb(v_quiz), 'mein', v_mein, 'stand', v_stand);
end;
$$;

-- Rechte ---------------------------------------------------------------------
revoke execute on function lern_intern.live_quiz_schliessen() from public, anon, authenticated;
revoke execute on function lern_intern.live_quiz_wertung(uuid) from public, anon, authenticated;
revoke execute on function lern_intern.live_quiz_bestenliste(uuid, integer) from public, anon, authenticated;

revoke execute on function public.lern_live_quiz_starten(uuid, text, text, text, text, text[], integer[], integer) from public, anon;
revoke execute on function public.lern_live_quiz_antworten(uuid, integer[]) from public, anon;
revoke execute on function public.lern_live_quiz_stand(uuid) from public, anon;
revoke execute on function public.lern_live_quiz_aufloesen(uuid, integer[], text) from public, anon;
revoke execute on function public.lern_live_quiz_weiter(uuid, text) from public, anon;
revoke execute on function public.lern_live_quiz_laden(uuid) from public;

grant execute on function public.lern_live_quiz_starten(uuid, text, text, text, text, text[], integer[], integer) to authenticated;
grant execute on function public.lern_live_quiz_antworten(uuid, integer[]) to authenticated;
grant execute on function public.lern_live_quiz_stand(uuid) to authenticated;
grant execute on function public.lern_live_quiz_aufloesen(uuid, integer[], text) to authenticated;
grant execute on function public.lern_live_quiz_weiter(uuid, text) to authenticated;
grant execute on function public.lern_live_quiz_laden(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

-- 19) Live: Prüfung für alle und Bild aus der Galerie -------------------------
-- Live-Prüfung: Der Inhaber startet im Live für alle gleichzeitig eine Prüfung
-- wie in der App; die Lösung kennt nur der Server, er wertet beim Abgeben und
-- beim Ende für alle. Dazu ein Bild aus der Galerie des Inhabers im Live.

-- a) Bild im Live -----------------------------------------------------------
alter table public.lern_live
  add column if not exists bild_pfad    text,
  add column if not exists bild_seite   real,
  add column if not exists bild_x       real,
  add column if not exists bild_y       real,
  add column if not exists bild_groesse real;

-- Bilder liegen öffentlich lesbar im Speicher; hochladen und löschen darf nur der Inhaber.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lern-live', 'lern-live', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lern_live_bild_hochladen" on storage.objects;
create policy "lern_live_bild_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-live' and (storage.foldername(name))[1] = auth.uid()::text and public.lern_ist_inhaber());

drop policy if exists "lern_live_bild_lesen" on storage.objects;
create policy "lern_live_bild_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'lern-live' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "lern_live_bild_loeschen" on storage.objects;
create policy "lern_live_bild_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lern-live' and (storage.foldername(name))[1] = auth.uid()::text and public.lern_ist_inhaber());

-- Inhaber: Bild zeigen, verschieben (Mitte x/y und Höhe als Anteil des Videos) oder entfernen (Pfad leer).
create or replace function public.lern_live_bild_setzen(p_live uuid, p_pfad text, p_seite real, p_x real, p_y real, p_groesse real)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_pfad text := nullif(btrim(coalesce(p_pfad, '')), '');
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if v_pfad is not null and (char_length(v_pfad) > 200 or v_pfad !~ ('^' || auth.uid()::text || '/')) then
    raise exception 'Ungültiges Bild';
  end if;
  update public.lern_live
     set bild_pfad    = v_pfad,
         bild_seite   = case when v_pfad is null then null else least(greatest(coalesce(p_seite, 1), 0.2), 5) end,
         bild_x       = case when v_pfad is null then null else least(greatest(coalesce(p_x, 0.5), 0), 1) end,
         bild_y       = case when v_pfad is null then null else least(greatest(coalesce(p_y, 0.5), 0), 1) end,
         bild_groesse = case when v_pfad is null then null else least(greatest(coalesce(p_groesse, 0.3), 0.06), 1.2) end
   where id = p_live and status <> 'beendet';
end;
$$;

-- Das laufende Live – jetzt mit Bild (sonst wie in Abschnitt 17).
create or replace function public.lern_live_aktuell()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'id', l.id,
           'titel', l.titel,
           'gestartet_am', l.gestartet_am,
           'gastgeber', (
             select jsonb_build_object(
                      'id', p.id,
                      'name', coalesce(nullif(btrim(p.name), ''), p.benutzername),
                      'bild_pfad', p.bild_pfad,
                      'avatar_farbe', p.avatar_farbe)
               from public.lern_inhaber i
               join auth.users u on lower(u.email) = lower(i.email)
               join public.lern_profil p on p.id = u.id
              order by p.created_at
              limit 1),
           'bild', case when l.bild_pfad is null then null else jsonb_build_object(
             'pfad', l.bild_pfad, 'seite', l.bild_seite, 'x', l.bild_x, 'y', l.bild_y, 'groesse', l.bild_groesse) end)
    from public.lern_live l
   where l.status = 'live'
     and l.puls_am > now() - interval '2 minutes'
   order by l.gestartet_am desc
   limit 1
$$;

-- b) Live-Prüfung -----------------------------------------------------------
create table if not exists public.lern_live_pruefung (
  id           uuid primary key default gen_random_uuid(),
  live_id      uuid not null references public.lern_live(id) on delete cascade,
  nummer       integer not null default 1,
  fragen       text[] not null check (cardinality(fragen) between 1 and 40),
  punkte       smallint[] not null,
  dauer        integer not null check (dauer between 30 and 3600),
  status       text not null default 'laeuft' check (status in ('laeuft', 'auswertung', 'fertig')),
  gestartet_am timestamptz not null default now(),
  endet_am     timestamptz not null,
  beendet_am   timestamptz,
  teilnehmer   integer not null default 0,
  bestanden    integer not null default 0,
  schnitt      real,
  schwerste    jsonb not null default '[]'::jsonb,
  bestenliste  jsonb not null default '[]'::jsonb
);
create index if not exists lern_live_pruefung_idx on public.lern_live_pruefung (live_id, gestartet_am desc);

-- Lösung je Frage ({"r":[0,2]} zum Ankreuzen, {"z":2.5} für Zahlen) – nur für den Server.
create table if not exists public.lern_live_pruefung_loesung (
  pruefung_id uuid primary key references public.lern_live_pruefung(id) on delete cascade,
  loesungen   jsonb not null
);

-- Wer mitschreibt: Antworten (je Fragennummer), Fortschritt und nach dem Abgeben das Ergebnis.
create table if not exists public.lern_live_pruefung_teilnahme (
  pruefung_id     uuid not null references public.lern_live_pruefung(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  antworten       jsonb not null default '{}'::jsonb,
  beantwortet     integer not null default 0,
  aktuell         integer not null default 0,
  aktualisiert_am timestamptz not null default now(),
  abgegeben_am    timestamptz,
  fehlerpunkte    integer,
  richtig         integer,
  fuenfer         integer,
  bestanden       boolean,
  falsch          smallint[],
  zeit_ms         integer,
  primary key (pruefung_id, user_id)
);
create index if not exists lern_live_pruefung_teilnahme_user_idx on public.lern_live_pruefung_teilnahme (user_id);

alter table public.lern_live_pruefung enable row level security;
alter table public.lern_live_pruefung_loesung enable row level security;
alter table public.lern_live_pruefung_teilnahme enable row level security;

-- Prüfungen sehen alle (ohne Lösung). Lösungen und Antworten: keine Policies.
drop policy if exists lern_live_pruefung_lesen on public.lern_live_pruefung;
create policy lern_live_pruefung_lesen on public.lern_live_pruefung
  for select to anon, authenticated
  using (exists (select 1 from public.lern_live l where l.id = live_id and l.status <> 'vorbereitung'));
grant select on public.lern_live_pruefung to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lern_live_pruefung') then
    alter publication supabase_realtime add table public.lern_live_pruefung;
  end if;
end $$;

-- Antworten prüfen und bereinigen: {"<nr>": {"a":[…]} oder {"e":"…"}} – nur gültige Nummern.
create or replace function lern_intern.live_pruefung_antworten(p_antworten jsonb, p_anzahl integer)
returns jsonb
language sql immutable set search_path = public
as $$
  select coalesce(jsonb_object_agg(k, wert), '{}'::jsonb)
    from (
      select e.key as k,
             case
               when jsonb_typeof(e.value -> 'a') = 'array' then
                 jsonb_build_object('a', (select coalesce(jsonb_agg(distinct x::int), '[]'::jsonb)
                                            from jsonb_array_elements_text(e.value -> 'a') x
                                           where x ~ '^[0-9]$'))
               when jsonb_typeof(e.value -> 'e') = 'string' then
                 jsonb_build_object('e', left(btrim(e.value ->> 'e'), 12))
             end as wert
        from jsonb_each(case when jsonb_typeof(p_antworten) = 'object' then p_antworten else '{}'::jsonb end) e
       where e.key ~ '^[0-9]{1,2}$' and e.key::int < p_anzahl
    ) t
   where wert is not null
     and ((wert ? 'a' and jsonb_array_length(wert -> 'a') > 0) or (wert ? 'e' and wert ->> 'e' <> ''))
$$;

-- Eine Teilnahme werten (nur einmal): Fehlerpunkte, richtig, Fünfer, bestanden, falsche Fragen.
create or replace function lern_intern.live_pruefung_werten(p_pruefung uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_p       public.lern_live_pruefung;
  v_l       jsonb;
  v_t       public.lern_live_pruefung_teilnahme;
  v_fehler  integer := 0;
  v_richtig integer := 0;
  v_fuenfer integer := 0;
  v_falsch  smallint[] := '{}';
  v_soll    jsonb;
  v_ist     jsonb;
  v_ok      boolean;
  i         integer;
begin
  select * into v_p from public.lern_live_pruefung where id = p_pruefung;
  select loesungen into v_l from public.lern_live_pruefung_loesung where pruefung_id = p_pruefung;
  select * into v_t from public.lern_live_pruefung_teilnahme where pruefung_id = p_pruefung and user_id = p_user for update;
  if v_p.id is null or v_t.user_id is null or v_t.abgegeben_am is not null then return; end if;
  for i in 0 .. cardinality(v_p.fragen) - 1 loop
    v_soll := v_l -> i;
    v_ist := v_t.antworten -> i::text;
    v_ok := false;
    if v_ist is not null and v_soll ? 'r' and v_ist ? 'a' then
      v_ok := (select coalesce(array_agg(x::int order by x::int), '{}') from jsonb_array_elements_text(v_ist -> 'a') x)
            = (select coalesce(array_agg(x::int order by x::int), '{}') from jsonb_array_elements_text(v_soll -> 'r') x);
    elsif v_ist is not null and v_soll ? 'z' and v_ist ? 'e' then
      begin
        v_ok := abs(replace(btrim(v_ist ->> 'e'), ',', '.')::numeric - (v_soll ->> 'z')::numeric) < 0.001;
      exception when others then
        v_ok := false;
      end;
    end if;
    if coalesce(v_ok, false) then
      v_richtig := v_richtig + 1;
    else
      v_fehler := v_fehler + v_p.punkte[i + 1];
      if v_p.punkte[i + 1] = 5 then v_fuenfer := v_fuenfer + 1; end if;
      v_falsch := v_falsch || i::smallint;
    end if;
  end loop;
  update public.lern_live_pruefung_teilnahme
     set abgegeben_am = now(),
         fehlerpunkte = v_fehler,
         richtig      = v_richtig,
         fuenfer      = v_fuenfer,
         bestanden    = (v_fehler <= 10 and v_fuenfer < 2),
         falsch       = v_falsch,
         zeit_ms      = least(greatest((extract(epoch from now() - v_p.gestartet_am) * 1000)::integer, 0), v_p.dauer * 1000)
   where pruefung_id = p_pruefung and user_id = p_user;
end;
$$;

-- Prüfung abschließen: alle noch offenen Teilnahmen mit dem gespeicherten Stand werten,
-- dann Zahlen, schwerste Fragen und die Besten (wenigste Fehlerpunkte, dann schneller).
create or replace function lern_intern.live_pruefung_abschliessen(p_pruefung uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
begin
  perform 1 from public.lern_live_pruefung where id = p_pruefung for update;
  for v_user in select user_id from public.lern_live_pruefung_teilnahme where pruefung_id = p_pruefung and abgegeben_am is null loop
    perform lern_intern.live_pruefung_werten(p_pruefung, v_user);
  end loop;
  update public.lern_live_pruefung q
     set status = p_status,
         beendet_am = coalesce(q.beendet_am, now()),
         endet_am = least(q.endet_am, now()),
         teilnehmer = (select count(*) from public.lern_live_pruefung_teilnahme t where t.pruefung_id = q.id and t.abgegeben_am is not null),
         bestanden = (select count(*) from public.lern_live_pruefung_teilnahme t where t.pruefung_id = q.id and t.bestanden),
         schnitt = (select round(avg(t.fehlerpunkte)::numeric, 1) from public.lern_live_pruefung_teilnahme t where t.pruefung_id = q.id and t.abgegeben_am is not null),
         schwerste = coalesce((
           select jsonb_agg(jsonb_build_object('nr', s.nr, 'frage_id', q.fragen[s.nr + 1], 'falsch', s.falsch) order by s.falsch desc, s.nr)
             from (select f.nr, count(*)::integer as falsch
                     from public.lern_live_pruefung_teilnahme t, unnest(t.falsch) as f(nr)
                    where t.pruefung_id = q.id
                    group by f.nr
                    order by count(*) desc, f.nr
                    limit 3) s), '[]'::jsonb),
         bestenliste = coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', b.user_id, 'name', b.name, 'bild_pfad', b.bild_pfad, 'avatar_farbe', b.avatar_farbe,
                    'fehlerpunkte', b.fehlerpunkte, 'bestanden', b.bestanden, 'zeit_ms', b.zeit_ms, 'platz', b.platz) order by b.platz)
             from (select t.user_id, coalesce(nullif(btrim(p.name), ''), p.benutzername) as name, p.bild_pfad, p.avatar_farbe,
                          t.fehlerpunkte, t.bestanden, t.zeit_ms,
                          (row_number() over (order by t.fehlerpunkte, t.zeit_ms, t.user_id))::integer as platz
                     from public.lern_live_pruefung_teilnahme t
                     join public.lern_profil p on p.id = t.user_id
                    where t.pruefung_id = q.id and t.abgegeben_am is not null
                      and not exists (select 1 from public.lern_live_stumm s where s.user_id = t.user_id)
                    order by t.fehlerpunkte, t.zeit_ms, t.user_id
                    limit 5) b), '[]'::jsonb)
   where q.id = p_pruefung;
end;
$$;

-- Endet das Live, enden auch laufende Prüfungen (mit Wertung).
create or replace function lern_intern.live_pruefung_schliessen()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  for v_id in select id from public.lern_live_pruefung where live_id = new.id and status = 'laeuft' loop
    perform lern_intern.live_pruefung_abschliessen(v_id, 'fertig');
  end loop;
  update public.lern_live_pruefung set status = 'fertig' where live_id = new.id and status <> 'fertig';
  return new;
end;
$$;
drop trigger if exists lern_live_pruefung_schliessen on public.lern_live;
create trigger lern_live_pruefung_schliessen
  after update of status on public.lern_live
  for each row when (new.status = 'beendet' and old.status is distinct from 'beendet')
  execute function lern_intern.live_pruefung_schliessen();

-- Inhaber: Prüfung für alle starten. Fragen, Fehlerpunkte und Lösungen kommen aus dem
-- Katalog der App; eine laufende Quizfrage oder Prüfung endet dabei.
create or replace function public.lern_live_pruefung_starten(p_live uuid, p_fragen text[], p_punkte integer[], p_loesungen jsonb, p_dauer integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_n     integer := coalesce(cardinality(p_fragen), 0);
  v_dauer integer := least(greatest(coalesce(p_dauer, 600), 60), 3600);
  v_p     public.lern_live_pruefung;
  v_id    uuid;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if not exists (select 1 from public.lern_live where id = p_live and status = 'live') then
    raise exception 'Das Live läuft gerade nicht.';
  end if;
  if v_n not between 1 and 40 or coalesce(cardinality(p_punkte), 0) <> v_n
     or exists (select 1 from unnest(p_punkte) x where x is null or x not between 2 and 5)
     or exists (select 1 from unnest(p_fragen) x where x is null or char_length(x) not between 1 and 40)
     or coalesce(jsonb_typeof(p_loesungen), '') <> 'array' then
    raise exception 'Ungültige Prüfung';
  end if;
  -- Je Frage genau eine Lösung: angekreuzte Antworten ("r") oder eine Zahl ("z").
  if jsonb_array_length(p_loesungen) <> v_n
     or exists (select 1 from jsonb_array_elements(p_loesungen) e
                 where case when jsonb_typeof(e -> 'r') = 'array' then jsonb_array_length(e -> 'r') = 0
                            when jsonb_typeof(e -> 'z') = 'number' then false
                            else true end) then
    raise exception 'Ungültige Prüfung';
  end if;
  update public.lern_live_quiz set status = 'fertig' where live_id = p_live and status <> 'fertig';
  for v_id in select id from public.lern_live_pruefung where live_id = p_live and status = 'laeuft' loop
    perform lern_intern.live_pruefung_abschliessen(v_id, 'fertig');
  end loop;
  update public.lern_live_pruefung set status = 'fertig' where live_id = p_live and status <> 'fertig';
  insert into public.lern_live_pruefung (live_id, nummer, fragen, punkte, dauer, endet_am)
  values (p_live,
          coalesce((select max(q.nummer) from public.lern_live_pruefung q where q.live_id = p_live), 0) + 1,
          p_fragen, p_punkte::smallint[], v_dauer, now() + make_interval(secs => v_dauer))
  returning * into v_p;
  insert into public.lern_live_pruefung_loesung (pruefung_id, loesungen) values (v_p.id, p_loesungen);
  return to_jsonb(v_p) || jsonb_build_object('jetzt', now());
end;
$$;

-- Gemeinsame Prüfungen für Mitschreiben und Abgeben.
create or replace function lern_intern.live_pruefung_darf(p_pruefung uuid)
returns public.lern_live_pruefung
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select q.* into v_p
    from public.lern_live_pruefung q
    join public.lern_live l on l.id = q.live_id and l.status = 'live'
   where q.id = p_pruefung
     for share of q;
  if not found or v_p.status <> 'laeuft' or now() > v_p.endet_am + interval '5 seconds' then
    raise exception 'Die Prüfung ist vorbei.';
  end if;
  if public.lern_ist_inhaber() then raise exception 'Als Gastgeber schreibst du nicht mit.'; end if;
  if exists (select 1 from public.lern_live_stumm where user_id = auth.uid()) then
    raise exception 'Du kannst gerade nicht mitmachen.';
  end if;
  return v_p;
end;
$$;

-- Mitschreiben: Antworten und aktuelle Frage sichern (für den Live-Zähler des Inhabers
-- und falls die App zwischendurch neu startet).
create or replace function public.lern_live_pruefung_speichern(p_pruefung uuid, p_antworten jsonb, p_aktuell integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
  v_a jsonb;
begin
  v_p := lern_intern.live_pruefung_darf(p_pruefung);
  v_a := lern_intern.live_pruefung_antworten(p_antworten, cardinality(v_p.fragen));
  insert into public.lern_live_pruefung_teilnahme as t (pruefung_id, user_id, antworten, beantwortet, aktuell)
  values (p_pruefung, auth.uid(), v_a, (select count(*) from jsonb_object_keys(v_a)),
          least(greatest(coalesce(p_aktuell, 0), 0), cardinality(v_p.fragen) - 1))
  on conflict (pruefung_id, user_id) do update
     set antworten = excluded.antworten,
         beantwortet = excluded.beantwortet,
         aktuell = excluded.aktuell,
         aktualisiert_am = now()
   where t.abgegeben_am is null;
  return (select jsonb_build_object('beantwortet', t.beantwortet, 'abgegeben', t.abgegeben_am is not null)
            from public.lern_live_pruefung_teilnahme t where t.pruefung_id = p_pruefung and t.user_id = auth.uid());
end;
$$;

-- Abgeben: Antworten sichern und sofort werten.
create or replace function public.lern_live_pruefung_abgeben(p_pruefung uuid, p_antworten jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
  v_a jsonb;
begin
  v_p := lern_intern.live_pruefung_darf(p_pruefung);
  v_a := lern_intern.live_pruefung_antworten(p_antworten, cardinality(v_p.fragen));
  insert into public.lern_live_pruefung_teilnahme as t (pruefung_id, user_id, antworten, beantwortet, aktuell)
  values (p_pruefung, auth.uid(), v_a, (select count(*) from jsonb_object_keys(v_a)), 0)
  on conflict (pruefung_id, user_id) do update
     set antworten = excluded.antworten, beantwortet = excluded.beantwortet, aktualisiert_am = now()
   where t.abgegeben_am is null;
  perform lern_intern.live_pruefung_werten(p_pruefung, auth.uid());
  return (select jsonb_build_object('fehlerpunkte', t.fehlerpunkte, 'richtig', t.richtig, 'fuenfer', t.fuenfer,
                                    'bestanden', t.bestanden, 'falsch', to_jsonb(t.falsch), 'zeit_ms', t.zeit_ms,
                                    'antworten', t.antworten, 'beantwortet', t.beantwortet, 'abgegeben', true)
            from public.lern_live_pruefung_teilnahme t where t.pruefung_id = p_pruefung and t.user_id = auth.uid());
end;
$$;

-- Für alle (auch Gäste): die Prüfung im Live, die eigene Teilnahme und nach dem Ende der eigene
-- Platz. Ist die Zeit seit 20 Sekunden um und hat der Inhaber nicht beendet, schließt sie hier.
create or replace function public.lern_live_pruefung_laden(p_live uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich   uuid := auth.uid();
  v_p     public.lern_live_pruefung;
  v_mein  jsonb;
  v_platz jsonb;
begin
  select q.* into v_p
    from public.lern_live_pruefung q
    join public.lern_live l on l.id = q.live_id and l.status = 'live'
   where q.live_id = p_live and q.status <> 'fertig'
   order by q.gestartet_am desc
   limit 1;
  if not found then
    return jsonb_build_object('jetzt', now(), 'pruefung', null, 'mein', null, 'platz', null);
  end if;
  if v_p.status = 'laeuft' and now() > v_p.endet_am + interval '20 seconds' then
    perform lern_intern.live_pruefung_abschliessen(v_p.id, 'auswertung');
    select * into v_p from public.lern_live_pruefung where id = v_p.id;
  end if;
  if v_ich is not null then
    select jsonb_build_object('antworten', t.antworten, 'beantwortet', t.beantwortet, 'abgegeben', t.abgegeben_am is not null,
                              'fehlerpunkte', t.fehlerpunkte, 'richtig', t.richtig, 'fuenfer', t.fuenfer, 'bestanden', t.bestanden,
                              'falsch', to_jsonb(t.falsch), 'zeit_ms', t.zeit_ms)
      into v_mein
      from public.lern_live_pruefung_teilnahme t
     where t.pruefung_id = v_p.id and t.user_id = v_ich;
    if v_p.status <> 'laeuft' then
      select jsonb_build_object('platz', r.platz, 'von', r.von) into v_platz
        from (select t.user_id,
                     (row_number() over (order by t.fehlerpunkte, t.zeit_ms, t.user_id))::integer as platz,
                     (count(*) over ())::integer as von
                from public.lern_live_pruefung_teilnahme t
               where t.pruefung_id = v_p.id and t.abgegeben_am is not null) r
       where r.user_id = v_ich;
    end if;
  end if;
  return jsonb_build_object('jetzt', now(), 'pruefung', to_jsonb(v_p), 'mein', v_mein, 'platz', v_platz);
end;
$$;

-- Inhaber: Live-Zähler – wer schreibt, wie weit, wer hat abgegeben (mit Ergebnis).
create or replace function public.lern_live_pruefung_stand(p_pruefung uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return jsonb_build_object(
    'jetzt', now(),
    'schreiben', (select count(*) from public.lern_live_pruefung_teilnahme t where t.pruefung_id = p_pruefung and t.abgegeben_am is null),
    'abgegeben', (select count(*) from public.lern_live_pruefung_teilnahme t where t.pruefung_id = p_pruefung and t.abgegeben_am is not null),
    'bestanden', (select count(*) from public.lern_live_pruefung_teilnahme t where t.pruefung_id = p_pruefung and t.bestanden),
    'schnitt', (select round(avg(t.fehlerpunkte)::numeric, 1) from public.lern_live_pruefung_teilnahme t where t.pruefung_id = p_pruefung and t.abgegeben_am is not null),
    -- Wie weit alle sind (0..1): Abgegebene zählen voll, sonst beantwortete Fragen.
    'fortschritt', (select round(avg(case when t.abgegeben_am is not null then 1
                                          else least(t.beantwortet, q.n)::numeric / greatest(q.n, 1) end), 3)
                      from public.lern_live_pruefung_teilnahme t,
                           (select cardinality(x.fragen) as n from public.lern_live_pruefung x where x.id = p_pruefung) q
                     where t.pruefung_id = p_pruefung),
    'spieler', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.user_id, 'name', s.name, 'bild_pfad', s.bild_pfad, 'avatar_farbe', s.avatar_farbe,
               'beantwortet', s.beantwortet, 'aktuell', s.aktuell, 'abgegeben', s.abgegeben,
               'fehlerpunkte', s.fehlerpunkte, 'bestanden', s.bestanden) order by s.abgegeben desc, s.beantwortet desc, s.name)
        from (select t.user_id, coalesce(nullif(btrim(p.name), ''), p.benutzername) as name, p.bild_pfad, p.avatar_farbe,
                     t.beantwortet, t.aktuell, t.abgegeben_am is not null as abgegeben, t.fehlerpunkte, t.bestanden
                from public.lern_live_pruefung_teilnahme t
                join public.lern_profil p on p.id = t.user_id
               where t.pruefung_id = p_pruefung
               order by (t.abgegeben_am is not null) desc, t.beantwortet desc
               limit 60) s), '[]'::jsonb));
end;
$$;

-- Inhaber: Zeit verlängern (insgesamt höchstens eine Stunde).
create or replace function public.lern_live_pruefung_verlaengern(p_pruefung uuid, p_sekunden integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
  v_plus integer := least(greatest(coalesce(p_sekunden, 60), 15), 1800);
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  update public.lern_live_pruefung q
     set dauer = least(q.dauer + v_plus, 3600),
         endet_am = q.gestartet_am + make_interval(secs => least(q.dauer + v_plus, 3600))
   where q.id = p_pruefung and q.status = 'laeuft'
  returning * into v_p;
  if not found then select * into v_p from public.lern_live_pruefung where id = p_pruefung; end if;
  return to_jsonb(v_p) || jsonb_build_object('jetzt', now());
end;
$$;

-- Inhaber: Prüfung beenden (vorzeitig oder wenn die Zeit um ist) – alle werden gewertet.
create or replace function public.lern_live_pruefung_beenden(p_pruefung uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if exists (select 1 from public.lern_live_pruefung where id = p_pruefung and status = 'laeuft') then
    perform lern_intern.live_pruefung_abschliessen(p_pruefung, 'auswertung');
  end if;
  select * into v_p from public.lern_live_pruefung where id = p_pruefung;
  return to_jsonb(v_p) || jsonb_build_object('jetzt', now());
end;
$$;

-- Inhaber: Auswertung schließen (für alle ausblenden).
create or replace function public.lern_live_pruefung_schliessen(p_pruefung uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if exists (select 1 from public.lern_live_pruefung where id = p_pruefung and status = 'laeuft') then
    perform lern_intern.live_pruefung_abschliessen(p_pruefung, 'fertig');
  end if;
  update public.lern_live_pruefung set status = 'fertig' where id = p_pruefung returning * into v_p;
  return to_jsonb(v_p) || jsonb_build_object('jetzt', now());
end;
$$;

-- Rechte ---------------------------------------------------------------------
revoke execute on function lern_intern.live_pruefung_antworten(jsonb, integer) from public, anon, authenticated;
revoke execute on function lern_intern.live_pruefung_werten(uuid, uuid) from public, anon, authenticated;
revoke execute on function lern_intern.live_pruefung_abschliessen(uuid, text) from public, anon, authenticated;
revoke execute on function lern_intern.live_pruefung_schliessen() from public, anon, authenticated;
revoke execute on function lern_intern.live_pruefung_darf(uuid) from public, anon, authenticated;

revoke execute on function public.lern_live_bild_setzen(uuid, text, real, real, real, real) from public, anon;
revoke execute on function public.lern_live_aktuell() from public;
revoke execute on function public.lern_live_pruefung_starten(uuid, text[], integer[], jsonb, integer) from public, anon;
revoke execute on function public.lern_live_pruefung_speichern(uuid, jsonb, integer) from public, anon;
revoke execute on function public.lern_live_pruefung_abgeben(uuid, jsonb) from public, anon;
revoke execute on function public.lern_live_pruefung_laden(uuid) from public;
revoke execute on function public.lern_live_pruefung_stand(uuid) from public, anon;
revoke execute on function public.lern_live_pruefung_verlaengern(uuid, integer) from public, anon;
revoke execute on function public.lern_live_pruefung_beenden(uuid) from public, anon;
revoke execute on function public.lern_live_pruefung_schliessen(uuid) from public, anon;

grant execute on function public.lern_live_bild_setzen(uuid, text, real, real, real, real) to authenticated;
grant execute on function public.lern_live_aktuell() to anon, authenticated;
grant execute on function public.lern_live_pruefung_starten(uuid, text[], integer[], jsonb, integer) to authenticated;
grant execute on function public.lern_live_pruefung_speichern(uuid, jsonb, integer) to authenticated;
grant execute on function public.lern_live_pruefung_abgeben(uuid, jsonb) to authenticated;
grant execute on function public.lern_live_pruefung_laden(uuid) to anon, authenticated;
grant execute on function public.lern_live_pruefung_stand(uuid) to authenticated;
grant execute on function public.lern_live_pruefung_verlaengern(uuid, integer) to authenticated;
grant execute on function public.lern_live_pruefung_beenden(uuid) to authenticated;
grant execute on function public.lern_live_pruefung_schliessen(uuid) to authenticated;

notify pgrst, 'reload schema';


-- 20) Live: Themenrad und Tafel zum Malen ----------------------------------------
-- Themenrad: Der Inhaber dreht im Live ein Glücksrad mit den Lernthemen. Wo es
-- stehen bleibt, bestimmt der Server – alle sehen dasselbe Rad zur selben Zeit
-- (Startzeit und Ziel liegen am Live). Danach startet er eine Quizfrage aus dem Thema.
-- Tafel: Der Inhaber malt mit dem Finger auf sein Bild aus der Galerie oder auf
-- eine Vorlage (Kreuzung, Kreisverkehr, leere Tafel). Striche gehen live über
-- LiveKit an alle; der letzte Stand liegt hier für alle, die später dazukommen.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher müssen die Abschnitte 17 bis 19 gelaufen sein (update-live.sql,
-- update-live-quiz.sql, update-live-pruefung.sql). Mehrfaches Ausführen ist
-- unschädlich. Steht auch in schema.sql (Abschnitt 20).

alter table public.lern_live
  add column if not exists rad   jsonb,
  add column if not exists tafel jsonb;

-- Tafel prüfen und auf das erlaubte Format bringen:
-- {an, grund: bild|leer|kreuzung|kreisverkehr, striche: [{f: Farbe, a: Pfeil?, p: [x,y,…] (0–1000)}]}
create or replace function lern_intern.live_tafel_pruefen(p jsonb)
returns jsonb
language plpgsql immutable set search_path = public
as $$
declare
  v_grund text;
  v_striche jsonb := '[]'::jsonb;
  v_strich jsonb;
  v_farbe text;
  v_punkte jsonb;
  v_n integer;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return null;
  end if;
  v_grund := coalesce(p ->> 'grund', 'leer');
  if v_grund not in ('bild', 'leer', 'kreuzung', 'kreisverkehr') then
    raise exception 'Ungültige Tafel';
  end if;
  if p ? 'striche' and jsonb_typeof(p -> 'striche') <> 'array' then
    raise exception 'Ungültige Tafel';
  end if;
  if jsonb_array_length(coalesce(p -> 'striche', '[]'::jsonb)) > 80 then
    raise exception 'Zu viele Striche – lösch erst ein paar.';
  end if;
  for v_strich in select value from jsonb_array_elements(coalesce(p -> 'striche', '[]'::jsonb)) loop
    if jsonb_typeof(v_strich) <> 'object' or coalesce(jsonb_typeof(v_strich -> 'p'), '') <> 'array' then
      raise exception 'Ungültiger Strich';
    end if;
    v_farbe := coalesce(v_strich ->> 'f', '#FFFFFF');
    v_n := jsonb_array_length(v_strich -> 'p');
    if v_farbe !~ '^#[0-9A-Fa-f]{6}$' or v_n < 2 or v_n > 400 or v_n % 2 <> 0
       or coalesce(jsonb_typeof(v_strich -> 'a'), 'boolean') <> 'boolean'
       or exists (select 1 from jsonb_array_elements(v_strich -> 'p') x
                   where jsonb_typeof(x) <> 'number' or (x #>> '{}')::numeric < 0 or (x #>> '{}')::numeric > 1000) then
      raise exception 'Ungültiger Strich';
    end if;
    select jsonb_agg(round((x #>> '{}')::numeric)::integer order by o)
      into v_punkte
      from jsonb_array_elements(v_strich -> 'p') with ordinality as t(x, o);
    v_striche := v_striche || jsonb_build_array(jsonb_build_object(
      'f', upper(v_farbe), 'a', coalesce((v_strich ->> 'a')::boolean, false), 'p', v_punkte));
  end loop;
  return jsonb_build_object('an', coalesce((p ->> 'an')::boolean, false), 'grund', v_grund, 'striche', v_striche);
end;
$$;

-- Inhaber: Tafel an/aus, Hintergrund und Striche sichern (null = Tafel weg).
create or replace function public.lern_live_tafel_setzen(p_live uuid, p_tafel jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tafel jsonb;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  v_tafel := lern_intern.live_tafel_pruefen(p_tafel);
  if v_tafel ->> 'grund' = 'bild'
     and not exists (select 1 from public.lern_live l where l.id = p_live and l.bild_pfad is not null) then
    raise exception 'Es ist gerade kein Bild zu sehen.';
  end if;
  update public.lern_live set tafel = v_tafel where id = p_live and status <> 'beendet';
end;
$$;

-- Inhaber: Bild setzen wie in Abschnitt 19 – ein neues oder entferntes Bild
-- nimmt auch die Striche darauf mit.
create or replace function public.lern_live_bild_setzen(p_live uuid, p_pfad text, p_seite real, p_x real, p_y real, p_groesse real)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_pfad text := nullif(btrim(coalesce(p_pfad, '')), '');
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if v_pfad is not null and (char_length(v_pfad) > 200 or v_pfad !~ ('^' || auth.uid()::text || '/')) then
    raise exception 'Ungültiges Bild';
  end if;
  update public.lern_live
     set tafel        = case when tafel ->> 'grund' = 'bild' and v_pfad is distinct from bild_pfad then null else tafel end,
         bild_pfad    = v_pfad,
         bild_seite   = case when v_pfad is null then null else least(greatest(coalesce(p_seite, 1), 0.2), 5) end,
         bild_x       = case when v_pfad is null then null else least(greatest(coalesce(p_x, 0.5), 0), 1) end,
         bild_y       = case when v_pfad is null then null else least(greatest(coalesce(p_y, 0.5), 0), 1) end,
         bild_groesse = case when v_pfad is null then null else least(greatest(coalesce(p_groesse, 0.3), 0.06), 1.2) end
   where id = p_live and status <> 'beendet';
end;
$$;

-- Inhaber: Themenrad drehen. Ziel, Stelle im Feld und Umdrehungen bestimmt der Server;
-- das Rad startet kurz nach jetzt, damit es bei allen gleichzeitig losgeht.
create or replace function public.lern_live_rad_drehen(p_live uuid, p_themen text[])
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_n integer := coalesce(cardinality(p_themen), 0);
  v_rad jsonb;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if v_n < 2 or v_n > 12
     or exists (select 1 from unnest(p_themen) t where t is null or t !~ '^[a-z_]{2,24}$') then
    raise exception 'Ungültiges Themenrad';
  end if;
  v_rad := jsonb_build_object(
    'id', gen_random_uuid(),
    'themen', to_jsonb(p_themen),
    'ziel', floor(random() * v_n)::integer,
    'versatz', round((0.2 + random() * 0.6)::numeric, 3),
    'runden', 5 + floor(random() * 3)::integer,
    'start', now() + interval '700 milliseconds',
    'dauer', 6.5);
  update public.lern_live set rad = v_rad where id = p_live and status = 'live';
  if not found then raise exception 'Das Live läuft gerade nicht.'; end if;
  return v_rad || jsonb_build_object('jetzt', now());
end;
$$;

create or replace function public.lern_live_rad_schliessen(p_live uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  update public.lern_live set rad = null where id = p_live;
end;
$$;

-- Das laufende Live – jetzt mit Themenrad, Tafel und Serverzeit (sonst wie in Abschnitt 19).
create or replace function public.lern_live_aktuell()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'id', l.id,
           'titel', l.titel,
           'gestartet_am', l.gestartet_am,
           'jetzt', now(),
           'gastgeber', (
             select jsonb_build_object(
                      'id', p.id,
                      'name', coalesce(nullif(btrim(p.name), ''), p.benutzername),
                      'bild_pfad', p.bild_pfad,
                      'avatar_farbe', p.avatar_farbe)
               from public.lern_inhaber i
               join auth.users u on lower(u.email) = lower(i.email)
               join public.lern_profil p on p.id = u.id
              order by p.created_at
              limit 1),
           'bild', case when l.bild_pfad is null then null else jsonb_build_object(
             'pfad', l.bild_pfad, 'seite', l.bild_seite, 'x', l.bild_x, 'y', l.bild_y, 'groesse', l.bild_groesse) end,
           'rad', l.rad,
           'tafel', l.tafel)
    from public.lern_live l
   where l.status = 'live'
     and l.puls_am > now() - interval '2 minutes'
   order by l.gestartet_am desc
   limit 1
$$;

revoke execute on function lern_intern.live_tafel_pruefen(jsonb) from public, anon, authenticated;
revoke execute on function public.lern_live_tafel_setzen(uuid, jsonb) from public, anon;
revoke execute on function public.lern_live_bild_setzen(uuid, text, real, real, real, real) from public, anon;
revoke execute on function public.lern_live_rad_drehen(uuid, text[]) from public, anon;
revoke execute on function public.lern_live_rad_schliessen(uuid) from public, anon;
revoke execute on function public.lern_live_aktuell() from public;

grant execute on function public.lern_live_tafel_setzen(uuid, jsonb) to authenticated;
grant execute on function public.lern_live_bild_setzen(uuid, text, real, real, real, real) to authenticated;
grant execute on function public.lern_live_rad_drehen(uuid, text[]) to authenticated;
grant execute on function public.lern_live_rad_schliessen(uuid) to authenticated;
grant execute on function public.lern_live_aktuell() to anon, authenticated;

notify pgrst, 'reload schema';

-- 21) Erklärvideos zu Fragen -------------------------------------------------
-- Der Inhaber lädt zu einzelnen Fragen ein Erklärvideo hoch (Einstellungen →
-- Erklärvideos). Beim Lernen erscheint dann neben der KI-Hilfe ein Video-Knopf.
-- Die Videos liegen öffentlich lesbar im Speicher (wie Clips), die Liste dürfen
-- alle lesen. Hochladen, ersetzen und löschen darf nur der Inhaber.
-- Wiederholbar; derselbe Inhalt steht in schema.sql (Abschnitt 21).

create table if not exists public.lern_erklaervideo (
  frage_id        text primary key check (frage_id ~ '^[a-z]{1,16}[0-9]{1,5}$'),
  pfad            text not null,
  dauer           real,
  aktualisiert_am timestamptz not null default now()
);

alter table public.lern_erklaervideo enable row level security;
drop policy if exists "lern_erklaervideo_lesen" on public.lern_erklaervideo;
create policy "lern_erklaervideo_lesen" on public.lern_erklaervideo for select to anon, authenticated using (true);
revoke all on public.lern_erklaervideo from anon, authenticated;
grant select on public.lern_erklaervideo to anon, authenticated;

-- Speicher: öffentlich lesbar (schnell per CDN), 50 MB je Video wie bei Clips.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lern-erklaervideos', 'lern-erklaervideos', true, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lern_erklaervideo_hochladen" on storage.objects;
create policy "lern_erklaervideo_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-erklaervideos' and public.lern_ist_inhaber());

drop policy if exists "lern_erklaervideo_dateien_lesen" on storage.objects;
create policy "lern_erklaervideo_dateien_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'lern-erklaervideos' and public.lern_ist_inhaber());

drop policy if exists "lern_erklaervideo_dateien_loeschen" on storage.objects;
create policy "lern_erklaervideo_dateien_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lern-erklaervideos' and public.lern_ist_inhaber());

-- Inhaber: Video zu einer Frage eintragen (ersetzt ein altes). Liefert den alten
-- Pfad, damit die App die alte Datei löschen kann.
create or replace function public.lern_erklaervideo_setzen(p_frage text, p_pfad text, p_dauer real default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_alt text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if p_frage is null or p_frage !~ '^[a-z]{1,16}[0-9]{1,5}$' then raise exception 'Ungültige Frage'; end if;
  if p_pfad is null or p_pfad !~ ('^' || p_frage || '/[A-Za-z0-9_-]{4,64}\.(mp4|mov)$') then raise exception 'Ungültiger Pfad'; end if;
  select e.pfad into v_alt from public.lern_erklaervideo e where e.frage_id = p_frage;
  insert into public.lern_erklaervideo (frage_id, pfad, dauer, aktualisiert_am)
  values (p_frage, p_pfad, case when p_dauer > 0 and p_dauer < 3600 then p_dauer end, now())
  on conflict (frage_id) do update
    set pfad = excluded.pfad, dauer = excluded.dauer, aktualisiert_am = now();
  return case when v_alt is distinct from p_pfad then v_alt end;
end;
$$;

-- Inhaber: Video einer Frage entfernen. Liefert den Pfad der Datei zum Löschen.
create or replace function public.lern_erklaervideo_loeschen(p_frage text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_alt text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  delete from public.lern_erklaervideo e where e.frage_id = p_frage returning e.pfad into v_alt;
  return v_alt;
end;
$$;

revoke execute on function public.lern_erklaervideo_setzen(text, text, real) from public, anon;
revoke execute on function public.lern_erklaervideo_loeschen(text) from public, anon;
grant execute on function public.lern_erklaervideo_setzen(text, text, real) to authenticated;
grant execute on function public.lern_erklaervideo_loeschen(text) to authenticated;

notify pgrst, 'reload schema';
