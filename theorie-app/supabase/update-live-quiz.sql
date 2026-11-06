-- 18) Live-Quiz: Prüfungsfragen im Live --------------------------------------
-- Der Inhaber blendet im Live eine Frage aus dem Katalog ein, alle Zuschauer
-- tippen ihre Antwort. Nach Ablauf der Zeit kommt die Auflösung mit Verteilung,
-- Punkten (schnell + richtig = mehr) und einer Rangliste über das ganze Live.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher muss update-live.sql (Abschnitt 17) gelaufen sein.
-- Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql (Abschnitt 18).

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
