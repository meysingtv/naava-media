-- =====================================================================
-- 26) Manager (Web-Panel /manager): Zugänge verwalten und Themenvideos
-- =====================================================================
-- Der Inhaber legt im Manager Zugänge an (E-Mail + Passwort), ordnet
-- Fahrschüler einem Fahrlehrer zu, pausiert, sperrt oder löscht Konten und
-- lädt Videos zu den Themen hoch. Anlegen, Sperren und Löschen laufen über die
-- Edge Function „manager“ (braucht den Dienstschlüssel, der nur auf dem Server
-- liegt). Hier stehen nur die Tabellen und die Funktionen für die App.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher müssen Abschnitt 13 (Rolle) und 21 (Erklärvideos) gelaufen
-- sein. Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql
-- (Abschnitt 26).

-- a) Verwaltung je Konto ------------------------------------------------------
-- Eigene Tabelle statt Spalten in lern_profil: Profile sind für alle lesbar,
-- Status und Notiz soll aber nur der Inhaber (über die Edge Function) sehen.
create table if not exists public.lern_verwaltung (
  user_id       uuid primary key references public.lern_profil(id) on delete cascade,
  status        text not null default 'aktiv' check (status in ('aktiv', 'pausiert', 'gesperrt')),
  pausiert_bis  timestamptz,
  fahrlehrer_id uuid references public.lern_profil(id) on delete set null,
  notiz         text not null default '' check (char_length(notiz) <= 500),
  angelegt_von  uuid references auth.users(id) on delete set null,
  geaendert_am  timestamptz not null default now()
);
create index if not exists lern_verwaltung_fahrlehrer on public.lern_verwaltung (fahrlehrer_id);

alter table public.lern_verwaltung enable row level security;
revoke all on public.lern_verwaltung from anon, authenticated;
-- Lesen, schreiben und löschen nur über die Edge Function (Dienstschlüssel).

-- Eigener Zugang: „aktiv“, „pausiert“ oder „gesperrt“. Eine abgelaufene Pause
-- zählt wieder als aktiv. Die App fragt das beim Start und meldet sich ab.
create or replace function public.lern_mein_zugang()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select case when v.status = 'pausiert' and v.pausiert_bis is not null and v.pausiert_bis <= now() then 'aktiv' else v.status end
       from public.lern_verwaltung v
      where v.user_id = auth.uid()),
    'aktiv');
$$;
revoke execute on function public.lern_mein_zugang() from public, anon;
grant execute on function public.lern_mein_zugang() to authenticated;

-- b) Videos zu Themen -------------------------------------------------------
-- Mehrere Videos je Thema (z. B. „Vorfahrt“), sichtbar auf der Themenseite.
-- Die Dateien liegen im selben Speicher wie die Erklärvideos (Abschnitt 21),
-- Ordner „thema-<id>/“. Hochladen und löschen darf nur der Inhaber.
create table if not exists public.lern_themavideo (
  id          uuid primary key default gen_random_uuid(),
  thema_id    text not null check (thema_id ~ '^[a-z]{2,16}$'),
  titel       text not null check (char_length(btrim(titel)) between 1 and 80),
  pfad        text not null unique,
  dauer       real,
  position    integer not null default 0,
  erstellt_am timestamptz not null default now()
);
create index if not exists lern_themavideo_thema on public.lern_themavideo (thema_id, position);

alter table public.lern_themavideo enable row level security;
drop policy if exists "lern_themavideo_lesen" on public.lern_themavideo;
create policy "lern_themavideo_lesen" on public.lern_themavideo for select to anon, authenticated using (true);
revoke all on public.lern_themavideo from anon, authenticated;
grant select on public.lern_themavideo to anon, authenticated;

-- Inhaber: Video eintragen (die Datei ist schon hochgeladen). Hängt es hinten an.
create or replace function public.lern_themavideo_hinzufuegen(p_thema text, p_titel text, p_pfad text, p_dauer real default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if p_thema is null or p_thema !~ '^[a-z]{2,16}$' then raise exception 'Ungültiges Thema'; end if;
  if char_length(btrim(coalesce(p_titel, ''))) not between 1 and 80 then raise exception 'Titel fehlt oder ist zu lang'; end if;
  if p_pfad is null or p_pfad !~ ('^thema-' || p_thema || '/[A-Za-z0-9_-]{4,64}\.(mp4|mov)$') then raise exception 'Ungültiger Pfad'; end if;
  insert into public.lern_themavideo (thema_id, titel, pfad, dauer, position)
  values (
    p_thema,
    btrim(p_titel),
    p_pfad,
    case when p_dauer > 0 and p_dauer < 7200 then p_dauer end,
    coalesce((select max(t.position) + 1 from public.lern_themavideo t where t.thema_id = p_thema), 0)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Inhaber: Titel ändern.
create or replace function public.lern_themavideo_umbenennen(p_id uuid, p_titel text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if char_length(btrim(coalesce(p_titel, ''))) not between 1 and 80 then raise exception 'Titel fehlt oder ist zu lang'; end if;
  update public.lern_themavideo set titel = btrim(p_titel) where id = p_id;
end;
$$;

-- Inhaber: ein Video eine Stelle nach oben (-1) oder unten (+1) schieben.
create or replace function public.lern_themavideo_verschieben(p_id uuid, p_richtung integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_thema text;
  v_ids   uuid[];
  v_i     integer;
  v_j     integer;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  select t.thema_id into v_thema from public.lern_themavideo t where t.id = p_id;
  if v_thema is null then return; end if;
  select array_agg(t.id order by t.position, t.erstellt_am) into v_ids from public.lern_themavideo t where t.thema_id = v_thema;
  v_i := array_position(v_ids, p_id);
  v_j := v_i + sign(coalesce(p_richtung, 0))::integer;
  if v_j < 1 or v_j > array_length(v_ids, 1) or v_j = v_i then return; end if;
  v_ids[v_i] := v_ids[v_j];
  v_ids[v_j] := p_id;
  update public.lern_themavideo t
     set position = array_position(v_ids, t.id) - 1
   where t.thema_id = v_thema;
end;
$$;

-- Inhaber: Video löschen. Liefert den Pfad, damit die App die Datei löscht.
create or replace function public.lern_themavideo_loeschen(p_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_pfad text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  delete from public.lern_themavideo t where t.id = p_id returning t.pfad into v_pfad;
  return v_pfad;
end;
$$;

revoke execute on function public.lern_themavideo_hinzufuegen(text, text, text, real) from public, anon;
revoke execute on function public.lern_themavideo_umbenennen(uuid, text) from public, anon;
revoke execute on function public.lern_themavideo_verschieben(uuid, integer) from public, anon;
revoke execute on function public.lern_themavideo_loeschen(uuid) from public, anon;
grant execute on function public.lern_themavideo_hinzufuegen(text, text, text, real) to authenticated;
grant execute on function public.lern_themavideo_umbenennen(uuid, text) to authenticated;
grant execute on function public.lern_themavideo_verschieben(uuid, integer) to authenticated;
grant execute on function public.lern_themavideo_loeschen(uuid) to authenticated;

notify pgrst, 'reload schema';
