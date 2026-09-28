-- =====================================================================
-- Fahrschule Pro – Sicherheits-Update (steht auch als Abschnitt 14 in
-- schema.sql). Einmal im Supabase-SQL-Editor ausführen; mehrfaches
-- Ausführen ist unschädlich.
--
-- Schließt:
--  • Funktionen, die ohne Konto aufrufbar waren
--  • Punkte-Farmen (XP) per Dauerschleife und erfundene Serien
--  • gefälschte Duell-Ergebnisse und Code-Raten bei Freundes-Duellen
--  • Spam: Likes, Kommentare, Folgen, Teilen, Meldungen, Clips
--  • überlange oder unsinnige Eingaben (Name, Klasse, Farbe, Bundesland)
--  • volllaufenden Speicher (Lernstand, Profilbilder, Clips)
-- =====================================================================

-- a) Gültige Werte im Profil ------------------------------------------------
create or replace function public.lern_bundesland_gueltig(p text)
returns boolean
language sql immutable
as $$
  select p in ('Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen',
               'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
               'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen');
$$;

-- „not valid“: gilt für alle neuen Änderungen, bestehende Zeilen bleiben, wie sie sind.
do $$ begin
  alter table public.lern_profil add constraint lern_profil_name_laenge check (char_length(name) <= 40) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lern_profil add constraint lern_profil_klasse_form check (klasse ~ '^[A-Z0-9]{1,4}$') not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lern_profil add constraint lern_profil_farbe_form check (avatar_farbe ~ '^#[0-9A-Fa-f]{6}$') not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.lern_profil add constraint lern_profil_bundesland_gueltig check (bundesland is null or public.lern_bundesland_gueltig(bundesland)) not valid;
exception when duplicate_object then null; end $$;

-- Gesicherter Lernstand höchstens 5 MB.
do $$ begin
  alter table public.lern_sync add constraint lern_sync_groesse check (octet_length(daten::text) <= 5000000) not valid;
exception when duplicate_object then null; end $$;

-- Registrierung: Werte aus der App kürzen bzw. prüfen, bevor sie ins Profil gehen.
create or replace function public.lern_neuer_nutzer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  basis    text := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'benutzername', ''), split_part(new.email, '@', 1)), '[^a-zA-Z0-9_.]', '', 'g'));
  kandidat text;
  v_klasse text := upper(coalesce(new.raw_user_meta_data->>'klasse', ''));
begin
  if basis = '' then basis := 'fahrer'; end if;
  kandidat := left(basis, 20);
  while exists (select 1 from public.lern_profil where benutzername = kandidat) loop
    kandidat := left(basis, 15) || floor(random() * 90000 + 10000)::int;
  end loop;
  if v_klasse !~ '^[A-Z0-9]{1,4}$' then v_klasse := 'B'; end if;

  insert into public.lern_profil (id, name, benutzername, klasse)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), kandidat), 40), kandidat, v_klasse)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.lern_bundesland_setzen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.lern_bundesland_gueltig(new.raw_user_meta_data->>'bundesland') then
    update public.lern_profil
       set bundesland = new.raw_user_meta_data->>'bundesland'
     where id = new.id and bundesland is null;
  end if;
  return new;
end;
$$;

-- b) Mengenbremse für alles, was man oft hintereinander aufrufen könnte ---
create table if not exists public.lern_limit (
  user_id uuid not null,
  art     text not null,
  zeit    timestamptz not null default now()
);
create index if not exists lern_limit_idx on public.lern_limit (user_id, art, zeit);
alter table public.lern_limit enable row level security;
-- Keine Policies: nur die Funktionen unten lesen und schreiben.

create or replace function public.lern_limit_pruefen(p_art text, p_max integer, p_fenster interval)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if (select count(*) from public.lern_limit l where l.user_id = v_ich and l.art = p_art and l.zeit > now() - p_fenster) >= p_max then
    raise exception 'Zu viele Anfragen – bitte warte kurz.';
  end if;
  insert into public.lern_limit (user_id, art) values (v_ich, p_art);
  delete from public.lern_limit l where l.user_id = v_ich and l.zeit < now() - interval '1 day';
end;
$$;

-- c) XP: je Aufruf und je Tag gedeckelt, Serie nie länger als das Konto alt ist
alter table public.lern_profil
  add column if not exists xp_tag date,
  add column if not exists xp_heute integer not null default 0,
  add column if not exists fragen_heute integer not null default 0;

create or replace function public.lern_xp_buchen(p_xp integer, p_gesamt integer, p_richtig integer, p_serie integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ich   uuid := auth.uid();
  v_heute date := (now() at time zone 'Europe/Berlin')::date;
  v_woche date := (date_trunc('week', now() at time zone 'Europe/Berlin'))::date;
  v_p     public.lern_profil;
  v_xp    integer;
  v_ges   integer;
  v_serie integer;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select * into v_p from public.lern_profil where id = v_ich for update;
  if not found then return; end if;
  if v_p.xp_tag is distinct from v_heute then
    v_p.xp_heute := 0;
    v_p.fragen_heute := 0;
  end if;
  v_xp    := greatest(0, least(coalesce(p_xp, 0), 600, 5000 - v_p.xp_heute));
  v_ges   := greatest(0, least(coalesce(p_gesamt, 0), 120, 2000 - v_p.fragen_heute));
  v_serie := greatest(0, least(coalesce(p_serie, 0), (v_heute - (v_p.created_at at time zone 'Europe/Berlin')::date) + 1));
  update public.lern_profil p set
    xp             = p.xp + v_xp,
    xp_woche       = (case when p.woche_start = v_woche then p.xp_woche else 0 end) + v_xp,
    woche_start    = v_woche,
    xp_tag         = v_heute,
    xp_heute       = v_p.xp_heute + v_xp,
    fragen_heute   = v_p.fragen_heute + v_ges,
    fragen_gesamt  = p.fragen_gesamt + v_ges,
    fragen_richtig = p.fragen_richtig + greatest(0, least(coalesce(p_richtig, 0), v_ges)),
    serie          = v_serie,
    beste_serie    = greatest(p.beste_serie, v_serie)
  where p.id = v_ich;
end;
$$;

-- d) Duelle: gültige Fragen, Mengenbremse, plausible Ergebnisse -----------
alter table public.lern_duell add column if not exists beigetreten_am timestamptz;

create or replace function public.lern_fragen_gueltig(p_fragen text[])
returns boolean
language sql immutable
as $$
  select coalesce(array_length(p_fragen, 1), 0) between 1 and 10
     and not exists (select 1 from unnest(p_fragen) f where f is null or f !~ '^[A-Za-z0-9_.-]{1,40}$');
$$;

create or replace function public.lern_duell_rangliste(p_fragen text[])
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_elo integer;
  v_duell public.lern_duell;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if not public.lern_fragen_gueltig(p_fragen) then raise exception 'Ungültige Fragen'; end if;
  perform public.lern_limit_pruefen('duell', 60, interval '1 day');
  select elo into v_elo from public.lern_profil where id = v_ich;

  select d.* into v_duell
    from public.lern_duell d
    join public.lern_profil p on p.id = d.spieler1
   where d.art = 'rangliste' and d.status = 'wartet' and d.spieler2 is null
     and d.spieler1 <> v_ich and d.punkte1 is not null
     and d.erstellt_am > now() - interval '3 days'
   order by abs(p.elo - coalesce(v_elo, 1000)), d.erstellt_am
   limit 1
   for update of d skip locked;

  if found then
    update public.lern_duell set spieler2 = v_ich, status = 'laeuft', beigetreten_am = now() where id = v_duell.id returning * into v_duell;
    return v_duell;
  end if;

  insert into public.lern_duell (art, fragen, spieler1) values ('rangliste', p_fragen[1:10], v_ich) returning * into v_duell;
  return v_duell;
end;
$$;

create or replace function public.lern_duell_freund(p_fragen text[])
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_code text;
  v_duell public.lern_duell;
  v_zeichen text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if not public.lern_fragen_gueltig(p_fragen) then raise exception 'Ungültige Fragen'; end if;
  perform public.lern_limit_pruefen('duell', 60, interval '1 day');
  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_zeichen, 1 + floor(random() * length(v_zeichen))::int, 1);
    end loop;
    exit when not exists (select 1 from public.lern_duell where code = v_code);
  end loop;
  insert into public.lern_duell (art, code, fragen, spieler1) values ('freund', v_code, p_fragen[1:10], v_ich) returning * into v_duell;
  return v_duell;
end;
$$;

-- Codes durchprobieren bringt nichts: höchstens 30 Versuche in 10 Minuten.
-- Ein falscher Code liefert ein leeres Duell statt eines Fehlers – sonst
-- würde die Datenbank den gezählten Versuch mit zurückrollen.
create or replace function public.lern_duell_beitreten(p_code text)
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_duell public.lern_duell;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('duell_code', 30, interval '10 minutes');
  update public.lern_duell
     set spieler2 = v_ich, status = 'laeuft', beigetreten_am = now()
   where code = upper(btrim(coalesce(p_code, ''))) and art = 'freund' and spieler2 is null and spieler1 <> v_ich
  returning * into v_duell;
  return v_duell;
end;
$$;

-- Ergebnis: Wer schneller „fertig“ ist, als man die Fragen lesen kann
-- (unter 1 Sekunde je Frage seit dem Start), bekommt 0 Punkte.
create or replace function public.lern_duell_ergebnis(p_id uuid, p_punkte integer, p_zeit integer)
returns public.lern_duell
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_duell public.lern_duell;
  v_anzahl integer;
  v_punkte integer;
  v_zeit integer;
  v_start timestamptz;
  v_sieger uuid;
  v_elo1 integer;
  v_elo2 integer;
  v_erwartet double precision;
  v_wert double precision;
  v_aenderung integer := null;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  select * into v_duell from public.lern_duell where id = p_id for update;
  if v_duell.id is null or (v_duell.spieler1 <> v_ich and v_duell.spieler2 is distinct from v_ich) then
    raise exception 'Duell nicht gefunden';
  end if;
  v_anzahl := coalesce(array_length(v_duell.fragen, 1), 10);
  v_punkte := greatest(0, least(coalesce(p_punkte, 0), v_anzahl));
  v_zeit := greatest(v_anzahl, least(coalesce(p_zeit, 0), 3600));
  v_start := case when v_duell.spieler1 = v_ich then v_duell.erstellt_am else coalesce(v_duell.beigetreten_am, v_duell.erstellt_am) end;
  if extract(epoch from now() - v_start) < v_anzahl then v_punkte := 0; end if;

  if v_duell.spieler1 = v_ich and v_duell.punkte1 is null then
    update public.lern_duell set punkte1 = v_punkte, zeit1 = v_zeit where id = p_id returning * into v_duell;
  elsif v_duell.spieler2 = v_ich and v_duell.punkte2 is null then
    update public.lern_duell set punkte2 = v_punkte, zeit2 = v_zeit where id = p_id returning * into v_duell;
  end if;

  if v_duell.punkte1 is not null and v_duell.punkte2 is not null and v_duell.status <> 'fertig' then
    v_sieger := case
      when v_duell.punkte1 > v_duell.punkte2 then v_duell.spieler1
      when v_duell.punkte2 > v_duell.punkte1 then v_duell.spieler2
      when v_duell.zeit1 < v_duell.zeit2 then v_duell.spieler1
      when v_duell.zeit2 < v_duell.zeit1 then v_duell.spieler2
      else null end;
    if v_duell.art = 'rangliste' then
      select elo into v_elo1 from public.lern_profil where id = v_duell.spieler1;
      select elo into v_elo2 from public.lern_profil where id = v_duell.spieler2;
      v_erwartet := 1 / (1 + power(10, (v_elo2 - v_elo1) / 400.0));
      v_wert := case when v_sieger = v_duell.spieler1 then 1 when v_sieger = v_duell.spieler2 then 0 else 0.5 end;
      v_aenderung := round(32 * (v_wert - v_erwartet));
      update public.lern_profil set elo = greatest(100, elo + v_aenderung) where id = v_duell.spieler1;
      update public.lern_profil set elo = greatest(100, elo - v_aenderung) where id = v_duell.spieler2;
    end if;
    update public.lern_duell
       set status = 'fertig', sieger = v_sieger, elo_aenderung = v_aenderung, fertig_am = now()
     where id = p_id
    returning * into v_duell;
  end if;
  return v_duell;
end;
$$;

-- e) Clips, Likes, Kommentare, Folgen: Mengenbremse ------------------------
create or replace function public.lern_clip_anlegen(
  p_video text, p_bild text, p_titel text, p_beschreibung text, p_breite integer, p_hoehe integer, p_dauer real
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_id  uuid;
begin
  if v_ich is null or not public.lern_darf_hochladen() then raise exception 'Keine Berechtigung zum Hochladen'; end if;
  perform public.lern_limit_pruefen('clip', 20, interval '1 day');
  if split_part(p_video, '/', 1) <> v_ich::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'lern-clips' and o.name = p_video) then
    raise exception 'Video nicht gefunden';
  end if;
  if p_bild is not null and (split_part(p_bild, '/', 1) <> v_ich::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'lern-clips' and o.name = p_bild)) then
    raise exception 'Vorschaubild ungültig';
  end if;
  insert into public.lern_clip (autor, titel, beschreibung, video_pfad, bild_pfad, breite, hoehe, dauer)
  values (v_ich, left(btrim(coalesce(p_titel, '')), 120), left(btrim(coalesce(p_beschreibung, '')), 1000),
          p_video, p_bild,
          nullif(greatest(0, least(coalesce(p_breite, 0), 10000)), 0),
          nullif(greatest(0, least(coalesce(p_hoehe, 0), 10000)), 0),
          nullif(greatest(0, least(coalesce(p_dauer, 0), 600)), 0))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.lern_clip_liken(p_clip uuid, p_an boolean)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_neu    integer;
  v_anzahl integer;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('like', 600, interval '1 hour');
  if p_an then
    insert into public.lern_clip_like (clip_id, user_id) values (p_clip, v_ich) on conflict do nothing;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip c set likes = c.likes + 1 where c.id = p_clip; end if;
  else
    delete from public.lern_clip_like l where l.clip_id = p_clip and l.user_id = v_ich;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip c set likes = greatest(0, c.likes - 1) where c.id = p_clip; end if;
  end if;
  select c.likes into v_anzahl from public.lern_clip c where c.id = p_clip;
  return coalesce(v_anzahl, 0);
end;
$$;

create or replace function public.lern_folgen_setzen(p_nutzer uuid, p_an boolean)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_nutzer = v_ich then return false; end if;
  perform public.lern_limit_pruefen('folgen', 300, interval '1 hour');
  if p_an then
    insert into public.lern_folgen (folger, folgt) values (v_ich, p_nutzer) on conflict do nothing;
  else
    delete from public.lern_folgen f where f.folger = v_ich and f.folgt = p_nutzer;
  end if;
  return p_an;
end;
$$;

create or replace function public.lern_clip_kommentieren(p_clip uuid, p_inhalt text, p_antwort_auf uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_text   text := left(btrim(coalesce(p_inhalt, '')), 500);
  v_eltern uuid;
  v_id     uuid;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if v_text = '' then raise exception 'Kommentar ist leer'; end if;
  if (select count(*) from public.lern_clip_kommentar k where k.autor = v_ich and k.erstellt_am > now() - interval '1 minute') >= 10 then
    raise exception 'Zu viele Kommentare – bitte kurz warten';
  end if;
  perform public.lern_limit_pruefen('kommentar', 300, interval '1 day');
  if p_antwort_auf is not null then
    -- Antworten hängen immer am obersten Kommentar.
    select coalesce(k.antwort_auf, k.id) into v_eltern
      from public.lern_clip_kommentar k
     where k.id = p_antwort_auf and k.clip_id = p_clip;
    if v_eltern is null then raise exception 'Kommentar nicht gefunden'; end if;
  end if;
  insert into public.lern_clip_kommentar (clip_id, autor, inhalt, antwort_auf) values (p_clip, v_ich, v_text, v_eltern) returning id into v_id;
  update public.lern_clip c set kommentare = c.kommentare + 1 where c.id = p_clip;
  return v_id;
end;
$$;

create or replace function public.lern_kommentar_liken(p_kommentar uuid, p_an boolean)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_ich    uuid := auth.uid();
  v_neu    integer;
  v_anzahl integer;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('like', 600, interval '1 hour');
  if p_an then
    insert into public.lern_kommentar_like (kommentar_id, user_id) values (p_kommentar, v_ich) on conflict do nothing;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip_kommentar k set likes = k.likes + 1 where k.id = p_kommentar; end if;
  else
    delete from public.lern_kommentar_like l where l.kommentar_id = p_kommentar and l.user_id = v_ich;
    get diagnostics v_neu = row_count;
    if v_neu > 0 then update public.lern_clip_kommentar k set likes = greatest(0, k.likes - 1) where k.id = p_kommentar; end if;
  end if;
  select k.likes into v_anzahl from public.lern_clip_kommentar k where k.id = p_kommentar;
  return coalesce(v_anzahl, 0);
end;
$$;

create or replace function public.lern_kommentar_reagieren(p_kommentar uuid, p_emoji text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
  v_ergebnis jsonb;
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('like', 600, interval '1 hour');
  if coalesce(p_emoji, '') = '' then
    delete from public.lern_kommentar_reaktion r where r.kommentar_id = p_kommentar and r.user_id = v_ich;
  else
    insert into public.lern_kommentar_reaktion (kommentar_id, user_id, emoji) values (p_kommentar, v_ich, p_emoji)
    on conflict (kommentar_id, user_id) do update set emoji = excluded.emoji, erstellt_am = now();
  end if;
  select coalesce(jsonb_object_agg(x.emoji, x.anzahl), '{}'::jsonb) into v_ergebnis
    from (select r.emoji, count(*) as anzahl from public.lern_kommentar_reaktion r where r.kommentar_id = p_kommentar group by r.emoji) x;
  return v_ergebnis;
end;
$$;

-- Teilen zählt nur mit Konto und höchstens 60-mal pro Stunde.
drop function if exists public.lern_clip_geteilt(uuid);
create or replace function public.lern_clip_geteilt(p_clip uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_anzahl integer;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('teilen', 60, interval '1 hour');
  update public.lern_clip c set geteilt = c.geteilt + 1 where c.id = p_clip returning c.geteilt into v_anzahl;
  return v_anzahl;
end;
$$;

create or replace function public.lern_clip_melden(p_clip uuid, p_grund text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform public.lern_limit_pruefen('melden', 30, interval '1 day');
  insert into public.lern_clip_meldung (clip_id, user_id, grund)
  values (p_clip, auth.uid(), left(coalesce(p_grund, ''), 200))
  on conflict (clip_id, user_id) do update set grund = excluded.grund, erstellt_am = now();
end;
$$;

-- Benutzernamen und Rolle: nicht im Sekundentakt wechseln.
create or replace function public.lern_benutzername_aendern(p_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_ich  uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_name, '')));
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if v_name !~ '^[a-z0-9_.]{3,20}$' then
    raise exception 'Benutzername: 3–20 Zeichen, nur Buchstaben, Zahlen, Punkt und Unterstrich';
  end if;
  if exists (select 1 from public.lern_profil p where p.benutzername = v_name and p.id <> v_ich) then
    raise exception 'Dieser Benutzername ist schon vergeben';
  end if;
  perform public.lern_limit_pruefen('benutzername', 10, interval '1 day');
  update public.lern_profil p set benutzername = v_name where p.id = v_ich;
  return v_name;
end;
$$;

create or replace function public.lern_rolle_setzen(p_rolle text)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_rolle not in ('schueler', 'fahrlehrer') then raise exception 'Unbekannte Rolle'; end if;
  perform public.lern_limit_pruefen('rolle', 20, interval '1 day');
  update public.lern_profil set rolle = p_rolle where id = auth.uid();
  return p_rolle;
end;
$$;

-- f) Speicher: höchstens 10 Profilbilder und 400 Clip-Dateien je Konto -----
create or replace function public.lern_speicher_anzahl(p_bucket text)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
    from storage.objects o
   where o.bucket_id = p_bucket and (storage.foldername(o.name))[1] = auth.uid()::text;
$$;

drop policy if exists "lern_profilbild_hochladen" on storage.objects;
create policy "lern_profilbild_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-profilbilder' and (storage.foldername(name))[1] = auth.uid()::text
              and public.lern_speicher_anzahl('lern-profilbilder') < 10);

drop policy if exists "lern_clips_hochladen" on storage.objects;
create policy "lern_clips_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-clips' and (storage.foldername(name))[1] = auth.uid()::text
              and public.lern_darf_hochladen() and public.lern_speicher_anzahl('lern-clips') < 400);

-- g) Wer darf welche Funktion aufrufen? ------------------------------------
-- Supabase gibt neuen Funktionen Ausführungsrecht für alle – auch ohne Konto.
-- Erst allen lern_-Funktionen „ohne Konto“ entziehen, angemeldeten geben …
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, pg_get_function_result(p.oid) as ergebnis
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'lern\_%'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.ergebnis <> 'trigger' then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;

-- … dann ohne Konto nur das, was Gäste brauchen: Clips und Kommentare
-- ansehen, Profile ansehen, Benutzername prüfen, mit Benutzername anmelden.
grant execute on function public.lern_benutzername_frei(text) to anon;
grant execute on function public.lern_clip_feed(text, timestamptz, integer) to anon;
grant execute on function public.lern_clip_kommentare(uuid, timestamptz) to anon;
grant execute on function public.lern_ersteller_profil(uuid) to anon;
grant execute on function public.lern_clips_von(uuid, timestamptz, integer) to anon;
grant execute on function public.lern_anmelde_email(text, text) to anon;

-- Die Mengenbremse ruft nur der Server selbst auf.
revoke execute on function public.lern_limit_pruefen(text, integer, interval) from authenticated;

notify pgrst, 'reload schema';
