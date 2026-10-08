-- 25) Starke Beleidigungen im Live-Chat still ausblenden -------------------------
-- Statt „Bitte bleib freundlich.“ wird eine Nachricht mit starken Beleidigungen
-- gespeichert, aber ausgeblendet: Nur der Gastgeber des Lives, der Inhaber der App
-- und der Schreiber selbst sehen sie – alle anderen nicht. Keine Meldung, kein
-- Hinweis. Anpinnen geht bei solchen Nachrichten nicht.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher muss Abschnitt 22 (update-creator.sql) gelaufen sein.
-- Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql (Abschnitt 25).

alter table public.lern_live_chat add column if not exists versteckt boolean not null default false;

-- Starke Beleidigungen erkennen – auch mit Ziffern statt Buchstaben (f0tze),
-- Sternchen, Punkten oder Leerzeichen dazwischen (h.u.r.e.n.s.o.h.n).
create or replace function lern_intern.live_beleidigung(p_text text)
returns boolean
language sql immutable
as $$
  with t as (
    select translate(lower(coalesce(p_text, '')), '0134@$€', 'oieaase') as roh
  )
  select lern_intern.live_grob(roh)
      or regexp_replace(roh, '[^a-zäöüß ]', '', 'g') ~ '(hurens(o|ö)hn|huren(kind|bock)|wi(ch|x+)er|fotze|missgeburt|\mspast|schlampe|\mnutte|arschloch|\mfick|\mhure\M|schwuchtel|\mneger|kanake|bastard|drecks(au|kerl|stück|stueck|fotze)|\mmongo\M|kill (dich|yourself)|\mkys\M|bring dich um|häng dich auf|haeng dich auf|sieg heil|heil hitler)'
      or regexp_replace(roh, '[^a-zäöüß]', '', 'g') ~ '(hurens(o|ö)hn|fotze|missgeburt|arschloch|schwuchtel|wichser|wixxer|heilhitler|siegheil)'
    from t
$$;

-- Darf ich ausgeblendete Nachrichten dieses Lives sehen? Gastgeber und Inhaber.
create or replace function public.lern_live_versteckt_sehen(p_live uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (exists (select 1 from public.lern_live l where l.id = p_live and l.gastgeber_id = auth.uid())
          or public.lern_ist_inhaber())
$$;

drop policy if exists lern_live_chat_lesen on public.lern_live_chat;
create policy lern_live_chat_lesen on public.lern_live_chat
  for select to anon, authenticated
  using (
    exists (select 1 from public.lern_live l where l.id = live_id and l.status <> 'vorbereitung')
    and (not versteckt or user_id = auth.uid() or public.lern_live_versteckt_sehen(live_id))
  );

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
  if not lern_intern.live_steuern(p_live) then
    perform public.lern_limit_pruefen('live_chat_kurz', 1, interval '2 seconds');
    perform public.lern_limit_pruefen('live_chat', 12, interval '1 minute');
  end if;
  -- Starke Beleidigungen: gespeichert, aber nur für Gastgeber, Inhaber und Schreiber sichtbar.
  insert into public.lern_live_chat (live_id, user_id, name, bild_pfad, text, versteckt)
  select p_live, v_ich, coalesce(nullif(btrim(p.name), ''), p.benutzername), p.bild_pfad, v_text,
         lern_intern.live_beleidigung(v_text)
    from public.lern_profil p
   where p.id = v_ich
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.lern_live_anpinnen(p_live uuid, p_nachricht bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_n public.lern_live_chat;
begin
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  if p_nachricht is null then
    update public.lern_live set angepinnt = null where id = p_live;
    return;
  end if;
  select * into v_n from public.lern_live_chat where id = p_nachricht and live_id = p_live and not geloescht;
  if not found then raise exception 'Die Nachricht gibt es nicht mehr.'; end if;
  if v_n.versteckt then raise exception 'Diese Nachricht ist für die Zuschauer ausgeblendet.'; end if;
  update public.lern_live
     set angepinnt = jsonb_build_object('id', v_n.id, 'user_id', v_n.user_id, 'name', v_n.name,
                                        'bild_pfad', v_n.bild_pfad, 'text', v_n.text, 'am', now())
   where id = p_live and status <> 'beendet';
end;
$$;

revoke execute on function lern_intern.live_beleidigung(text) from public, anon, authenticated;
revoke execute on function public.lern_live_versteckt_sehen(uuid) from public;
revoke execute on function public.lern_live_schreiben(uuid, text) from public, anon;
revoke execute on function public.lern_live_anpinnen(uuid, bigint) from public, anon;
grant execute on function public.lern_live_versteckt_sehen(uuid) to anon, authenticated;
grant execute on function public.lern_live_schreiben(uuid, text) to authenticated;
grant execute on function public.lern_live_anpinnen(uuid, bigint) to authenticated;

notify pgrst, 'reload schema';
