-- =====================================================================
-- 30) Eigene Themen
-- =====================================================================
-- Die Themen der Lernvideos (bisher 11 feste Themen im Code) legt der Inhaber
-- jetzt selbst im Manager an: Titel, kurze Beschreibung, eigenes Bild und
-- Reihenfolge. Zu jedem Thema lädt er dort die Videos hoch (wie bisher über
-- lern_themavideo). App und Website zeigen nur noch diese Themen.
--
-- Alte Themen, zu denen schon Videos hochgeladen wurden, werden übernommen
-- (ohne Bild), damit die Videos nicht verschwinden. Sie lassen sich im Manager
-- umbenennen, mit Bild versehen oder löschen.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher muss Abschnitt 26 (update-manager.sql) gelaufen sein.
-- Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql (Abschnitt 30).

-- a) Themen ----------------------------------------------------------------------
-- Die Kennung besteht aus Kleinbuchstaben (wie bei den Themenvideos üblich),
-- damit Videos und Dateiordner („thema-<id>/“) unverändert funktionieren.
create table if not exists public.lern_thema (
  id          text primary key check (id ~ '^[a-z]{2,16}$'),
  titel       text not null check (char_length(btrim(titel)) between 1 and 60),
  kurz        text not null default '' check (char_length(kurz) <= 160),
  bild_pfad   text,
  position    integer not null default 0,
  erstellt_am timestamptz not null default now()
);
create index if not exists lern_thema_position on public.lern_thema (position, erstellt_am);

alter table public.lern_thema enable row level security;
drop policy if exists "lern_thema_lesen" on public.lern_thema;
create policy "lern_thema_lesen" on public.lern_thema for select to anon, authenticated using (true);
revoke all on public.lern_thema from anon, authenticated;
grant select on public.lern_thema to anon, authenticated;

-- Alte Themen mit Videos übernehmen
insert into public.lern_thema (id, titel, kurz, position)
select a.id, a.titel, a.kurz, a.pos
  from (values
    ('gefahren', 'Gefahrenlehre', 'Gefahren früh erkennen und richtig reagieren', 0),
    ('vorfahrt', 'Vorfahrt & Vorrang', 'Wer fährt zuerst – an Kreuzungen und im Kreisverkehr', 1),
    ('zeichen', 'Verkehrszeichen', 'Gefahr-, Vorschrift- und Richtzeichen', 2),
    ('umwelt', 'Umweltschutz', 'Spritsparend, leise und vorausschauend fahren', 3),
    ('technik', 'Technik', 'Reifen, Bremsen, Kontrollleuchten', 4),
    ('manoever', 'Verhalten im Verkehr', 'Überholen, Abbiegen, Einordnen', 5),
    ('tempo', 'Tempo & Abstand', 'Geschwindigkeit, Sicherheitsabstand, Sicht', 6),
    ('parken', 'Halten & Parken', 'Wo du halten und parken darfst', 7),
    ('autobahn', 'Autobahn & Sonderfälle', 'Rettungsgasse, Bahnübergang, Schulbus', 8),
    ('mensch', 'Mensch & Recht', 'Alkohol, Müdigkeit, Probezeit, Handy', 9),
    ('zahlen', 'Zahlen & Formeln', 'Reaktionsweg, Bremsweg, Anhalteweg', 10)
  ) as a(id, titel, kurz, pos)
 where exists (select 1 from public.lern_themavideo v where v.thema_id = a.id)
on conflict (id) do nothing;

-- b) Speicher für Themenbilder (öffentlich lesbar, schreiben nur der Inhaber) -------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lern-themenbilder', 'lern-themenbilder', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lern_themenbild_hochladen" on storage.objects;
create policy "lern_themenbild_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-themenbilder' and public.lern_ist_inhaber());

drop policy if exists "lern_themenbild_lesen" on storage.objects;
create policy "lern_themenbild_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'lern-themenbilder' and public.lern_ist_inhaber());

drop policy if exists "lern_themenbild_loeschen" on storage.objects;
create policy "lern_themenbild_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lern-themenbilder' and public.lern_ist_inhaber());

-- c) Funktionen für den Inhaber ---------------------------------------------------------
create or replace function public.lern_thema_anlegen(p_titel text, p_kurz text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_zeichen constant text := 'abcdefghijklmnopqrstuvwxyz';
  v_id      text;
  v_bytes   bytea;
  i         integer;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if char_length(btrim(coalesce(p_titel, ''))) not between 1 and 60 then raise exception 'Bitte gib einen Titel mit bis zu 60 Zeichen ein.'; end if;
  if char_length(coalesce(p_kurz, '')) > 160 then raise exception 'Die Beschreibung darf höchstens 160 Zeichen lang sein.'; end if;
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_id := '';
    for i in 0..11 loop
      v_id := v_id || substr(v_zeichen, 1 + (get_byte(v_bytes, i) % 26), 1);
    end loop;
    exit when not exists (select 1 from public.lern_thema where id = v_id);
  end loop;
  insert into public.lern_thema (id, titel, kurz, position)
  values (v_id, btrim(p_titel), btrim(coalesce(p_kurz, '')),
          coalesce((select max(position) + 1 from public.lern_thema), 0));
  return v_id;
end;
$$;

create or replace function public.lern_thema_aendern(p_id text, p_titel text, p_kurz text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if char_length(btrim(coalesce(p_titel, ''))) not between 1 and 60 then raise exception 'Bitte gib einen Titel mit bis zu 60 Zeichen ein.'; end if;
  if char_length(coalesce(p_kurz, '')) > 160 then raise exception 'Die Beschreibung darf höchstens 160 Zeichen lang sein.'; end if;
  update public.lern_thema set titel = btrim(p_titel), kurz = btrim(coalesce(p_kurz, '')) where id = p_id;
  if not found then raise exception 'Thema nicht gefunden'; end if;
end;
$$;

-- Neues Bild eintragen (die Datei ist schon hochgeladen). Liefert den alten Pfad,
-- damit die App die alte Datei löschen kann. NULL entfernt das Bild.
create or replace function public.lern_thema_bild_setzen(p_id text, p_pfad text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_alt text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if p_pfad is not null and p_pfad !~ ('^' || p_id || '/[A-Za-z0-9_-]{4,64}\.(jpg|jpeg|png|webp)$') then raise exception 'Ungültiger Pfad'; end if;
  select bild_pfad into v_alt from public.lern_thema where id = p_id for update;
  if not found then raise exception 'Thema nicht gefunden'; end if;
  update public.lern_thema set bild_pfad = p_pfad where id = p_id;
  return v_alt;
end;
$$;

-- Eine Stelle nach oben (-1) oder unten (+1).
create or replace function public.lern_thema_verschieben(p_id text, p_richtung integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_liste text[];
  v_i     integer;
  v_j     integer;
  v_tmp   text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  select array_agg(id order by position, erstellt_am) into v_liste from public.lern_thema;
  v_i := array_position(v_liste, p_id);
  if v_i is null then raise exception 'Thema nicht gefunden'; end if;
  v_j := v_i + sign(p_richtung)::integer;
  if v_j < 1 or v_j > cardinality(v_liste) then return; end if;
  v_tmp := v_liste[v_i];
  v_liste[v_i] := v_liste[v_j];
  v_liste[v_j] := v_tmp;
  update public.lern_thema t set position = s.pos - 1
    from unnest(v_liste) with ordinality as s(id, pos)
   where t.id = s.id;
end;
$$;

-- Thema mit allen Videos löschen. Liefert die Dateipfade (Bild und Videos),
-- die die App danach aus dem Speicher entfernt.
create or replace function public.lern_thema_loeschen(p_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_bild   text;
  v_videos text[];
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  select bild_pfad into v_bild from public.lern_thema where id = p_id;
  if not found then raise exception 'Thema nicht gefunden'; end if;
  select coalesce(array_agg(pfad), '{}') into v_videos from public.lern_themavideo where thema_id = p_id;
  delete from public.lern_themavideo where thema_id = p_id;
  delete from public.lern_thema where id = p_id;
  return jsonb_build_object('bild', v_bild, 'videos', to_jsonb(v_videos));
end;
$$;

revoke execute on function public.lern_thema_anlegen(text, text) from public, anon;
revoke execute on function public.lern_thema_aendern(text, text, text) from public, anon;
revoke execute on function public.lern_thema_bild_setzen(text, text) from public, anon;
revoke execute on function public.lern_thema_verschieben(text, integer) from public, anon;
revoke execute on function public.lern_thema_loeschen(text) from public, anon;
grant execute on function public.lern_thema_anlegen(text, text) to authenticated;
grant execute on function public.lern_thema_aendern(text, text, text) to authenticated;
grant execute on function public.lern_thema_bild_setzen(text, text) to authenticated;
grant execute on function public.lern_thema_verschieben(text, integer) to authenticated;
grant execute on function public.lern_thema_loeschen(text) to authenticated;

-- d) Videos nur noch zu vorhandenen Themen --------------------------------------------
create or replace function public.lern_themavideo_hinzufuegen(p_thema text, p_titel text, p_pfad text, p_dauer real default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if p_thema is null or p_thema !~ '^[a-z]{2,16}$' then raise exception 'Ungültiges Thema'; end if;
  if not exists (select 1 from public.lern_thema where id = p_thema) then raise exception 'Thema nicht gefunden'; end if;
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

-- Änderungen an Themen sofort an App und Website (Supabase Realtime).
do $$
begin
  alter publication supabase_realtime add table public.lern_thema;
exception when others then
  null; -- schon drin oder Realtime nicht verfügbar
end $$;

notify pgrst, 'reload schema';
