-- =====================================================================
-- Mehrere Fahrschulen pro Nutzer (z. B. Filialketten) + Umschalten
-- =====================================================================
-- Ein Nutzer kann jetzt zu mehreren Fahrschulen gehören. Welche gerade
-- "aktiv" ist, steht in benutzer_profil. current_fahrschule_id() liefert
-- nur eine Fahrschule, in der der Nutzer auch tatsächlich Mitglied ist
-- (Sicherheit: kein Zugriff auf fremde Fahrschulen möglich).
-- =====================================================================

-- 1) user_id nicht mehr global eindeutig, sondern pro Fahrschule eindeutig
alter table public.fahrlehrer drop constraint if exists fahrlehrer_user_id_key;
create unique index if not exists fahrlehrer_user_fahrschule_uq
  on public.fahrlehrer(user_id, fahrschule_id)
  where user_id is not null;

-- 2) Profil: welche Fahrschule ist aktiv?
create table if not exists public.benutzer_profil (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  aktive_fahrschule_id uuid references public.fahrschule(id) on delete set null,
  updated_at           timestamptz not null default now()
);
alter table public.benutzer_profil enable row level security;
drop policy if exists "benutzer_profil_self" on public.benutzer_profil;
create policy "benutzer_profil_self" on public.benutzer_profil
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3) Aktive Fahrschule (validiert gegen Mitgliedschaft)
create or replace function public.current_fahrschule_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.aktive_fahrschule_id
       from public.benutzer_profil p
      where p.user_id = auth.uid()
        and exists (
          select 1 from public.fahrlehrer f
          where f.user_id = auth.uid()
            and f.fahrschule_id = p.aktive_fahrschule_id
        )),
    (select f.fahrschule_id
       from public.fahrlehrer f
      where f.user_id = auth.uid()
      order by f.created_at
      limit 1)
  );
$$;

-- 4) Rolle in der AKTIVEN Fahrschule
create or replace function public.current_rolle()
returns public.fahrlehrer_rolle
language sql
stable
security definer
set search_path = public
as $$
  select rolle
  from public.fahrlehrer
  where user_id = auth.uid()
    and fahrschule_id = public.current_fahrschule_id()
  limit 1;
$$;

-- 5) Aktive Fahrschule setzen (nur eigene Mitgliedschaften)
create or replace function public.set_aktive_fahrschule(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Nicht authentifiziert'; end if;
  if not exists (
    select 1 from public.fahrlehrer
    where user_id = v_uid and fahrschule_id = p_id
  ) then
    raise exception 'Keine Berechtigung für diese Fahrschule';
  end if;
  insert into public.benutzer_profil (user_id, aktive_fahrschule_id, updated_at)
  values (v_uid, p_id, now())
  on conflict (user_id) do update
    set aktive_fahrschule_id = excluded.aktive_fahrschule_id, updated_at = now();
end;
$$;

-- 6) Alle Fahrschulen des Nutzers (für den Umschalter)
create or replace function public.meine_fahrschulen()
returns table (id uuid, name text, ort text, logo_url text, rolle public.fahrlehrer_rolle)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.ort, s.logo_url, f.rolle
  from public.fahrlehrer f
  join public.fahrschule s on s.id = f.fahrschule_id
  where f.user_id = auth.uid()
  order by s.name;
$$;

-- 7) setup_fahrschule erlaubt jetzt mehrere; erste wird automatisch aktiv
create or replace function public.setup_fahrschule(
  p_name      text,
  p_vorname   text,
  p_nachname  text,
  p_strasse   text default null,
  p_plz       text default null,
  p_ort       text default null,
  p_telefon   text default null,
  p_email     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_fahrschule_id uuid;
begin
  if v_uid is null then
    raise exception 'Nicht authentifiziert';
  end if;

  insert into public.fahrschule (name, strasse, plz, ort, telefon, email)
  values (p_name, p_strasse, p_plz, p_ort, p_telefon, p_email)
  returning id into v_fahrschule_id;

  insert into public.fahrlehrer (fahrschule_id, user_id, vorname, nachname, email, rolle, aktiv)
  values (
    v_fahrschule_id,
    v_uid,
    p_vorname,
    p_nachname,
    coalesce(p_email, (select email from auth.users where id = v_uid)),
    'chef',
    true
  );

  -- Erste Fahrschule des Nutzers wird automatisch die aktive
  insert into public.benutzer_profil (user_id, aktive_fahrschule_id)
  values (v_uid, v_fahrschule_id)
  on conflict (user_id) do nothing;

  return v_fahrschule_id;
end;
$$;

-- 8) Bestandsnutzer: aktive Fahrschule auf die bestehende setzen
insert into public.benutzer_profil (user_id, aktive_fahrschule_id)
select distinct on (user_id) user_id, fahrschule_id
from public.fahrlehrer
where user_id is not null
order by user_id, created_at
on conflict (user_id) do nothing;

-- 9) Rechte
grant execute on function public.set_aktive_fahrschule(uuid) to authenticated;
grant execute on function public.meine_fahrschulen() to authenticated;
