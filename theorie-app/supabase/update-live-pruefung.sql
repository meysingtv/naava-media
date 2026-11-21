-- 19) Live: Prüfung für alle und Bild aus der Galerie -------------------------
-- Live-Prüfung: Der Inhaber startet im Live für alle gleichzeitig eine Prüfung
-- wie in der App (Fehlerpunkte, bestanden bis 10 Punkte, zwei falsche
-- 5-Punkte-Fragen fallen durch). Die Lösung kennt nur der Server – er wertet
-- beim Abgeben und beim Ende für alle. Dazu ein Bild aus der Galerie des
-- Inhabers, das er im Live frei verschiebt und vergrößert.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher müssen update-live.sql (17) und update-live-quiz.sql (18)
-- gelaufen sein. Mehrfaches Ausführen ist unschädlich. Steht auch in
-- schema.sql (Abschnitt 19).

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
