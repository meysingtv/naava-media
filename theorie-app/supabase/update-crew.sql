-- 16) Crew: gemeinsam lernen ----------------------------------------------
-- 2 bis 6 Leute lernen zusammen: gemeinsame Crew-Flamme (wächst nur, wenn
-- alle ihr Tagesziel schaffen), Anstupsen, Einladungen und jede Woche ein
-- Boss aus dem schwächsten Thema der Crew, den alle zusammen besiegen.
-- Wiederholbar; derselbe Inhalt steht in schema.sql (Abschnitt 16).

-- a) Tabellen – Lesen und Schreiben nur über die Funktionen unten -----------
create table if not exists public.lern_crew (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Meine Crew' check (char_length(name) between 1 and 30),
  code         text not null unique,
  erstellt_von uuid references auth.users(id) on delete set null,
  flamme       integer not null default 0,
  flamme_tag   date,
  flamme_beste integer not null default 0,
  erstellt_am  timestamptz not null default now()
);

-- Jede Person ist in höchstens einer Crew.
create table if not exists public.lern_crew_mitglied (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  crew_id        uuid not null references public.lern_crew(id) on delete cascade,
  beigetreten_am timestamptz not null default now()
);
create index if not exists lern_crew_mitglied_crew on public.lern_crew_mitglied (crew_id);

create table if not exists public.lern_crew_einladung (
  id          uuid primary key default gen_random_uuid(),
  crew_id     uuid not null references public.lern_crew(id) on delete cascade,
  von         uuid not null references auth.users(id) on delete cascade,
  an          uuid not null references auth.users(id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  unique (crew_id, an)
);
create index if not exists lern_crew_einladung_an on public.lern_crew_einladung (an);

create table if not exists public.lern_crew_boss (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.lern_crew(id) on delete cascade,
  woche      date not null,
  thema      text not null,
  hp_max     integer not null,
  hp         integer not null,
  besiegt_am timestamptz,
  unique (crew_id, woche)
);

create table if not exists public.lern_crew_belohnung (
  boss_id     uuid not null references public.lern_crew_boss(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  abgeholt_am timestamptz,
  primary key (boss_id, user_id)
);

-- Was in der Crew passiert (für die Live-Liste): gruendung, beitritt, austritt,
-- stupser, treffer, flamme, sieg.
create table if not exists public.lern_crew_ereignis (
  id          bigint generated always as identity primary key,
  crew_id     uuid not null references public.lern_crew(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  ziel        uuid references auth.users(id) on delete cascade,
  art         text not null,
  wert        integer not null default 0,
  richtig     integer not null default 0,
  falsch      integer not null default 0,
  erstellt_am timestamptz not null default now()
);
create index if not exists lern_crew_ereignis_crew on public.lern_crew_ereignis (crew_id, erstellt_am desc);

-- Push-Token (Expo) für Anstupsen, Einladungen und Boss-Sieg.
create table if not exists public.lern_push (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  token           text not null,
  aktualisiert_am timestamptz not null default now()
);

alter table public.lern_crew enable row level security;
alter table public.lern_crew_mitglied enable row level security;
alter table public.lern_crew_einladung enable row level security;
alter table public.lern_crew_boss enable row level security;
alter table public.lern_crew_belohnung enable row level security;
alter table public.lern_crew_ereignis enable row level security;
alter table public.lern_push enable row level security;

-- Push-Mitteilungen verschickt die Datenbank selbst (Erweiterung pg_net).
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net nicht verfügbar – Crew funktioniert, nur ohne Push-Mitteilungen.';
end $$;

-- b) Hilfen – im eigenen Schema lern_intern, das die App nicht erreicht ------
-- (so bleiben sie gesperrt, auch wenn später Rechte für alle lern_-Funktionen
-- in public neu vergeben werden).
create schema if not exists lern_intern;
revoke all on schema lern_intern from public, anon, authenticated;

create or replace function lern_intern.heute()
returns date
language sql stable
as $$ select (now() at time zone 'Europe/Berlin')::date $$;

-- Tagesziel aus dem gesicherten Lernstand (5–200, sonst 30).
create or replace function lern_intern.tagesziel(p_daten jsonb)
returns integer
language sql immutable
as $$
  select case
           when coalesce(p_daten->>'tagesziel', '') ~ '^[0-9]{1,4}$' then greatest(5, least(200, (p_daten->>'tagesziel')::integer))
           else 30
         end
$$;

create or replace function lern_intern.anzeigename(p_id uuid)
returns text
language sql stable security definer set search_path = public
as $$ select coalesce(nullif(btrim(name), ''), benutzername) from public.lern_profil where id = p_id $$;

create or replace function lern_intern.crew_code_neu()
returns text
language plpgsql
as $$
declare
  v_zeichen text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_zeichen, 1 + floor(random() * length(v_zeichen))::integer, 1);
    end loop;
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    exit when not exists (select 1 from public.lern_crew where code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Push an mehrere Personen (Expo Push-Dienst). Ohne pg_net passiert nichts.
create or replace function lern_intern.push_senden(p_an uuid[], p_titel text, p_text text, p_ziel text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_nachrichten jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', token, 'title', p_titel, 'body', p_text, 'sound', 'default',
           'data', jsonb_build_object('url', p_ziel)))
    into v_nachrichten
    from public.lern_push
   where user_id = any(p_an);
  if v_nachrichten is null then return; end if;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using 'https://exp.host/--/api/v2/push/send', v_nachrichten,
            '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb;
  exception when others then
    null; -- Push ist ein Zusatz; ohne pg_net oder bei Fehlern läuft alles andere weiter.
  end;
end;
$$;

-- Crew-Flamme: zählt den heutigen Tag, sobald alle Mitglieder ihr Tagesziel haben.
create or replace function lern_intern.crew_flamme_pruefen(p_crew uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_heute date := lern_intern.heute();
  v_crew  public.lern_crew;
  v_neu   integer;
begin
  select * into v_crew from public.lern_crew where id = p_crew for update;
  if not found or v_crew.flamme_tag = v_heute then return; end if;
  if exists (
    select 1
      from public.lern_crew_mitglied m
      join public.lern_profil p on p.id = m.user_id
      left join public.lern_sync s on s.user_id = m.user_id
     where m.crew_id = p_crew
       and not (p.xp_tag = v_heute and p.fragen_heute >= lern_intern.tagesziel(s.daten))
  ) then
    return;
  end if;
  v_neu := case when v_crew.flamme_tag = v_heute - 1 then v_crew.flamme + 1 else 1 end;
  update public.lern_crew
     set flamme = v_neu, flamme_tag = v_heute, flamme_beste = greatest(flamme_beste, v_neu)
   where id = p_crew;
  insert into public.lern_crew_ereignis (crew_id, art, wert) values (p_crew, 'flamme', v_neu);
end;
$$;

-- Boss der laufenden Woche holen oder anlegen: das schwächste Thema der Crew
-- (letzte 60 Tage, Themen ohne Antworten zählen als unsicher), nicht dasselbe wie letzte Woche.
create or replace function lern_intern.crew_boss_sichern(p_crew uuid)
returns public.lern_crew_boss
language plpgsql security definer set search_path = public
as $$
declare
  v_woche   date := (date_trunc('week', now() at time zone 'Europe/Berlin'))::date;
  v_boss    public.lern_crew_boss;
  v_thema   text;
  v_letztes text;
  v_hp      integer;
begin
  select * into v_boss from public.lern_crew_boss where crew_id = p_crew and woche = v_woche;
  if found then return v_boss; end if;

  select thema into v_letztes from public.lern_crew_boss where crew_id = p_crew order by woche desc limit 1;

  with themen(thema) as (
    values ('gefahren'), ('vorfahrt'), ('zeichen'), ('umwelt'), ('technik'), ('manoever'),
           ('tempo'), ('parken'), ('autobahn'), ('mensch'), ('zahlen')
  ),
  werte as (
    select t.key as thema,
           sum(case when (t.value->>0) ~ '^[0-9]{1,6}$' then (t.value->>0)::integer else 0 end) as richtig,
           sum(case when (t.value->>1) ~ '^[0-9]{1,6}$' then (t.value->>1)::integer else 0 end) as falsch
      from public.lern_crew_mitglied m
      join public.lern_sync s on s.user_id = m.user_id
      cross join lateral jsonb_each(case when jsonb_typeof(s.daten->'themaTage') = 'object' then s.daten->'themaTage' else '{}'::jsonb end) as d(tag, inhalt)
      cross join lateral jsonb_each(case when jsonb_typeof(d.inhalt) = 'object' then d.inhalt else '{}'::jsonb end) as t(key, value)
     where m.crew_id = p_crew
       and d.tag >= to_char(v_woche - 60, 'YYYY-MM-DD')
       and jsonb_typeof(t.value) = 'array'
     group by t.key
  )
  select th.thema into v_thema
    from themen th
    left join werte w on w.thema = th.thema
   where th.thema is distinct from v_letztes
   order by (coalesce(w.richtig, 0) + 1)::numeric / (coalesce(w.richtig, 0) + coalesce(w.falsch, 0) + 2), random()
   limit 1;

  select greatest(160, 80 * count(*)) into v_hp from public.lern_crew_mitglied where crew_id = p_crew;

  insert into public.lern_crew_boss (crew_id, woche, thema, hp_max, hp)
  values (p_crew, v_woche, coalesce(v_thema, 'vorfahrt'), v_hp, v_hp)
  on conflict (crew_id, woche) do nothing
  returning * into v_boss;
  if v_boss.id is null then
    select * into v_boss from public.lern_crew_boss where crew_id = p_crew and woche = v_woche;
  end if;
  return v_boss;
end;
$$;

-- Jemanden aufnehmen (nach Code oder angenommener Einladung).
create or replace function lern_intern.crew_aufnehmen(p_crew uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_andere uuid[];
begin
  perform 1 from public.lern_crew where id = p_crew for update;
  if not found then raise exception 'Diese Crew gibt es nicht mehr.'; end if;
  if exists (select 1 from public.lern_crew_mitglied where user_id = p_user) then
    raise exception 'Du bist schon in einer Crew – verlasse sie zuerst.';
  end if;
  if (select count(*) from public.lern_crew_mitglied where crew_id = p_crew) >= 6 then
    raise exception 'Diese Crew ist schon voll (6 Leute).';
  end if;
  select array_agg(user_id) into v_andere from public.lern_crew_mitglied where crew_id = p_crew;
  insert into public.lern_crew_mitglied (crew_id, user_id) values (p_crew, p_user);
  delete from public.lern_crew_einladung where an = p_user;
  insert into public.lern_crew_ereignis (crew_id, user_id, art) values (p_crew, p_user, 'beitritt');
  perform lern_intern.push_senden(v_andere, 'Neu in deiner Crew', lern_intern.anzeigename(p_user) || ' ist jetzt dabei. Zusammen lernt es sich leichter!', '/crew');
end;
$$;

-- c) Für die App -----------------------------------------------------------

-- Alles für Home, Crew- und Boss-Seite in einem Aufruf.
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
               'ich', p.id = v_ich)
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

create or replace function public.lern_crew_gruenden(p_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if exists (select 1 from public.lern_crew_mitglied where user_id = v_ich) then
    raise exception 'Du bist schon in einer Crew – verlasse sie zuerst.';
  end if;
  perform public.lern_limit_pruefen('crew_gruenden', 5, interval '1 day');
  insert into public.lern_crew (name, code, erstellt_von)
  values (coalesce(nullif(left(btrim(coalesce(p_name, '')), 30), ''), 'Meine Crew'), lern_intern.crew_code_neu(), v_ich)
  returning id into v_crew;
  insert into public.lern_crew_mitglied (crew_id, user_id) values (v_crew, v_ich);
  delete from public.lern_crew_einladung where an = v_ich;
  insert into public.lern_crew_ereignis (crew_id, user_id, art) values (v_crew, v_ich, 'gruendung');
  return public.lern_crew_laden();
end;
$$;

-- Beitreten per Code (mit oder ohne Bindestrich, egal ob groß oder klein).
create or replace function public.lern_crew_beitreten(p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_roh  text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('crew_beitreten', 10, interval '10 minutes');
  if length(v_roh) = 8 then
    select id into v_crew from public.lern_crew where code = substr(v_roh, 1, 4) || '-' || substr(v_roh, 5, 4);
  end if;
  if v_crew is null then raise exception 'Code ungültig – prüf ihn nochmal.'; end if;
  perform lern_intern.crew_aufnehmen(v_crew, v_ich);
  return public.lern_crew_laden();
end;
$$;

create or replace function public.lern_crew_verlassen()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.lern_crew_mitglied where user_id = v_ich returning crew_id into v_crew;
  if v_crew is null then return; end if;
  if not exists (select 1 from public.lern_crew_mitglied where crew_id = v_crew) then
    delete from public.lern_crew where id = v_crew;
  else
    insert into public.lern_crew_ereignis (crew_id, user_id, art) values (v_crew, v_ich, 'austritt');
    perform lern_intern.crew_flamme_pruefen(v_crew);
  end if;
end;
$$;

-- Jemanden einladen (z. B. aus seinem Profil); er sieht die Einladung auf Home.
create or replace function public.lern_crew_einladen(p_an uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew public.lern_crew;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select c.* into v_crew
    from public.lern_crew_mitglied m join public.lern_crew c on c.id = m.crew_id
   where m.user_id = v_ich;
  if v_crew.id is null then raise exception 'Gründe zuerst eine Crew.'; end if;
  if p_an is null or p_an = v_ich or not exists (select 1 from public.lern_profil where id = p_an) then
    raise exception 'Diese Person gibt es nicht.';
  end if;
  if exists (select 1 from public.lern_crew_mitglied where user_id = p_an and crew_id = v_crew.id) then
    raise exception 'Ist schon in deiner Crew.';
  end if;
  if (select count(*) from public.lern_crew_mitglied where crew_id = v_crew.id) >= 6 then
    raise exception 'Deine Crew ist schon voll (6 Leute).';
  end if;
  perform public.lern_limit_pruefen('crew_einladen', 20, interval '1 day');
  insert into public.lern_crew_einladung (crew_id, von, an) values (v_crew.id, v_ich, p_an)
  on conflict (crew_id, an) do update set von = excluded.von, erstellt_am = now();
  perform lern_intern.push_senden(array[p_an], 'Einladung in eine Crew',
    lern_intern.anzeigename(v_ich) || ' lädt dich in die Crew „' || v_crew.name || '“ ein.', '/crew');
end;
$$;

create or replace function public.lern_crew_einladung_antworten(p_id uuid, p_annehmen boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_e   public.lern_crew_einladung;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.lern_crew_einladung where id = p_id and an = v_ich returning * into v_e;
  if v_e.id is null then raise exception 'Diese Einladung gibt es nicht mehr.'; end if;
  if coalesce(p_annehmen, false) then
    perform lern_intern.crew_aufnehmen(v_e.crew_id, v_ich);
  end if;
  return public.lern_crew_laden();
end;
$$;

-- Anstupsen: höchstens einmal in 3 Stunden je Person.
create or replace function public.lern_crew_stupsen(p_ziel uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_crew uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_ziel = v_ich then raise exception 'Dich selbst kannst du nicht anstupsen.'; end if;
  select crew_id into v_crew from public.lern_crew_mitglied where user_id = v_ich;
  if v_crew is null or not exists (select 1 from public.lern_crew_mitglied where user_id = p_ziel and crew_id = v_crew) then
    raise exception 'Diese Person ist nicht in deiner Crew.';
  end if;
  if exists (select 1 from public.lern_crew_ereignis
              where art = 'stupser' and user_id = v_ich and ziel = p_ziel and erstellt_am > now() - interval '3 hours') then
    raise exception 'Schon angestupst – in ein paar Stunden geht es wieder.';
  end if;
  insert into public.lern_crew_ereignis (crew_id, user_id, ziel, art) values (v_crew, v_ich, p_ziel, 'stupser');
  perform lern_intern.push_senden(array[p_ziel], lern_intern.anzeigename(v_ich) || ' hat dich angestupst',
    'Die Crew-Flamme wartet auf dich – mach heute dein Tagesziel.', '/crew');
end;
$$;

-- Antworten im Boss-Thema: richtig = 5 Schaden, falsch heilt ihn um 3.
-- Je Aufruf höchstens 30 und je Tag höchstens 200 gewertete Antworten.
create or replace function public.lern_crew_treffer(p_thema text, p_richtig integer, p_falsch integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_crew   uuid;
  v_boss   public.lern_crew_boss;
  v_r      integer := greatest(0, least(coalesce(p_richtig, 0), 30));
  v_f      integer := greatest(0, least(coalesce(p_falsch, 0), 30));
  v_heute  integer;
  v_delta  integer;
  v_alle   uuid[];
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select crew_id into v_crew from public.lern_crew_mitglied where user_id = v_ich;
  if v_crew is null then return null; end if;
  v_boss := lern_intern.crew_boss_sichern(v_crew);
  if v_boss.thema is distinct from p_thema or v_boss.besiegt_am is not null or v_r + v_f = 0 then
    return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', v_boss.besiegt_am is not null, 'schaden', 0);
  end if;

  select coalesce(sum(richtig + falsch), 0) into v_heute
    from public.lern_crew_ereignis
   where user_id = v_ich and art = 'treffer'
     and erstellt_am >= (lern_intern.heute()::timestamp at time zone 'Europe/Berlin');
  if v_heute >= 200 then
    return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', false, 'schaden', 0);
  end if;
  if v_heute + v_r + v_f > 200 then
    v_r := least(v_r, 200 - v_heute);
    v_f := least(v_f, 200 - v_heute - v_r);
  end if;

  v_delta := 5 * v_r - 3 * v_f;
  update public.lern_crew_boss
     set hp = greatest(0, least(hp_max, hp - v_delta)),
         besiegt_am = case when hp - v_delta <= 0 then now() else null end
   where id = v_boss.id and besiegt_am is null
  returning * into v_boss;
  if v_boss.id is null then
    select * into v_boss from public.lern_crew_boss where crew_id = v_crew order by woche desc limit 1;
    return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', true, 'schaden', 0);
  end if;

  insert into public.lern_crew_ereignis (crew_id, user_id, art, wert, richtig, falsch)
  values (v_crew, v_ich, 'treffer', v_delta, v_r, v_f);

  -- Gerade besiegt: Belohnung für alle, die jetzt in der Crew sind.
  if v_boss.besiegt_am is not null then
    insert into public.lern_crew_ereignis (crew_id, user_id, art, wert) values (v_crew, v_ich, 'sieg', v_boss.hp_max);
    insert into public.lern_crew_belohnung (boss_id, user_id)
    select v_boss.id, m.user_id from public.lern_crew_mitglied m where m.crew_id = v_crew
    on conflict do nothing;
    select array_agg(user_id) into v_alle from public.lern_crew_mitglied where crew_id = v_crew and user_id <> v_ich;
    perform lern_intern.push_senden(v_alle, 'Boss besiegt!',
      lern_intern.anzeigename(v_ich) || ' hat den letzten Treffer gelandet. Hol dir deine XP-Truhe ab!', '/crew-boss');
  end if;

  return jsonb_build_object('hp', v_boss.hp, 'hp_max', v_boss.hp_max, 'besiegt', v_boss.besiegt_am is not null, 'schaden', v_delta);
end;
$$;

-- Belohnungen für besiegte Bosse abholen (die App schreibt die XP gut).
create or replace function public.lern_crew_belohnungen_abholen()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_ergebnis jsonb;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  with abgeholt as (
    update public.lern_crew_belohnung b
       set abgeholt_am = now()
     where b.user_id = v_ich and b.abgeholt_am is null
    returning b.boss_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('thema', x.thema, 'woche', x.woche)), '[]'::jsonb)
    into v_ergebnis
    from public.lern_crew_boss x
   where x.id in (select boss_id from abgeholt);
  return v_ergebnis;
end;
$$;

-- Push-Token speichern (leer oder ungültig = löschen).
create or replace function public.lern_push_token_setzen(p_token text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,}\]$' then
    delete from public.lern_push where user_id = v_ich;
    return;
  end if;
  insert into public.lern_push (user_id, token) values (v_ich, p_token)
  on conflict (user_id) do update set token = excluded.token, aktualisiert_am = now();
end;
$$;

-- d) Crew-Flamme nach jedem Lernen prüfen (beim Buchen der Fragen) ---------
create or replace function lern_intern.crew_nach_lernen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  begin
    perform lern_intern.crew_flamme_pruefen(m.crew_id) from public.lern_crew_mitglied m where m.user_id = new.id;
  exception when others then
    null; -- Die Crew darf das Buchen der Fragen nie verhindern.
  end;
  return new;
end;
$$;

drop trigger if exists lern_crew_nach_lernen on public.lern_profil;
create trigger lern_crew_nach_lernen
  after update of fragen_heute, xp_tag on public.lern_profil
  for each row
  when (new.fragen_heute is distinct from old.fragen_heute or new.xp_tag is distinct from old.xp_tag)
  execute function lern_intern.crew_nach_lernen();

-- e) Rechte ------------------------------------------------------------------
-- Hilfen: nur für die Funktionen oben, nicht für die App.
revoke execute on all functions in schema lern_intern from public, anon, authenticated;

-- Für angemeldete Nutzer der App.
revoke execute on function public.lern_crew_laden() from public, anon;
revoke execute on function public.lern_crew_gruenden(text) from public, anon;
revoke execute on function public.lern_crew_beitreten(text) from public, anon;
revoke execute on function public.lern_crew_verlassen() from public, anon;
revoke execute on function public.lern_crew_einladen(uuid) from public, anon;
revoke execute on function public.lern_crew_einladung_antworten(uuid, boolean) from public, anon;
revoke execute on function public.lern_crew_stupsen(uuid) from public, anon;
revoke execute on function public.lern_crew_treffer(text, integer, integer) from public, anon;
revoke execute on function public.lern_crew_belohnungen_abholen() from public, anon;
revoke execute on function public.lern_push_token_setzen(text) from public, anon;
grant execute on function public.lern_crew_laden() to authenticated;
grant execute on function public.lern_crew_gruenden(text) to authenticated;
grant execute on function public.lern_crew_beitreten(text) to authenticated;
grant execute on function public.lern_crew_verlassen() to authenticated;
grant execute on function public.lern_crew_einladen(uuid) to authenticated;
grant execute on function public.lern_crew_einladung_antworten(uuid, boolean) to authenticated;
grant execute on function public.lern_crew_stupsen(uuid) to authenticated;
grant execute on function public.lern_crew_treffer(text, integer, integer) to authenticated;
grant execute on function public.lern_crew_belohnungen_abholen() to authenticated;
grant execute on function public.lern_push_token_setzen(text) to authenticated;

notify pgrst, 'reload schema';
