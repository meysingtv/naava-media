-- 24) Inhaber live neben einem Creator ------------------------------------------
-- Es läuft immer nur ein Creator-Live: Ist jemand live, kann kein Creator dazu.
-- Der Inhaber ist die Ausnahme – er geht auch dann live, und das andere Live läuft
-- weiter. Laufen zwei Lives, scrollt man in Clips unter „Live“ durch beide und
-- tippt eins an. Die Mitteilung „… ist jetzt live“ öffnet genau dieses Live.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher muss Abschnitt 22 (update-creator.sql) gelaufen sein.
-- Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql (Abschnitt 24).

-- a) Live vorbereiten: Der Inhaber beendet nur noch sein eigenes altes Live.
create or replace function public.lern_live_vorbereiten(p_titel text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_live public.lern_live;
begin
  if not public.lern_darf_live() then
    raise exception 'Live gehen dürfen nur der Inhaber und freigeschaltete Creator.';
  end if;
  -- Hängen gebliebene Lives (ohne Lebenszeichen) aufräumen.
  update public.lern_live set status = 'beendet', beendet_am = now()
   where status <> 'beendet' and puls_am < now() - interval '2 minutes';
  update public.lern_live set status = 'beendet', beendet_am = now(), beendet_von = 'gastgeber'
   where gastgeber_id = v_ich and status <> 'beendet';
  -- Creator nur, wenn gerade niemand live ist; der Inhaber geht immer.
  if not public.lern_ist_inhaber() and exists (select 1 from public.lern_live where status = 'live') then
    raise exception 'Gerade ist schon jemand live. Versuch es später nochmal.';
  end if;
  insert into public.lern_live (titel, raum, gastgeber_id)
  values (left(btrim(coalesce(p_titel, '')), 80), 'live-' || replace(gen_random_uuid()::text, '-', ''), v_ich)
  returning * into v_live;
  return jsonb_build_object('id', v_live.id, 'raum', v_live.raum);
end;
$$;

-- b) Mitteilung mit Ziel (öffnet genau dieses Live).
create or replace function lern_intern.live_push(p_titel text, p_text text, p_url text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_paket jsonb;
begin
  for v_paket in
    select jsonb_agg(jsonb_build_object(
             'to', t.token, 'title', p_titel, 'body', p_text, 'sound', 'default',
             'data', jsonb_build_object('url', coalesce(p_url, '/live'))))
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

create or replace function public.lern_live_freigeben(p_live uuid, p_titel text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_live public.lern_live;
  v_name text;
begin
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  if not public.lern_ist_inhaber()
     and exists (select 1 from public.lern_live where status = 'live' and id <> p_live and puls_am > now() - interval '2 minutes') then
    raise exception 'Gerade ist schon jemand live. Versuch es später nochmal.';
  end if;
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
    coalesce(nullif(v_live.titel, ''), 'Komm rein und stell deine Fragen!'),
    '/live?id=' || v_live.id::text);
end;
$$;

-- c) Ein Live als JSON – für die Liste und das „aktuelle“ Live.
create or replace function lern_intern.live_info(p_live public.lern_live)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'id', p_live.id,
           'titel', p_live.titel,
           'gestartet_am', p_live.gestartet_am,
           'jetzt', now(),
           'gastgeber', (
             select jsonb_build_object(
                      'id', p.id,
                      'name', coalesce(nullif(btrim(p.name), ''), p.benutzername),
                      'bild_pfad', p.bild_pfad,
                      'avatar_farbe', p.avatar_farbe)
               from public.lern_profil p
              where p.id = coalesce(p_live.gastgeber_id, (
                      select u.id
                        from public.lern_inhaber i
                        join auth.users u on lower(u.email) = lower(i.email)
                        join public.lern_profil pp on pp.id = u.id
                       order by pp.created_at
                       limit 1))),
           'bild', case when p_live.bild_pfad is null then null else jsonb_build_object(
             'pfad', p_live.bild_pfad, 'seite', p_live.bild_seite, 'x', p_live.bild_x, 'y', p_live.bild_y, 'groesse', p_live.bild_groesse) end,
           'rad', p_live.rad,
           'tafel', p_live.tafel,
           'angepinnt', p_live.angepinnt)
$$;

-- Alle laufenden Lives (höchstens eins vom Inhaber und eins von einem Creator),
-- das des Inhabers zuerst. Für alle, auch Gäste.
create or replace function public.lern_live_liste()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'jetzt', now(),
           'lives', coalesce((
             select jsonb_agg(lern_intern.live_info(l)
                              order by (l.gastgeber_id = any(lern_intern.inhaber_ids())) desc nulls last, l.gestartet_am desc)
               from public.lern_live l
              where l.status = 'live'
                and l.puls_am > now() - interval '2 minutes'), '[]'::jsonb))
$$;

-- Das neueste Live (für ältere App-Versionen).
create or replace function public.lern_live_aktuell()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select lern_intern.live_info(l)
    from public.lern_live l
   where l.status = 'live'
     and l.puls_am > now() - interval '2 minutes'
   order by l.gestartet_am desc
   limit 1
$$;

revoke execute on function lern_intern.live_push(text, text, text) from public, anon, authenticated;
revoke execute on function lern_intern.live_info(public.lern_live) from public, anon, authenticated;
revoke execute on function public.lern_live_vorbereiten(text) from public, anon;
revoke execute on function public.lern_live_freigeben(uuid, text) from public, anon;
revoke execute on function public.lern_live_liste() from public;
revoke execute on function public.lern_live_aktuell() from public;
grant execute on function public.lern_live_vorbereiten(text) to authenticated;
grant execute on function public.lern_live_freigeben(uuid, text) to authenticated;
grant execute on function public.lern_live_liste() to anon, authenticated;
grant execute on function public.lern_live_aktuell() to anon, authenticated;

notify pgrst, 'reload schema';
