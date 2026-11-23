-- =====================================================================
-- Fahrstunden-Anfragen aus dem Schüler-Portal
-- Schüler fragen einen Wunschtermin an, ein Fahrlehrer nimmt ihn an
-- (dabei entsteht die Fahrstunde) oder lehnt ihn mit Begründung ab.
-- Der Chef schaltet die Funktion für alle an/aus und kann einzelne
-- Schüler sperren. Additiv & idempotent – kann gefahrlos erneut laufen.
-- =====================================================================

-- 1) Schalter und Regeln ----------------------------------------------
alter table public.fahrschule
  add column if not exists anfragen_aktiv           boolean not null default false,
  add column if not exists anfragen_vorlauf_stunden integer not null default 24,
  add column if not exists anfragen_max_offen       integer not null default 3;

alter table public.fahrschueler
  add column if not exists anfragen_gesperrt boolean not null default false;

-- 2) Anfragen ------------------------------------------------------------
create table if not exists public.fahrstunde_anfrage (
  id                   uuid primary key default gen_random_uuid(),
  fahrschule_id        uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id          uuid not null references public.fahrschueler(id) on delete cascade,
  wunsch_fahrlehrer_id uuid references public.fahrlehrer(id) on delete set null,
  datum                date not null,
  uhrzeit              time not null,
  dauer_minuten        integer not null default 45 check (dauer_minuten in (45, 90)),
  notiz                text check (char_length(notiz) <= 500),
  status               text not null default 'offen'
                       check (status in ('offen', 'angenommen', 'abgelehnt', 'zurueckgezogen')),
  antwort              text check (char_length(antwort) <= 500),
  fahrstunde_id        uuid references public.fahrstunde(id) on delete set null,
  bearbeitet_von       uuid references public.fahrlehrer(id) on delete set null,
  bearbeitet_am        timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists fahrstunde_anfrage_schule_status_idx
  on public.fahrstunde_anfrage(fahrschule_id, status);
create index if not exists fahrstunde_anfrage_schueler_idx
  on public.fahrstunde_anfrage(schueler_id);
-- Derselbe Wunschtermin kann nur einmal offen angefragt werden.
create unique index if not exists fahrstunde_anfrage_offen_uq
  on public.fahrstunde_anfrage(schueler_id, datum, uhrzeit) where status = 'offen';

alter table public.fahrstunde_anfrage enable row level security;

-- Team: alles innerhalb der eigenen Fahrschule
drop policy if exists "anfrage_team" on public.fahrstunde_anfrage;
create policy "anfrage_team" on public.fahrstunde_anfrage
  for all to authenticated
  using (fahrschule_id = public.current_fahrschule_id())
  with check (fahrschule_id = public.current_fahrschule_id());

-- Schüler: nur eigene Anfragen LESEN (Schreiben ausschließlich über die Funktionen unten)
drop policy if exists "anfrage_select_schueler" on public.fahrstunde_anfrage;
create policy "anfrage_select_schueler" on public.fahrstunde_anfrage
  for select to authenticated
  using (schueler_id = public.current_schueler_id());

-- 3) Portal: Regeln für den eingeloggten Schüler --------------------------
create or replace function public.portal_anfragen_regeln()
returns table (erlaubt boolean, vorlauf_stunden integer, max_offen integer, offen integer)
language sql stable security definer set search_path = public as $$
  select coalesce(f.anfragen_aktiv, false) and not s.anfragen_gesperrt and s.portal_aktiv,
         f.anfragen_vorlauf_stunden,
         f.anfragen_max_offen,
         (select count(*)::int from public.fahrstunde_anfrage a
           where a.schueler_id = s.id and a.status = 'offen')
    from public.fahrschueler s
    join public.fahrschule f on f.id = s.fahrschule_id
   where s.user_id = auth.uid()
   limit 1;
$$;

-- 4) Portal: Fahrlehrer zur Auswahl (nur Name, keine Kontaktdaten) -------
create or replace function public.portal_fahrlehrer()
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select l.id, l.vorname || ' ' || l.nachname
    from public.fahrlehrer l
   where l.fahrschule_id = (select s.fahrschule_id from public.fahrschueler s where s.user_id = auth.uid() limit 1)
     and l.aktiv
     and l.rolle in ('chef', 'fahrlehrer')
   order by l.nachname, l.vorname;
$$;

-- 5) Portal: Wunschtermin anfragen ----------------------------------------
create or replace function public.fahrstunde_anfragen(
  p_datum      date,
  p_uhrzeit    time,
  p_dauer      integer,
  p_fahrlehrer uuid,
  p_notiz      text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_s      public.fahrschueler%rowtype;
  v_f      public.fahrschule%rowtype;
  v_lehrer uuid;
  v_start  timestamp;
  v_jetzt  timestamp := now() at time zone 'Europe/Berlin';
  v_offen  integer;
  v_id     uuid;
begin
  select * into v_s from public.fahrschueler where user_id = auth.uid() limit 1;
  if v_s.id is null then
    raise exception 'Kein Schülerkonto gefunden.';
  end if;
  select * into v_f from public.fahrschule where id = v_s.fahrschule_id;
  if not coalesce(v_f.anfragen_aktiv, false) or v_s.anfragen_gesperrt or not v_s.portal_aktiv then
    raise exception 'Online-Anfragen sind für dich nicht freigeschaltet.';
  end if;

  if p_dauer not in (45, 90) then
    raise exception 'Bitte 45 oder 90 Minuten wählen.';
  end if;
  if p_uhrzeit < time '06:00' or p_uhrzeit > time '21:00' then
    raise exception 'Bitte eine Uhrzeit zwischen 6:00 und 21:00 Uhr wählen.';
  end if;

  v_start := p_datum + p_uhrzeit;
  if v_start < v_jetzt + make_interval(hours => v_f.anfragen_vorlauf_stunden) then
    raise exception 'Bitte mindestens % Stunden im Voraus anfragen.', v_f.anfragen_vorlauf_stunden;
  end if;
  if v_start > v_jetzt + interval '90 days' then
    raise exception 'Anfragen sind höchstens 90 Tage im Voraus möglich.';
  end if;

  select count(*) into v_offen from public.fahrstunde_anfrage
   where schueler_id = v_s.id and status = 'offen';
  if v_offen >= v_f.anfragen_max_offen then
    raise exception 'Du hast schon % offene Anfragen – warte bitte auf eine Antwort.', v_offen;
  end if;

  if p_fahrlehrer is not null and exists (
    select 1 from public.fahrlehrer l
     where l.id = p_fahrlehrer and l.fahrschule_id = v_s.fahrschule_id and l.aktiv
  ) then
    v_lehrer := p_fahrlehrer;
  end if;

  insert into public.fahrstunde_anfrage
    (fahrschule_id, schueler_id, wunsch_fahrlehrer_id, datum, uhrzeit, dauer_minuten, notiz)
  values
    (v_s.fahrschule_id, v_s.id, v_lehrer, p_datum, p_uhrzeit, p_dauer, nullif(left(trim(coalesce(p_notiz, '')), 500), ''))
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'Diesen Termin hast du bereits angefragt.';
end; $$;

-- 6) Portal: offene Anfrage zurückziehen ----------------------------------
create or replace function public.fahrstunde_anfrage_zurueckziehen(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.fahrstunde_anfrage
     set status = 'zurueckgezogen', bearbeitet_am = now()
   where id = p_id
     and schueler_id = public.current_schueler_id()
     and status = 'offen'
  returning id into v_id;
  return v_id is not null;
end; $$;

-- 7) Team: annehmen – legt die Fahrstunde an (RLS gilt: SECURITY INVOKER) --
create or replace function public.fahrstunde_anfrage_annehmen(
  p_id         uuid,
  p_fahrlehrer uuid,
  p_fahrzeug   uuid,
  p_datum      date,
  p_uhrzeit    time,
  p_dauer      integer
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_a      public.fahrstunde_anfrage%rowtype;
  v_ich    uuid;
  v_lehrer uuid;
  v_datum  date;
  v_zeit   time;
  v_dauer  integer;
  v_fs     uuid;
begin
  select * into v_a from public.fahrstunde_anfrage where id = p_id for update;
  if v_a.id is null then
    raise exception 'Anfrage nicht gefunden.';
  end if;
  if v_a.status <> 'offen' then
    raise exception 'Diese Anfrage wurde bereits bearbeitet.';
  end if;

  select l.id into v_ich from public.fahrlehrer l
   where l.user_id = auth.uid() and l.fahrschule_id = v_a.fahrschule_id limit 1;

  v_lehrer := coalesce(p_fahrlehrer, v_a.wunsch_fahrlehrer_id, v_ich);
  v_datum  := coalesce(p_datum, v_a.datum);
  v_zeit   := coalesce(p_uhrzeit, v_a.uhrzeit);
  v_dauer  := coalesce(p_dauer, v_a.dauer_minuten);

  if v_lehrer is null or not exists (
    select 1 from public.fahrlehrer l where l.id = v_lehrer and l.fahrschule_id = v_a.fahrschule_id
  ) then
    raise exception 'Bitte einen Fahrlehrer wählen.';
  end if;

  if exists (
    select 1 from public.fahrstunde f
     where f.fahrlehrer_id = v_lehrer
       and f.datum = v_datum
       and f.status <> 'ausgefallen'
       and (f.uhrzeit, f.uhrzeit + make_interval(mins => f.dauer_minuten))
           overlaps (v_zeit, v_zeit + make_interval(mins => v_dauer))
  ) then
    raise exception 'Der Fahrlehrer hat zu dieser Zeit schon einen Termin.';
  end if;

  if p_fahrzeug is not null and exists (
    select 1 from public.fahrstunde f
     where f.fahrzeug_id = p_fahrzeug
       and f.datum = v_datum
       and f.status <> 'ausgefallen'
       and (f.uhrzeit, f.uhrzeit + make_interval(mins => f.dauer_minuten))
           overlaps (v_zeit, v_zeit + make_interval(mins => v_dauer))
  ) then
    raise exception 'Das Fahrzeug ist zu dieser Zeit schon verplant.';
  end if;

  insert into public.fahrstunde
    (fahrschule_id, schueler_id, fahrlehrer_id, fahrzeug_id, datum, uhrzeit, dauer_minuten, typ, status, bestaetigt_am, notiz)
  values
    (v_a.fahrschule_id, v_a.schueler_id, v_lehrer, p_fahrzeug, v_datum, v_zeit, v_dauer, 'normal', 'geplant', now(),
     'Online angefragt' || coalesce(' · ' || v_a.notiz, ''))
  returning id into v_fs;

  update public.fahrstunde_anfrage
     set status = 'angenommen',
         fahrstunde_id = v_fs,
         bearbeitet_von = v_ich,
         bearbeitet_am = now(),
         antwort = case
           when v_datum <> v_a.datum or v_zeit <> v_a.uhrzeit or v_dauer <> v_a.dauer_minuten
             then 'Termin angepasst: ' || to_char(v_datum, 'DD.MM.YYYY') || ', ' || to_char(v_zeit, 'HH24:MI') || ' Uhr, ' || v_dauer || ' Min.'
           else null
         end
   where id = v_a.id;

  return v_fs;
end; $$;

-- 8) Team: ablehnen (mit optionaler Begründung) ----------------------------
create or replace function public.fahrstunde_anfrage_ablehnen(p_id uuid, p_grund text)
returns boolean language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  update public.fahrstunde_anfrage a
     set status = 'abgelehnt',
         antwort = nullif(left(trim(coalesce(p_grund, '')), 500), ''),
         bearbeitet_am = now(),
         bearbeitet_von = (select l.id from public.fahrlehrer l
                            where l.user_id = auth.uid() and l.fahrschule_id = a.fahrschule_id limit 1)
   where a.id = p_id
     and a.status = 'offen'
  returning a.id into v_id;
  return v_id is not null;
end; $$;

grant execute on function public.portal_anfragen_regeln() to authenticated;
grant execute on function public.portal_fahrlehrer() to authenticated;
grant execute on function public.fahrstunde_anfragen(date, time, integer, uuid, text) to authenticated;
grant execute on function public.fahrstunde_anfrage_zurueckziehen(uuid) to authenticated;
grant execute on function public.fahrstunde_anfrage_annehmen(uuid, uuid, uuid, date, time, integer) to authenticated;
grant execute on function public.fahrstunde_anfrage_ablehnen(uuid, text) to authenticated;

-- 9) Live-Aktualisierung in der iOS-App (falls Realtime aktiv ist) ----------
do $$ begin
  alter publication supabase_realtime add table public.fahrstunde_anfrage;
exception when others then null;
end $$;
