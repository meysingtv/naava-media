-- =====================================================================
-- 29) Verwaltung: Meldungen, Freigaben, Einladungen, Lernstand, Termine,
--     Mitteilungen
-- =====================================================================
-- Neue Bereiche im Manager (Web-Panel /manager):
--   a) Hinweise an Nutzer – kurze Nachrichten, die die App beim Start zeigt
--      (Begründung bei entfernten Inhalten, Rückmeldung zu Meldungen,
--      Mitteilungen der Fahrschule). Dazu auf Wunsch eine Push-Mitteilung.
--   b) Meldungen prüfen – gemeldete Clips und Chat-Nachrichten entfernen oder
--      behalten. Der Verfasser bekommt eine Begründung, wer gemeldet hat eine
--      Rückmeldung (Digital Services Act, Art. 16 und 17).
--   c) Fahrlehrer bestätigen – wer sich selbst als Fahrlehrer registriert,
--      darf erst nach der Bestätigung Clips hochladen.
--   d) Einladungen – Code bzw. QR-Code; wer ihn einlöst, ist direkt dem
--      gewählten Fahrlehrer zugeordnet.
--   e) Lernstand eines Fahrschülers und f) Prüfungstermine aller Schüler.
--   g) Mitteilung an alle, an eine Rolle oder an die Schüler eines Fahrlehrers.
-- Alles läuft über Funktionen, die nur der Inhaber aufrufen darf. Die Edge
-- Function „manager“ muss dafür nicht neu hochgeladen werden.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher müssen Abschnitt 22 (update-creator.sql), 26
-- (update-manager.sql) und 28 (update-code-login.sql) gelaufen sein.
-- Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql (Abschnitt 29).

create schema if not exists lern_intern;

-- a) Hinweise an Nutzer -----------------------------------------------------------
create table if not exists public.lern_hinweis (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  art         text not null check (art in ('moderation', 'meldung', 'mitteilung', 'einladung', 'freigabe')),
  titel       text not null check (char_length(titel) between 1 and 120),
  text        text not null default '' check (char_length(text) <= 2000),
  gelesen     boolean not null default false,
  erstellt_am timestamptz not null default now()
);
create index if not exists lern_hinweis_offen on public.lern_hinweis (user_id, gelesen, erstellt_am);
alter table public.lern_hinweis enable row level security;
revoke all on public.lern_hinweis from anon, authenticated;
-- Lesen und als gelesen markieren nur über die Funktionen unten.

-- Hinweis an mehrere Nutzer, auf Wunsch mit Push-Mitteilung (je 100 auf einmal,
-- mehr nimmt der Push-Dienst von Expo pro Anfrage nicht an).
create or replace function lern_intern.hinweis(p_an uuid[], p_art text, p_titel text, p_text text, p_push boolean default true, p_ziel text default '/heute')
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_an  uuid[];
  v_n   integer;
  i     integer := 1;
begin
  select array_agg(distinct u) into v_an
    from unnest(coalesce(p_an, '{}'::uuid[])) u
   where exists (select 1 from auth.users a where a.id = u);
  if v_an is null then return 0; end if;
  insert into public.lern_hinweis (user_id, art, titel, text)
  select u, p_art, left(p_titel, 120), left(coalesce(p_text, ''), 2000) from unnest(v_an) u;
  get diagnostics v_n = row_count;
  if p_push then
    while i <= cardinality(v_an) loop
      perform lern_intern.push_senden(v_an[i:i + 99], left(p_titel, 120), left(coalesce(p_text, ''), 180), p_ziel);
      i := i + 100;
    end loop;
  end if;
  return v_n;
end;
$$;
revoke all on function lern_intern.hinweis(uuid[], text, text, text, boolean, text) from public;

-- Ungelesene Hinweise (älteste zuerst, die App zeigt sie nacheinander).
create or replace function public.lern_meine_hinweise()
returns table (id bigint, art text, titel text, text text, erstellt_am timestamptz)
language sql stable security definer set search_path = public
as $$
  select h.id, h.art, h.titel, h.text, h.erstellt_am
    from public.lern_hinweis h
   where h.user_id = auth.uid() and not h.gelesen
   order by h.erstellt_am
   limit 20;
$$;
revoke execute on function public.lern_meine_hinweise() from public, anon;
grant execute on function public.lern_meine_hinweise() to authenticated;

create or replace function public.lern_hinweis_gelesen(p_id bigint)
returns void
language sql security definer set search_path = public
as $$
  update public.lern_hinweis set gelesen = true where id = p_id and user_id = auth.uid();
$$;
revoke execute on function public.lern_hinweis_gelesen(bigint) from public, anon;
grant execute on function public.lern_hinweis_gelesen(bigint) to authenticated;

-- b) Meldungen prüfen -------------------------------------------------------------
-- Protokoll jeder Entscheidung (was, warum, wie oft gemeldet).
create table if not exists public.lern_moderation (
  id           bigint generated always as identity primary key,
  art          text not null check (art in ('clip', 'chat')),
  ziel         text not null,
  inhalt       text not null default '',
  autor        uuid references auth.users(id) on delete set null,
  entscheidung text not null check (entscheidung in ('entfernt', 'behalten')),
  begruendung  text not null default '' check (char_length(begruendung) <= 1000),
  meldungen    integer not null default 0,
  von          uuid references auth.users(id) on delete set null,
  erstellt_am  timestamptz not null default now()
);
alter table public.lern_moderation enable row level security;
revoke all on public.lern_moderation from anon, authenticated;

-- Offene Meldungen, zusammengefasst je Clip bzw. Chat-Nachricht.
create or replace function public.lern_admin_meldungen()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_clips jsonb;
  v_chat  jsonb;
  v_log   jsonb;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;

  select coalesce(jsonb_agg(x order by x->>'letzte' desc), '[]'::jsonb) into v_clips
    from (
      select jsonb_build_object(
               'id', c.id, 'titel', c.titel, 'beschreibung', c.beschreibung,
               'video_pfad', c.video_pfad, 'bild_pfad', c.bild_pfad,
               'autor', c.autor, 'autor_name', coalesce(p.name, ''), 'autor_benutzer', coalesce(p.benutzername, ''),
               'erstellt_am', c.erstellt_am, 'anzahl', count(m.id),
               'gruende', jsonb_agg(jsonb_build_object('grund', m.grund, 'von', coalesce(mp.name, ''), 'am', m.erstellt_am) order by m.erstellt_am desc),
               'letzte', max(m.erstellt_am)) as x
        from public.lern_clip_meldung m
        join public.lern_clip c on c.id = m.clip_id
        left join public.lern_profil p on p.id = c.autor
        left join public.lern_profil mp on mp.id = m.user_id
       group by c.id, p.name, p.benutzername
    ) s;

  select coalesce(jsonb_agg(x order by x->>'letzte' desc), '[]'::jsonb) into v_chat
    from (
      select jsonb_build_object(
               'id', ch.id, 'text', ch.text, 'live', coalesce(nullif(l.titel, ''), 'Live'),
               'autor', ch.user_id, 'autor_name', coalesce(nullif(ch.name, ''), p.name, ''),
               'erstellt_am', ch.erstellt_am, 'anzahl', count(m.id),
               'gruende', jsonb_agg(jsonb_build_object('grund', m.grund, 'von', coalesce(mp.name, ''), 'am', m.erstellt_am) order by m.erstellt_am desc),
               'letzte', max(m.erstellt_am)) as x
        from public.lern_live_meldung m
        join public.lern_live_chat ch on ch.id = m.chat_id
        join public.lern_live l on l.id = ch.live_id
        left join public.lern_profil p on p.id = ch.user_id
        left join public.lern_profil mp on mp.id = m.user_id
       where not ch.geloescht
       group by ch.id, l.titel, p.name
    ) s;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', d.id, 'art', d.art, 'inhalt', d.inhalt, 'entscheidung', d.entscheidung,
           'begruendung', d.begruendung, 'meldungen', d.meldungen, 'am', d.erstellt_am,
           'autor_name', coalesce(p.name, '')) order by d.erstellt_am desc), '[]'::jsonb) into v_log
    from (select * from public.lern_moderation order by erstellt_am desc limit 30) d
    left join public.lern_profil p on p.id = d.autor;

  return jsonb_build_object('clips', v_clips, 'chat', v_chat, 'erledigt', v_log);
end;
$$;
revoke execute on function public.lern_admin_meldungen() from public, anon;
grant execute on function public.lern_admin_meldungen() to authenticated;

-- Entscheiden: entfernen (mit Begründung an den Verfasser) oder behalten.
-- Liefert bei Clips die Dateipfade, die die App danach aus dem Speicher löscht.
create or replace function public.lern_admin_meldung_entscheiden(p_art text, p_id text, p_entfernen boolean, p_begruendung text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_autor   uuid;
  v_inhalt  text;
  v_melder  uuid[];
  v_anzahl  integer := 0;
  v_pfade   text[] := '{}';
  v_begr    text := left(btrim(coalesce(p_begruendung, '')), 1000);
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if p_entfernen and char_length(v_begr) < 5 then raise exception 'Bitte schreib kurz, warum der Inhalt entfernt wird.'; end if;

  if p_art = 'clip' then
    select c.autor, c.titel, array_remove(array[c.video_pfad, c.bild_pfad], null)
      into v_autor, v_inhalt, v_pfade
      from public.lern_clip c where c.id = p_id::uuid;
    if not found then raise exception 'Der Clip wurde schon gelöscht.'; end if;
    select array_agg(m.user_id), count(*) into v_melder, v_anzahl from public.lern_clip_meldung m where m.clip_id = p_id::uuid;
    if p_entfernen then
      delete from public.lern_clip where id = p_id::uuid; -- Meldungen, Likes und Kommentare fallen mit
    else
      delete from public.lern_clip_meldung where clip_id = p_id::uuid;
      v_pfade := '{}';
    end if;
  elsif p_art = 'chat' then
    select ch.user_id, left(ch.text, 200) into v_autor, v_inhalt from public.lern_live_chat ch where ch.id = p_id::bigint;
    if not found then raise exception 'Die Nachricht wurde schon gelöscht.'; end if;
    select array_agg(m.user_id), count(*) into v_melder, v_anzahl from public.lern_live_meldung m where m.chat_id = p_id::bigint;
    if p_entfernen then
      update public.lern_live_chat set geloescht = true, text = '' where id = p_id::bigint;
    end if;
    delete from public.lern_live_meldung where chat_id = p_id::bigint;
  else
    raise exception 'Unbekannte Art.';
  end if;

  insert into public.lern_moderation (art, ziel, inhalt, autor, entscheidung, begruendung, meldungen, von)
  values (p_art, p_id, coalesce(v_inhalt, ''), v_autor, case when p_entfernen then 'entfernt' else 'behalten' end, v_begr, v_anzahl, auth.uid());

  -- Begründung an den Verfasser (DSA Art. 17)
  if p_entfernen and v_autor is not null then
    perform lern_intern.hinweis(
      array[v_autor], 'moderation',
      case when p_art = 'clip' then 'Dein Clip wurde entfernt' else 'Deine Chat-Nachricht wurde entfernt' end,
      format('„%s“ wurde nach einer Meldung geprüft und entfernt. Grund: %s Wenn du das anders siehst, schreib uns über die Kontaktadresse im Impressum – wir sehen es uns noch einmal an.',
             left(coalesce(v_inhalt, ''), 80), v_begr),
      true);
  end if;

  -- Rückmeldung an alle, die gemeldet haben (DSA Art. 16 Abs. 5)
  if v_melder is not null then
    perform lern_intern.hinweis(
      v_melder, 'meldung', 'Deine Meldung wurde geprüft',
      case when p_entfernen then 'Danke! Der gemeldete Inhalt wurde entfernt.'
           else 'Danke! Wir haben den Inhalt geprüft und keinen Verstoß gegen unsere Regeln gefunden. Er bleibt online.' end,
      false);
  end if;

  return jsonb_build_object('pfade', to_jsonb(v_pfade));
end;
$$;
revoke execute on function public.lern_admin_meldung_entscheiden(text, text, boolean, text) from public, anon;
grant execute on function public.lern_admin_meldung_entscheiden(text, text, boolean, text) to authenticated;

-- c) Fahrlehrer bestätigen -----------------------------------------------------
create table if not exists public.lern_fahrlehrer_freigabe (
  user_id        uuid primary key references public.lern_profil(id) on delete cascade,
  status         text not null default 'offen' check (status in ('offen', 'bestaetigt', 'abgelehnt')),
  erstellt_am    timestamptz not null default now(),
  entschieden_am timestamptz,
  von            uuid references auth.users(id) on delete set null
);
alter table public.lern_fahrlehrer_freigabe enable row level security;
revoke all on public.lern_fahrlehrer_freigabe from anon, authenticated;

-- Wer heute schon Fahrlehrer ist, bleibt freigeschaltet.
insert into public.lern_fahrlehrer_freigabe (user_id, status, entschieden_am)
select p.id, 'bestaetigt', now() from public.lern_profil p where p.rolle = 'fahrlehrer'
on conflict (user_id) do nothing;

-- Rolle aus der Registrierung übernehmen – neue Fahrlehrer warten auf die Bestätigung.
create or replace function public.lern_rolle_uebernehmen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'rolle' = 'fahrlehrer' then
    update public.lern_profil set rolle = 'fahrlehrer' where id = new.id;
    insert into public.lern_fahrlehrer_freigabe (user_id, status) values (new.id, 'offen')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Hochladen dürfen: Inhaber, freigeschaltete Ersteller, bestätigte Fahrlehrer
-- und angenommene Live-Creator.
create or replace function public.lern_darf_hochladen()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.lern_ist_inhaber()
          or exists (select 1 from public.lern_clip_ersteller e where e.user_id = auth.uid())
          or exists (select 1 from public.lern_profil p
                       join public.lern_fahrlehrer_freigabe f on f.user_id = p.id
                      where p.id = auth.uid() and p.rolle = 'fahrlehrer' and f.status = 'bestaetigt')
          or exists (select 1 from public.lern_creator_bewerbung b where b.user_id = auth.uid() and b.status = 'angenommen'));
$$;
grant execute on function public.lern_darf_hochladen() to authenticated;

-- Offene (und kürzlich abgelehnte) Fahrlehrer-Anmeldungen.
create or replace function public.lern_admin_fahrlehrer_freigaben()
returns table (user_id uuid, name text, benutzername text, email text, status text, erstellt_am timestamptz, entschieden_am timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return query
    select f.user_id, p.name, p.benutzername, coalesce(u.email, '')::text, f.status, f.erstellt_am, f.entschieden_am
      from public.lern_fahrlehrer_freigabe f
      join public.lern_profil p on p.id = f.user_id
      left join auth.users u on u.id = f.user_id
     where f.status = 'offen' or (f.status = 'abgelehnt' and f.entschieden_am > now() - interval '30 days')
     order by (f.status = 'offen') desc, f.erstellt_am desc;
end;
$$;
revoke execute on function public.lern_admin_fahrlehrer_freigaben() from public, anon;
grant execute on function public.lern_admin_fahrlehrer_freigaben() to authenticated;

-- Bestätigen oder ablehnen. Abgelehnte nutzen die App als Fahrschüler weiter.
create or replace function public.lern_admin_fahrlehrer_entscheiden(p_user uuid, p_bestaetigen boolean, p_still boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if not exists (select 1 from public.lern_profil where id = p_user) then raise exception 'Konto nicht gefunden.'; end if;
  insert into public.lern_fahrlehrer_freigabe (user_id, status, entschieden_am, von)
  values (p_user, case when p_bestaetigen then 'bestaetigt' else 'abgelehnt' end, now(), auth.uid())
  on conflict (user_id) do update
     set status = excluded.status, entschieden_am = excluded.entschieden_am, von = excluded.von;
  if p_bestaetigen then
    update public.lern_profil set rolle = 'fahrlehrer' where id = p_user;
    update public.lern_verwaltung set fahrlehrer_id = null where user_id = p_user;
    if not p_still then
      perform lern_intern.hinweis(array[p_user], 'freigabe', 'Du bist als Fahrlehrer bestätigt',
                                  'Willkommen! Du kannst jetzt Clips hochladen und deine Fahrschüler begleiten.', true);
    end if;
  else
    update public.lern_profil set rolle = 'schueler' where id = p_user;
    if not p_still then
      perform lern_intern.hinweis(array[p_user], 'freigabe', 'Deine Anmeldung als Fahrlehrer',
                                  'Wir konnten dich nicht als Fahrlehrer bestätigen. Du kannst die App als Fahrschüler weiter nutzen. Bei Fragen melde dich über die Kontaktadresse im Impressum.', true);
    end if;
  end if;
end;
$$;
revoke execute on function public.lern_admin_fahrlehrer_entscheiden(uuid, boolean, boolean) from public, anon;
grant execute on function public.lern_admin_fahrlehrer_entscheiden(uuid, boolean, boolean) to authenticated;

-- d) Einladungen ---------------------------------------------------------------------
create table if not exists public.lern_einladung (
  code           text primary key check (code ~ '^[A-Z2-9]{8}$'),
  fahrlehrer_id  uuid references public.lern_profil(id) on delete cascade,
  notiz          text not null default '' check (char_length(notiz) <= 80),
  gueltig_bis    timestamptz,
  max_nutzungen  integer check (max_nutzungen between 1 and 1000),
  nutzungen      integer not null default 0,
  aktiv          boolean not null default true,
  erstellt_von   uuid references auth.users(id) on delete set null,
  erstellt_am    timestamptz not null default now()
);
create table if not exists public.lern_einladung_nutzung (
  code    text not null references public.lern_einladung(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  am      timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.lern_einladung enable row level security;
alter table public.lern_einladung_nutzung enable row level security;
revoke all on public.lern_einladung, public.lern_einladung_nutzung from anon, authenticated;

create or replace function public.lern_admin_einladung_erstellen(p_fahrlehrer uuid, p_tage integer, p_max integer, p_notiz text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_zeichen constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code    text;
  v_bytes   bytea;
  i         integer;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if p_fahrlehrer is not null and not exists (select 1 from public.lern_profil where id = p_fahrlehrer and rolle = 'fahrlehrer') then
    raise exception 'Der gewählte Fahrlehrer wurde nicht gefunden.';
  end if;
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_zeichen, 1 + (get_byte(v_bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.lern_einladung where code = v_code);
  end loop;
  insert into public.lern_einladung (code, fahrlehrer_id, notiz, gueltig_bis, max_nutzungen, erstellt_von)
  values (v_code, p_fahrlehrer, left(btrim(coalesce(p_notiz, '')), 80),
          case when p_tage between 1 and 365 then now() + make_interval(days => p_tage) end,
          case when p_max between 1 and 1000 then p_max end,
          auth.uid());
  return v_code;
end;
$$;
revoke execute on function public.lern_admin_einladung_erstellen(uuid, integer, integer, text) from public, anon;
grant execute on function public.lern_admin_einladung_erstellen(uuid, integer, integer, text) to authenticated;

create or replace function public.lern_admin_einladungen()
returns table (code text, fahrlehrer_id uuid, fahrlehrer text, notiz text, gueltig_bis timestamptz, max_nutzungen integer, nutzungen integer, aktiv boolean, erstellt_am timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return query
    select e.code, e.fahrlehrer_id, coalesce(p.name, ''), e.notiz, e.gueltig_bis, e.max_nutzungen, e.nutzungen,
           e.aktiv and (e.gueltig_bis is null or e.gueltig_bis > now()) and (e.max_nutzungen is null or e.nutzungen < e.max_nutzungen),
           e.erstellt_am
      from public.lern_einladung e
      left join public.lern_profil p on p.id = e.fahrlehrer_id
     order by e.erstellt_am desc
     limit 100;
end;
$$;
revoke execute on function public.lern_admin_einladungen() from public, anon;
grant execute on function public.lern_admin_einladungen() to authenticated;

create or replace function public.lern_admin_einladung_beenden(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  update public.lern_einladung set aktiv = false where code = upper(p_code);
end;
$$;
revoke execute on function public.lern_admin_einladung_beenden(text) from public, anon;
grant execute on function public.lern_admin_einladung_beenden(text) to authenticated;

-- Für die Einladungsseite in der App (auch vor der Anmeldung): gilt der Code, und von wem?
create or replace function public.lern_einladung_info(p_code text)
returns table (gueltig boolean, fahrlehrer text)
language sql stable security definer set search_path = public
as $$
  select true, coalesce(p.name, '')
    from public.lern_einladung e
    left join public.lern_profil p on p.id = e.fahrlehrer_id
   where e.code = upper(btrim(p_code))
     and e.aktiv
     and (e.gueltig_bis is null or e.gueltig_bis > now())
     and (e.max_nutzungen is null or e.nutzungen < e.max_nutzungen);
$$;
revoke execute on function public.lern_einladung_info(text) from public;
grant execute on function public.lern_einladung_info(text) to anon, authenticated;

-- Einlösen (nach der Anmeldung): ordnet den Fahrschüler dem Fahrlehrer zu.
create or replace function public.lern_einladung_einloesen(p_code text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_e    public.lern_einladung;
  v_name text := '';
  v_neu  integer;
begin
  if v_ich is null then raise exception 'Bitte melde dich an.'; end if;
  select * into v_e from public.lern_einladung where code = upper(btrim(p_code)) for update;
  if not found or not v_e.aktiv or (v_e.gueltig_bis is not null and v_e.gueltig_bis <= now()) then
    raise exception 'Diese Einladung gilt nicht mehr. Frag deine Fahrschule nach einem neuen Code.';
  end if;
  if exists (select 1 from public.lern_profil where id = v_ich and rolle = 'fahrlehrer') then
    raise exception 'Einladungen sind für Fahrschüler.';
  end if;
  insert into public.lern_einladung_nutzung (code, user_id) values (v_e.code, v_ich) on conflict do nothing;
  get diagnostics v_neu = row_count;
  if v_neu > 0 then
    if v_e.max_nutzungen is not null and v_e.nutzungen >= v_e.max_nutzungen then
      raise exception 'Diese Einladung gilt nicht mehr. Frag deine Fahrschule nach einem neuen Code.';
    end if;
    update public.lern_einladung set nutzungen = nutzungen + 1 where code = v_e.code;
  end if;
  if v_e.fahrlehrer_id is not null then
    insert into public.lern_verwaltung (user_id, fahrlehrer_id) values (v_ich, v_e.fahrlehrer_id)
    on conflict (user_id) do update set fahrlehrer_id = excluded.fahrlehrer_id, geaendert_am = now();
    select coalesce(name, '') into v_name from public.lern_profil where id = v_e.fahrlehrer_id;
  end if;
  return v_name;
end;
$$;
revoke execute on function public.lern_einladung_einloesen(text) from public, anon;
grant execute on function public.lern_einladung_einloesen(text) to authenticated;

-- e) Lernstand eines Fahrschülers ------------------------------------------------------
-- Aus dem gesicherten Lernstand (lern_sync) nur, was die Fahrschule braucht.
create or replace function public.lern_admin_lernstand(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  select jsonb_build_object(
           'fragen', coalesce(s.daten->'fragen', '{}'::jsonb),
           'pruefungen', coalesce(s.daten->'pruefungen', '[]'::jsonb),
           'zeitTage', coalesce(s.daten->'zeitTage', '{}'::jsonb),
           'antwortenTage', coalesce(s.daten->'antwortenTage', '{}'::jsonb),
           'schilder', coalesce(s.daten->'schilder', '{}'::jsonb),
           'pruefungstermin', s.daten->'pruefungstermin',
           'serie', coalesce(s.daten->'serie', '0'::jsonb),
           'letzterTag', s.daten->'letzterTag',
           'tagesziel', coalesce(s.daten->'tagesziel', '30'::jsonb),
           'aktualisiert_am', s.aktualisiert_am)
    into v
    from public.lern_sync s where s.user_id = p_user;
  return coalesce(v, '{}'::jsonb);
end;
$$;
revoke execute on function public.lern_admin_lernstand(uuid) from public, anon;
grant execute on function public.lern_admin_lernstand(uuid) to authenticated;

-- f) Prüfungstermine aller Schüler (ab vor 30 Tagen) -----------------------------------------
create or replace function public.lern_admin_pruefungstermine()
returns table (user_id uuid, name text, benutzername text, klasse text, termin timestamptz, fahrlehrer_id uuid, fahrlehrer text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return query
    select t.user_id, t.name, t.benutzername, t.klasse, t.termin, t.fahrlehrer_id, t.fahrlehrer
      from (
        select s.user_id, p.name, p.benutzername, p.klasse,
               case when s.daten->>'pruefungstermin' ~ '^\d{4}-\d{2}-\d{2}' then (s.daten->>'pruefungstermin')::timestamptz end as termin,
               v.fahrlehrer_id, coalesce(fl.name, '') as fahrlehrer
          from public.lern_sync s
          join public.lern_profil p on p.id = s.user_id
          left join public.lern_verwaltung v on v.user_id = s.user_id
          left join public.lern_profil fl on fl.id = v.fahrlehrer_id
         where s.daten ? 'pruefungstermin'
      ) t
     where t.termin is not null and t.termin > now() - interval '30 days'
     order by t.termin;
end;
$$;
revoke execute on function public.lern_admin_pruefungstermine() from public, anon;
grant execute on function public.lern_admin_pruefungstermine() to authenticated;

-- g) Mitteilungen ---------------------------------------------------------------------
create table if not exists public.lern_mitteilung (
  id            bigint generated always as identity primary key,
  titel         text not null,
  text          text not null,
  ziel          text not null check (ziel in ('alle', 'schueler', 'fahrlehrer', 'gruppe')),
  fahrlehrer_id uuid references public.lern_profil(id) on delete set null,
  anzahl        integer not null default 0,
  von           uuid references auth.users(id) on delete set null,
  erstellt_am   timestamptz not null default now()
);
alter table public.lern_mitteilung enable row level security;
revoke all on public.lern_mitteilung from anon, authenticated;

-- Schickt eine Mitteilung (Hinweis in der App und Push). Gesperrte Konten bekommen nichts.
create or replace function public.lern_admin_mitteilung_senden(p_titel text, p_text text, p_ziel text, p_fahrlehrer uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_titel text := btrim(coalesce(p_titel, ''));
  v_text  text := btrim(coalesce(p_text, ''));
  v_an    uuid[];
  v_n     integer;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  if char_length(v_titel) not between 2 and 80 then raise exception 'Der Titel braucht 2 bis 80 Zeichen.'; end if;
  if char_length(v_text) not between 2 and 500 then raise exception 'Der Text braucht 2 bis 500 Zeichen.'; end if;
  if p_ziel not in ('alle', 'schueler', 'fahrlehrer', 'gruppe') then raise exception 'Unbekannte Empfänger.'; end if;
  if p_ziel = 'gruppe' and p_fahrlehrer is null then raise exception 'Bitte wähle einen Fahrlehrer.'; end if;
  select array_agg(p.id) into v_an
    from public.lern_profil p
    left join public.lern_verwaltung v on v.user_id = p.id
   where coalesce(v.status, 'aktiv') <> 'gesperrt'
     and p.id <> auth.uid()
     and (p_ziel = 'alle'
          or (p_ziel = 'schueler' and p.rolle = 'schueler')
          or (p_ziel = 'fahrlehrer' and p.rolle = 'fahrlehrer')
          or (p_ziel = 'gruppe' and v.fahrlehrer_id = p_fahrlehrer));
  v_n := lern_intern.hinweis(v_an, 'mitteilung', v_titel, v_text, true);
  insert into public.lern_mitteilung (titel, text, ziel, fahrlehrer_id, anzahl, von)
  values (v_titel, v_text, p_ziel, case when p_ziel = 'gruppe' then p_fahrlehrer end, v_n, auth.uid());
  return v_n;
end;
$$;
revoke execute on function public.lern_admin_mitteilung_senden(text, text, text, uuid) from public, anon;
grant execute on function public.lern_admin_mitteilung_senden(text, text, text, uuid) to authenticated;

create or replace function public.lern_admin_mitteilungen()
returns table (id bigint, titel text, text text, ziel text, fahrlehrer text, anzahl integer, erstellt_am timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return query
    select m.id, m.titel, m.text, m.ziel, coalesce(p.name, ''), m.anzahl, m.erstellt_am
      from public.lern_mitteilung m
      left join public.lern_profil p on p.id = m.fahrlehrer_id
     order by m.erstellt_am desc
     limit 30;
end;
$$;
revoke execute on function public.lern_admin_mitteilungen() from public, anon;
grant execute on function public.lern_admin_mitteilungen() to authenticated;

-- h) Zähler für die Seitenleiste und die Übersicht ----------------------------------------
create or replace function public.lern_admin_zaehler()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  return jsonb_build_object(
    'meldungen', (select count(distinct clip_id) from public.lern_clip_meldung)
               + (select count(distinct m.chat_id) from public.lern_live_meldung m join public.lern_live_chat c on c.id = m.chat_id where not c.geloescht),
    'fahrlehrer', (select count(*) from public.lern_fahrlehrer_freigabe where status = 'offen'),
    'bewerbungen', (select count(*) from public.lern_creator_bewerbung where status = 'offen'),
    'termine', (select count(*) from public.lern_sync s
                 where s.daten->>'pruefungstermin' ~ '^\d{4}-\d{2}-\d{2}'
                   and (s.daten->>'pruefungstermin')::timestamptz between now() and now() + interval '30 days'));
end;
$$;
revoke execute on function public.lern_admin_zaehler() from public, anon;
grant execute on function public.lern_admin_zaehler() to authenticated;

notify pgrst, 'reload schema';
