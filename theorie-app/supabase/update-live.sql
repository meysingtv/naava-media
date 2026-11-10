-- 17) Live-Stream: nur der Inhaber geht live -------------------------------
-- Live-Videos in Clips: Der Inhaber der App sendet, alle anderen schauen zu,
-- schreiben im Chat und bekommen auf Wunsch eine Mitteilung beim Start.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Mehrfaches Ausführen ist unschädlich. Der Live-Teil steht auch in
-- schema.sql (Abschnitt 17).

-- 0) Voraussetzungen aus älteren Updates -----------------------------------
-- (stehen auch in schema.sql Abschnitt 10, 14 und 16; falls ein älteres Update
-- fehlt, wird es hier nachgeholt – sonst ändert sich nichts)
create schema if not exists lern_intern;
revoke all on schema lern_intern from public, anon, authenticated;

alter table public.lern_profil add column if not exists bild_pfad text;

create table if not exists public.lern_limit (
  user_id uuid not null,
  art     text not null,
  zeit    timestamptz not null default now()
);
create index if not exists lern_limit_idx on public.lern_limit (user_id, art, zeit);
alter table public.lern_limit enable row level security;

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
revoke execute on function public.lern_limit_pruefen(text, integer, interval) from public, anon, authenticated;

create table if not exists public.lern_push (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  token           text not null,
  aktualisiert_am timestamptz not null default now()
);
alter table public.lern_push enable row level security;

-- 1) Live ------------------------------------------------------------------
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
