-- =====================================================================
-- Termin-Erinnerung & -Bestätigung (No-Show-Reduktion)
-- Jeder Termin bekommt einen unrätselbaren Token. Über öffentliche
-- SECURITY-DEFINER-Funktionen kann ein Schüler seinen Termin per Link
-- ansehen, zusagen oder absagen – ohne Login. Additiv & idempotent.
-- =====================================================================

alter table public.fahrstunde
  add column if not exists bestaetigung_token      uuid not null default gen_random_uuid(),
  add column if not exists bestaetigt_am           timestamptz,
  add column if not exists abgesagt_am             timestamptz,
  add column if not exists erinnerung_gesendet_am  timestamptz;

create unique index if not exists fahrstunde_bestaetigung_token_uq
  on public.fahrstunde(bestaetigung_token);

-- 1) Öffentlicher Lesezugriff auf GENAU EINEN Termin per Token.
create or replace function public.termin_by_token(p_token uuid)
returns table (
  datum date,
  uhrzeit time,
  dauer_minuten int,
  typ public.fahrstunde_typ,
  status public.fahrstunde_status,
  bestaetigt boolean,
  abgesagt boolean,
  fahrschule_name text,
  schueler_vorname text
)
language sql stable security definer set search_path = public as $$
  select f.datum, f.uhrzeit, f.dauer_minuten, f.typ, f.status,
         f.bestaetigt_am is not null, f.abgesagt_am is not null,
         fs.name, s.vorname
    from public.fahrstunde f
    join public.fahrschule fs on fs.id = f.fahrschule_id
    left join public.fahrschueler s on s.id = f.schueler_id
   where f.bestaetigung_token = p_token
   limit 1;
$$;

-- 2) Termin zusagen (nur geplante, nicht abgesagte).
create or replace function public.termin_bestaetigen(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.fahrstunde
     set bestaetigt_am = now()
   where bestaetigung_token = p_token
     and status = 'geplant'
     and abgesagt_am is null
   returning id into v_id;
  return v_id is not null;
end; $$;

-- 3) Termin absagen (setzt Status ausgefallen + Notiz).
create or replace function public.termin_absagen(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.fahrstunde
     set status = 'ausgefallen',
         abgesagt_am = now(),
         notiz = case when coalesce(notiz, '') = '' then 'Vom Schüler online abgesagt'
                      else notiz || ' · Vom Schüler online abgesagt' end
   where bestaetigung_token = p_token
     and status <> 'ausgefallen'
   returning id into v_id;
  return v_id is not null;
end; $$;

-- Ausführung auch für nicht angemeldete Besucher (anon) erlauben.
grant execute on function public.termin_by_token(uuid)    to anon, authenticated;
grant execute on function public.termin_bestaetigen(uuid) to anon, authenticated;
grant execute on function public.termin_absagen(uuid)     to anon, authenticated;
