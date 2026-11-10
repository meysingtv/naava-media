-- =====================================================================
-- Schüler-Portal: eigener Login für Fahrschüler + strikte Zugriffsrechte
-- Schüler dürfen NUR ihre eigenen Daten LESEN (kein Schreiben, kein
-- Zugriff auf andere Schüler oder das Büro). Additiv & idempotent.
-- =====================================================================

-- 1) Verknüpfung Auth-User <-> Fahrschüler + Zugangscode
alter table public.fahrschueler
  add column if not exists user_id      uuid references auth.users(id) on delete set null,
  add column if not exists portal_code  text,
  add column if not exists portal_aktiv boolean not null default false;

create unique index if not exists fahrschueler_user_id_uq
  on public.fahrschueler(user_id) where user_id is not null;

-- 2) Aktueller Schüler (aus dem eingeloggten Auth-User)
create or replace function public.current_schueler_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.fahrschueler where user_id = auth.uid() limit 1;
$$;

-- 3) Zugang per Code verknüpfen (wird beim ersten Login aufgerufen)
create or replace function public.schueler_portal_verknuepfen(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Nicht authentifiziert'; end if;
  -- Bereits verknüpft?
  select id into v_id from public.fahrschueler where user_id = v_uid limit 1;
  if v_id is not null then return v_id; end if;
  -- Code einlösen (nur aktive, noch nicht vergebene Codes)
  update public.fahrschueler set user_id = v_uid
   where portal_code = p_code and portal_aktiv = true and user_id is null
   returning id into v_id;
  return v_id; -- NULL, wenn der Code ungültig ist
end; $$;

-- 4) Branding fürs Portal ohne sensible Spalten (kein IBAN o. Ä.)
create or replace function public.schueler_fahrschule()
returns table(name text, ort text, logo_url text)
language sql stable security definer set search_path = public as $$
  select f.name, f.ort, f.logo_url
    from public.fahrschule f
    join public.fahrschueler s on s.fahrschule_id = f.id
   where s.user_id = auth.uid()
   limit 1;
$$;

-- 5) Lese-Rechte (SELECT) NUR auf eigene Zeilen
drop policy if exists "fahrschueler_select_self" on public.fahrschueler;
create policy "fahrschueler_select_self" on public.fahrschueler
  for select to authenticated using (id = public.current_schueler_id());

drop policy if exists "fahrstunde_select_schueler" on public.fahrstunde;
create policy "fahrstunde_select_schueler" on public.fahrstunde
  for select to authenticated using (schueler_id = public.current_schueler_id());

drop policy if exists "rechnung_select_schueler" on public.rechnung;
create policy "rechnung_select_schueler" on public.rechnung
  for select to authenticated using (schueler_id = public.current_schueler_id());

drop policy if exists "pruefung_select_schueler" on public.pruefung;
create policy "pruefung_select_schueler" on public.pruefung
  for select to authenticated using (schueler_id = public.current_schueler_id());
