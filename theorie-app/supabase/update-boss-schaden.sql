-- Wochen-Boss: Schaden je Crew-Mitglied ------------------------------------
-- Die Boss-Seite zeigt, wer in dieser Woche wie viel Schaden gemacht hat.
-- Dieses Update liefert den Wert je Mitglied mit (Feld „schaden“). Ohne das
-- Update zählt die App nur die zuletzt geladenen Treffer zusammen.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql
-- (Abschnitt 16) und update-crew.sql.

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
