-- 22) Live-Creator und angepinnte Kommentare ----------------------------------
-- Wer live gehen möchte, bewirbt sich in der App (Name, Telefon, Alter, Beruf …).
-- Der Inhaber sieht die Bewerbungen in den Einstellungen, nimmt an oder lehnt ab.
-- Angenommene Creator gehen live wie der Inhaber – mit Quiz, Prüfung, Rad, Tafel
-- und Bild, aber nur in ihrem eigenen Live. Der Inhaber kann jeden Zugang jederzeit
-- entziehen und jedes Live sofort beenden. Dazu: Der Gastgeber pinnt eine
-- Chat-Nachricht oben an, alle sehen sie.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher müssen die Live-Updates (Abschnitt 17 bis 20) gelaufen sein.
-- Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql (Abschnitt 22).

-- a) Bewerbungen ---------------------------------------------------------------
create table if not exists public.lern_creator_bewerbung (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 80),
  telefon        text not null check (char_length(telefon) between 6 and 30),
  alter_jahre    integer not null check (alter_jahre between 18 and 99),
  beruf          text not null check (char_length(beruf) between 2 and 80),
  ort            text not null default '' check (char_length(ort) <= 80),
  themen         text not null check (char_length(themen) between 10 and 1000),
  erfahrung      text not null default '' check (char_length(erfahrung) <= 1000),
  social         text not null default '' check (char_length(social) <= 200),
  status         text not null default 'offen'
                 check (status in ('offen', 'angenommen', 'abgelehnt', 'entzogen', 'zurueckgezogen')),
  notiz          text not null default '' check (char_length(notiz) <= 500),
  erstellt_am    timestamptz not null default now(),
  entschieden_am timestamptz
);
create index if not exists lern_creator_bewerbung_user_idx on public.lern_creator_bewerbung (user_id, erstellt_am desc);
-- Je Person höchstens eine offene oder angenommene Bewerbung.
create unique index if not exists lern_creator_bewerbung_aktiv on public.lern_creator_bewerbung (user_id)
  where status in ('offen', 'angenommen');

alter table public.lern_creator_bewerbung enable row level security;
-- Lesen: die eigene Bewerbung und (Inhaber) alle. Schreiben nur über die Funktionen unten.
drop policy if exists lern_creator_bewerbung_lesen on public.lern_creator_bewerbung;
create policy lern_creator_bewerbung_lesen on public.lern_creator_bewerbung
  for select to authenticated using (user_id = auth.uid() or public.lern_ist_inhaber());
revoke all on public.lern_creator_bewerbung from anon, authenticated;
grant select on public.lern_creator_bewerbung to authenticated;

-- Live: Gastgeber (Inhaber oder Creator), angepinnte Nachricht, wer beendet hat.
alter table public.lern_live
  add column if not exists gastgeber_id uuid references auth.users(id) on delete set null,
  add column if not exists angepinnt    jsonb,
  add column if not exists beendet_von  text check (beendet_von in ('gastgeber', 'inhaber'));
create index if not exists lern_live_gastgeber_idx on public.lern_live (gastgeber_id, status);

-- b) Wer darf live gehen und welches Live steuern? -------------------------------
create or replace function public.lern_ist_creator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.lern_creator_bewerbung b where b.user_id = auth.uid() and b.status = 'angenommen')
$$;

create or replace function public.lern_darf_live()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.lern_ist_inhaber() or public.lern_ist_creator() $$;

-- Inhaber: jedes Live. Creator: nur das eigene, solange freigeschaltet und nicht beendet.
create or replace function lern_intern.live_steuern(p_live uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.lern_ist_inhaber()
      or (public.lern_ist_creator()
          and exists (select 1 from public.lern_live l
                       where l.id = p_live and l.gastgeber_id = auth.uid() and l.status <> 'beendet'))
$$;

-- Ist die angemeldete Person Gastgeber dieses Lives? (Gastgeber spielen nicht mit.)
create or replace function lern_intern.live_ist_gastgeber(p_live uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.lern_live l where l.id = p_live and l.gastgeber_id = auth.uid()) $$;

create or replace function lern_intern.inhaber_ids()
returns uuid[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(u.id), '{}')
    from auth.users u
    join public.lern_inhaber i on lower(i.email) = lower(u.email)
$$;

-- c) Live: wer liest was ------------------------------------------------------------

-- Die eigene Vorbereitung sieht der Gastgeber (für die Echtzeit, z. B. wenn der
-- Inhaber sie beendet). Sonst wie bisher: alles außer der Vorbereitung.
drop policy if exists lern_live_lesen on public.lern_live;
create policy lern_live_lesen on public.lern_live
  for select to anon, authenticated using (status <> 'vorbereitung' or gastgeber_id = auth.uid());

-- Bewerbungen in Echtzeit (Inhaber sieht neue sofort, Bewerber die Entscheidung).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lern_creator_bewerbung') then
    alter publication supabase_realtime add table public.lern_creator_bewerbung;
  end if;
end $$;

-- Bild im Live: hochladen und löschen dürfen jetzt auch freigeschaltete Creator.
drop policy if exists "lern_live_bild_hochladen" on storage.objects;
create policy "lern_live_bild_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-live' and (storage.foldername(name))[1] = auth.uid()::text and public.lern_darf_live());

drop policy if exists "lern_live_bild_loeschen" on storage.objects;
create policy "lern_live_bild_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lern-live' and (storage.foldername(name))[1] = auth.uid()::text and public.lern_darf_live());

-- d) Live starten, Puls, beenden – für Inhaber und Creator ----------------------
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
  if public.lern_ist_inhaber() then
    -- Der Inhaber geht immer live – ein anderes Live endet dabei.
    update public.lern_live
       set status = 'beendet', beendet_am = now(),
           beendet_von = case when gastgeber_id = v_ich then 'gastgeber' else 'inhaber' end
     where status <> 'beendet';
  else
    update public.lern_live set status = 'beendet', beendet_am = now(), beendet_von = 'gastgeber'
     where gastgeber_id = v_ich and status <> 'beendet';
    if exists (select 1 from public.lern_live where status = 'live') then
      raise exception 'Gerade ist schon jemand live. Versuch es später nochmal.';
    end if;
  end if;
  insert into public.lern_live (titel, raum, gastgeber_id)
  values (left(btrim(coalesce(p_titel, '')), 80), 'live-' || replace(gen_random_uuid()::text, '-', ''), v_ich)
  returning * into v_live;
  return jsonb_build_object('id', v_live.id, 'raum', v_live.raum);
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
    coalesce(nullif(v_live.titel, ''), 'Komm rein und stell deine Fragen!'));
end;
$$;

create or replace function public.lern_live_puls(p_live uuid, p_zuschauer integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  update public.lern_live
     set puls_am = now(),
         zuschauer_max = greatest(zuschauer_max, least(coalesce(p_zuschauer, 0), 1000000))
   where id = p_live and status <> 'beendet';
end;
$$;

-- Beenden: der Gastgeber sein eigenes Live, der Inhaber jedes.
create or replace function public.lern_live_beenden(p_live uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  update public.lern_live
     set status = 'beendet', beendet_am = now(),
         beendet_von = case when gastgeber_id = auth.uid() then 'gastgeber' else 'inhaber' end
   where id = p_live and status <> 'beendet';
end;
$$;

-- e) Chat: schreiben, löschen, stummschalten, anpinnen --------------------------
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
  if not lern_intern.live_steuern(p_live) then
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

-- Nachricht entfernen: eigene, im eigenen Live jede (Gastgeber) oder (Inhaber) jede.
create or replace function public.lern_live_loeschen(p_nachricht bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  update public.lern_live_chat c
     set geloescht = true, text = ''
   where c.id = p_nachricht
     and not c.geloescht
     and (c.user_id = auth.uid() or public.lern_ist_inhaber() or lern_intern.live_steuern(c.live_id));
  if found then
    update public.lern_live set angepinnt = null
     where angepinnt is not null and angepinnt->>'id' = p_nachricht::text;
  end if;
end;
$$;

-- Stummschalten: Inhaber und Gastgeber eines laufenden Lives. Freigeben nur der Inhaber.
create or replace function public.lern_live_stummschalten(p_nutzer uuid, p_stumm boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not (public.lern_ist_inhaber()
          or (p_stumm and public.lern_ist_creator()
              and exists (select 1 from public.lern_live where gastgeber_id = auth.uid() and status <> 'beendet'))) then
    raise exception 'Nur für den Gastgeber eines Lives';
  end if;
  if p_nutzer = auth.uid() then raise exception 'Du kannst dich nicht selbst stummschalten.'; end if;
  if p_stumm and p_nutzer = any(lern_intern.inhaber_ids()) then
    raise exception 'Den Inhaber kannst du nicht stummschalten.';
  end if;
  if p_stumm then
    insert into public.lern_live_stumm (user_id) values (p_nutzer) on conflict do nothing;
    update public.lern_live_chat set geloescht = true, text = ''
     where user_id = p_nutzer and not geloescht
       and live_id in (select id from public.lern_live where status <> 'beendet');
    update public.lern_live set angepinnt = null
     where status <> 'beendet' and angepinnt->>'user_id' = p_nutzer::text;
  else
    delete from public.lern_live_stumm where user_id = p_nutzer;
  end if;
end;
$$;

-- Gastgeber: eine Nachricht oben anpinnen (oder lösen mit null). Alle sehen sie.
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
  update public.lern_live
     set angepinnt = jsonb_build_object('id', v_n.id, 'user_id', v_n.user_id, 'name', v_n.name,
                                        'bild_pfad', v_n.bild_pfad, 'text', v_n.text, 'am', now())
   where id = p_live and status <> 'beendet';
end;
$$;

-- f) Das laufende Live – jetzt mit Gastgeber (Inhaber oder Creator) und Anpinnung
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
               from public.lern_profil p
              where p.id = coalesce(l.gastgeber_id, (
                      select u.id
                        from public.lern_inhaber i
                        join auth.users u on lower(u.email) = lower(i.email)
                        join public.lern_profil pp on pp.id = u.id
                       order by pp.created_at
                       limit 1))),
           'bild', case when l.bild_pfad is null then null else jsonb_build_object(
             'pfad', l.bild_pfad, 'seite', l.bild_seite, 'x', l.bild_x, 'y', l.bild_y, 'groesse', l.bild_groesse) end,
           'rad', l.rad,
           'tafel', l.tafel,
           'angepinnt', l.angepinnt)
    from public.lern_live l
   where l.status = 'live'
     and l.puls_am > now() - interval '2 minutes'
   order by l.gestartet_am desc
   limit 1
$$;

-- g) Bewerben und Status ----------------------------------------------------------
create or replace function public.lern_creator_bewerben(
  p_name text, p_telefon text, p_alter integer, p_beruf text, p_ort text,
  p_themen text, p_erfahrung text, p_social text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ich       uuid := auth.uid();
  v_id        uuid;
  v_name      text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 80);
  v_telefon   text := left(btrim(regexp_replace(coalesce(p_telefon, ''), '\s+', ' ', 'g')), 30);
  v_beruf     text := left(btrim(regexp_replace(coalesce(p_beruf, ''), '\s+', ' ', 'g')), 80);
  v_ort       text := left(btrim(regexp_replace(coalesce(p_ort, ''), '\s+', ' ', 'g')), 80);
  v_themen    text := left(btrim(coalesce(p_themen, '')), 1000);
  v_erfahrung text := left(btrim(coalesce(p_erfahrung, '')), 1000);
  v_social    text := left(btrim(coalesce(p_social, '')), 200);
begin
  if v_ich is null then raise exception 'Bitte melde dich an.'; end if;
  if public.lern_ist_inhaber() then raise exception 'Als Inhaber kannst du sowieso live gehen.'; end if;
  if exists (select 1 from public.lern_creator_bewerbung where user_id = v_ich and status = 'angenommen') then
    raise exception 'Du bist schon freigeschaltet.';
  end if;
  if exists (select 1 from public.lern_creator_bewerbung where user_id = v_ich and status = 'offen') then
    raise exception 'Deine Bewerbung liegt schon vor – wir melden uns.';
  end if;
  if char_length(v_name) < 2 then raise exception 'Bitte gib deinen Namen an.'; end if;
  if v_telefon !~ '^\+?[0-9][0-9 ()/-]{5,28}$' then raise exception 'Bitte gib eine gültige Telefonnummer an.'; end if;
  if p_alter is null or p_alter < 18 then raise exception 'Live gehen kannst du ab 18 Jahren.'; end if;
  if p_alter > 99 then raise exception 'Bitte prüfe dein Alter.'; end if;
  if char_length(v_beruf) < 2 then raise exception 'Bitte gib deinen Beruf an.'; end if;
  if char_length(v_themen) < 10 then raise exception 'Schreib kurz, worüber du live gehen möchtest (mindestens 10 Zeichen).'; end if;
  perform public.lern_limit_pruefen('creator_bewerbung', 3, interval '1 day');
  insert into public.lern_creator_bewerbung (user_id, name, telefon, alter_jahre, beruf, ort, themen, erfahrung, social)
  values (v_ich, v_name, v_telefon, p_alter, v_beruf, v_ort, v_themen, v_erfahrung, v_social)
  returning id into v_id;
  perform lern_intern.push_senden(lern_intern.inhaber_ids(), 'Neue Creator-Bewerbung',
                                  v_name || ' möchte live gehen.', '/creator-verwaltung');
  return v_id;
end;
$$;

-- Die eigene (neueste) Bewerbung – oder null.
create or replace function public.lern_creator_status()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select to_jsonb(x)
    from (select b.id, b.status, b.notiz, b.name, b.erstellt_am, b.entschieden_am
            from public.lern_creator_bewerbung b
           where b.user_id = auth.uid()
           order by b.erstellt_am desc
           limit 1) x
$$;

create or replace function public.lern_creator_zurueckziehen()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Bitte melde dich an.'; end if;
  update public.lern_creator_bewerbung set status = 'zurueckgezogen', entschieden_am = now()
   where user_id = auth.uid() and status = 'offen';
end;
$$;

-- h) Inhaber: Bewerbungen sehen, entscheiden, Zugang entziehen ---------------------
create or replace function public.lern_creator_liste()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(z) order by z.rang, z.erstellt_am desc)
      from (select b.*,
                   case b.status when 'offen' then 0 when 'angenommen' then 1 else 2 end as rang,
                   p.benutzername,
                   p.bild_pfad,
                   p.avatar_farbe,
                   u.email,
                   (select l.id from public.lern_live l
                     where l.gastgeber_id = b.user_id and l.status = 'live'
                       and l.puls_am > now() - interval '2 minutes'
                     order by l.gestartet_am desc limit 1) as live_id
              from public.lern_creator_bewerbung b
              left join public.lern_profil p on p.id = b.user_id
              left join auth.users u on u.id = b.user_id
             order by b.erstellt_am desc
             limit 300) z), '[]'::jsonb);
end;
$$;

create or replace function public.lern_creator_entscheiden(p_id uuid, p_annehmen boolean, p_notiz text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_b public.lern_creator_bewerbung;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  select * into v_b from public.lern_creator_bewerbung where id = p_id for update;
  if not found then raise exception 'Bewerbung nicht gefunden'; end if;
  if p_annehmen then
    if v_b.status = 'angenommen' then return; end if;
    if v_b.status = 'zurueckgezogen' then raise exception 'Die Bewerbung wurde zurückgezogen.'; end if;
    -- Schon über eine andere Bewerbung freigeschaltet? Dann ist nichts zu tun.
    if exists (select 1 from public.lern_creator_bewerbung
                where user_id = v_b.user_id and status = 'angenommen' and id <> p_id) then
      return;
    end if;
    update public.lern_creator_bewerbung set status = 'zurueckgezogen', entschieden_am = now()
     where user_id = v_b.user_id and status = 'offen' and id <> p_id;
    update public.lern_creator_bewerbung
       set status = 'angenommen', notiz = left(btrim(coalesce(p_notiz, '')), 500), entschieden_am = now()
     where id = p_id;
    perform lern_intern.push_senden(array[v_b.user_id], 'Du bist jetzt Live-Creator 🎉',
                                    'Deine Bewerbung wurde angenommen – du kannst jetzt in Clips unter „Live“ live gehen.',
                                    '/creator-bewerbung');
  else
    if v_b.status <> 'offen' then raise exception 'Über diese Bewerbung ist schon entschieden.'; end if;
    update public.lern_creator_bewerbung
       set status = 'abgelehnt', notiz = left(btrim(coalesce(p_notiz, '')), 500), entschieden_am = now()
     where id = p_id;
    perform lern_intern.push_senden(array[v_b.user_id], 'Deine Creator-Bewerbung',
                                    'Leider hat es diesmal nicht geklappt.', '/creator-bewerbung');
  end if;
end;
$$;

-- Zugang sofort entziehen: Bewerbung „entzogen“, laufende Lives der Person enden.
-- Zurück kommen die LiveKit-Räume, damit die App sie gleich schließen kann.
create or replace function public.lern_creator_entziehen(p_user uuid, p_notiz text)
returns text[]
language plpgsql security definer set search_path = public
as $$
declare
  v_raeume text[];
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if p_user = any(lern_intern.inhaber_ids()) then raise exception 'Dem Inhaber kann man den Zugang nicht entziehen.'; end if;
  update public.lern_creator_bewerbung
     set status = 'entzogen', notiz = left(btrim(coalesce(p_notiz, '')), 500), entschieden_am = now()
   where user_id = p_user and status in ('offen', 'angenommen');
  with beendet as (
    update public.lern_live
       set status = 'beendet', beendet_am = now(), beendet_von = 'inhaber'
     where gastgeber_id = p_user and status <> 'beendet'
    returning raum)
  select coalesce(array_agg(raum), '{}') into v_raeume from beendet;
  perform lern_intern.push_senden(array[p_user], 'Live-Zugang beendet',
                                  'Dein Zugang zum Live-Streaming wurde beendet.', '/creator-bewerbung');
  return v_raeume;
end;
$$;

-- i) Quiz, Prüfung, Tafel, Bild und Rad: steuern darf der Gastgeber dieses Lives
--    (Creator nur ihr eigenes, der Inhaber jedes). Sonst wie in Abschnitt 18 bis 20.
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
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
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
create or replace function public.lern_live_quiz_stand(p_quiz uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_quiz public.lern_live_quiz;
begin
  if not lern_intern.live_steuern((select q.live_id from public.lern_live_quiz q where q.id = p_quiz)) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  select * into v_quiz from public.lern_live_quiz where id = p_quiz;
  if not found then return null; end if;
  return jsonb_build_object(
    'teilnehmer', (select count(*) from public.lern_live_quiz_antwort a where a.quiz_id = p_quiz),
    'verteilung', (select jsonb_agg((select count(*) from public.lern_live_quiz_antwort a
                                      where a.quiz_id = p_quiz and i::smallint = any(a.auswahl)) order by i)
                     from generate_series(0, cardinality(v_quiz.antworten) - 1) i));
end;
$$;
create or replace function public.lern_live_quiz_aufloesen(p_quiz uuid, p_richtig integer[], p_erklaerung text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_quiz    public.lern_live_quiz;
  v_richtig smallint[];
begin
  if not lern_intern.live_steuern((select q.live_id from public.lern_live_quiz q where q.id = p_quiz)) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
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
create or replace function public.lern_live_quiz_weiter(p_quiz uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_quiz public.lern_live_quiz;
begin
  if not lern_intern.live_steuern((select q.live_id from public.lern_live_quiz q where q.id = p_quiz)) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
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
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
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
create or replace function public.lern_live_pruefung_stand(p_pruefung uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not lern_intern.live_steuern((select q.live_id from public.lern_live_pruefung q where q.id = p_pruefung)) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
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
create or replace function public.lern_live_pruefung_verlaengern(p_pruefung uuid, p_sekunden integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
  v_plus integer := least(greatest(coalesce(p_sekunden, 60), 15), 1800);
begin
  if not lern_intern.live_steuern((select q.live_id from public.lern_live_pruefung q where q.id = p_pruefung)) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  update public.lern_live_pruefung q
     set dauer = least(q.dauer + v_plus, 3600),
         endet_am = q.gestartet_am + make_interval(secs => least(q.dauer + v_plus, 3600))
   where q.id = p_pruefung and q.status = 'laeuft'
  returning * into v_p;
  if not found then select * into v_p from public.lern_live_pruefung where id = p_pruefung; end if;
  return to_jsonb(v_p) || jsonb_build_object('jetzt', now());
end;
$$;
create or replace function public.lern_live_pruefung_beenden(p_pruefung uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
begin
  if not lern_intern.live_steuern((select q.live_id from public.lern_live_pruefung q where q.id = p_pruefung)) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  if exists (select 1 from public.lern_live_pruefung where id = p_pruefung and status = 'laeuft') then
    perform lern_intern.live_pruefung_abschliessen(p_pruefung, 'auswertung');
  end if;
  select * into v_p from public.lern_live_pruefung where id = p_pruefung;
  return to_jsonb(v_p) || jsonb_build_object('jetzt', now());
end;
$$;
create or replace function public.lern_live_pruefung_schliessen(p_pruefung uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_p public.lern_live_pruefung;
begin
  if not lern_intern.live_steuern((select q.live_id from public.lern_live_pruefung q where q.id = p_pruefung)) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  if exists (select 1 from public.lern_live_pruefung where id = p_pruefung and status = 'laeuft') then
    perform lern_intern.live_pruefung_abschliessen(p_pruefung, 'fertig');
  end if;
  update public.lern_live_pruefung set status = 'fertig' where id = p_pruefung returning * into v_p;
  return to_jsonb(v_p) || jsonb_build_object('jetzt', now());
end;
$$;
create or replace function public.lern_live_tafel_setzen(p_live uuid, p_tafel jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tafel jsonb;
begin
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  v_tafel := lern_intern.live_tafel_pruefen(p_tafel);
  if v_tafel ->> 'grund' = 'bild'
     and not exists (select 1 from public.lern_live l where l.id = p_live and l.bild_pfad is not null) then
    raise exception 'Es ist gerade kein Bild zu sehen.';
  end if;
  update public.lern_live set tafel = v_tafel where id = p_live and status <> 'beendet';
end;
$$;
create or replace function public.lern_live_bild_setzen(p_live uuid, p_pfad text, p_seite real, p_x real, p_y real, p_groesse real)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_pfad text := nullif(btrim(coalesce(p_pfad, '')), '');
begin
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
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
create or replace function public.lern_live_rad_drehen(p_live uuid, p_themen text[])
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_n integer := coalesce(cardinality(p_themen), 0);
  v_rad jsonb;
begin
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
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
  if not lern_intern.live_steuern(p_live) then raise exception 'Nur für den Gastgeber dieses Lives'; end if;
  update public.lern_live set rad = null where id = p_live;
end;
$$;
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
  if lern_intern.live_ist_gastgeber((select q.live_id from public.lern_live_quiz q where q.id = p_quiz)) then raise exception 'Als Gastgeber spielst du nicht mit.'; end if;
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
  if lern_intern.live_ist_gastgeber(v_p.live_id) then raise exception 'Als Gastgeber schreibst du nicht mit.'; end if;
  if exists (select 1 from public.lern_live_stumm where user_id = auth.uid()) then
    raise exception 'Du kannst gerade nicht mitmachen.';
  end if;
  return v_p;
end;
$$;

-- j) Rechte ------------------------------------------------------------------------
revoke execute on function lern_intern.live_steuern(uuid) from public, anon, authenticated;
revoke execute on function lern_intern.live_ist_gastgeber(uuid) from public, anon, authenticated;
revoke execute on function lern_intern.inhaber_ids() from public, anon, authenticated;
revoke execute on function public.lern_ist_creator() from public, anon;
revoke execute on function public.lern_darf_live() from public, anon;
revoke execute on function public.lern_live_anpinnen(uuid, bigint) from public, anon;
revoke execute on function public.lern_creator_bewerben(text, text, integer, text, text, text, text, text) from public, anon;
revoke execute on function public.lern_creator_status() from public, anon;
revoke execute on function public.lern_creator_zurueckziehen() from public, anon;
revoke execute on function public.lern_creator_liste() from public, anon;
revoke execute on function public.lern_creator_entscheiden(uuid, boolean, text) from public, anon;
revoke execute on function public.lern_creator_entziehen(uuid, text) from public, anon;

grant execute on function public.lern_ist_creator() to authenticated;
grant execute on function public.lern_darf_live() to authenticated;
grant execute on function public.lern_live_anpinnen(uuid, bigint) to authenticated;
grant execute on function public.lern_creator_bewerben(text, text, integer, text, text, text, text, text) to authenticated;
grant execute on function public.lern_creator_status() to authenticated;
grant execute on function public.lern_creator_zurueckziehen() to authenticated;
grant execute on function public.lern_creator_liste() to authenticated;
grant execute on function public.lern_creator_entscheiden(uuid, boolean, text) to authenticated;
grant execute on function public.lern_creator_entziehen(uuid, text) to authenticated;
grant execute on function public.lern_live_aktuell() to anon, authenticated;

notify pgrst, 'reload schema';
