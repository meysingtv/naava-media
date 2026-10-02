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
