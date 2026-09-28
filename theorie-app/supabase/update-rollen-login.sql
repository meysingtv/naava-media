-- =====================================================================
-- Spur – Update: Rolle Fahrlehrer, Clips hochladen, Anmelden mit Benutzername
-- Einmal im SQL-Editor des Supabase-Projekts ausführen (mehrfach unschädlich).
-- Ist auch im Abschnitt 13 von schema.sql enthalten.
-- =====================================================================

-- 13) Rolle (Fahrschüler/Fahrlehrer) und Anmelden mit Benutzername -----
-- Fahrlehrer dürfen Clips hochladen. Die Rolle wählt man bei der
-- Registrierung (oder später in den Einstellungen).
alter table public.lern_profil
  add column if not exists rolle text not null default 'schueler';
do $$ begin
  alter table public.lern_profil add constraint lern_profil_rolle_pruefen check (rolle in ('schueler', 'fahrlehrer'));
exception when duplicate_object then null; end $$;

-- Rolle aus der Registrierung übernehmen (läuft nach lern_neuer_nutzer).
create or replace function public.lern_rolle_uebernehmen()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'rolle' = 'fahrlehrer' then
    update public.lern_profil set rolle = 'fahrlehrer' where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists lern_zz_rolle on auth.users;
create trigger lern_zz_rolle
  after insert on auth.users
  for each row execute function public.lern_rolle_uebernehmen();

-- Rolle selbst wählen (Einstellungen oder nach Google/Apple).
create or replace function public.lern_rolle_setzen(p_rolle text)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_rolle not in ('schueler', 'fahrlehrer') then raise exception 'Unbekannte Rolle'; end if;
  update public.lern_profil set rolle = p_rolle where id = auth.uid();
  return p_rolle;
end;
$$;
grant execute on function public.lern_rolle_setzen(text) to authenticated;

-- Hochladen dürfen: Inhaber, freigeschaltete Ersteller und alle Fahrlehrer.
create or replace function public.lern_darf_hochladen()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.lern_ist_inhaber()
          or exists (select 1 from public.lern_clip_ersteller e where e.user_id = auth.uid())
          or exists (select 1 from public.lern_profil p where p.id = auth.uid() and p.rolle = 'fahrlehrer'));
$$;

-- Anmelden mit Benutzername: Die E-Mail gibt es nur zurück, wenn das Passwort
-- stimmt – so lassen sich keine E-Mail-Adressen über Benutzernamen abfragen.
-- Gegen Durchprobieren: höchstens 10 Fehlversuche je Benutzername in 15 Minuten.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.lern_anmeldeversuch (
  kennung text not null,
  zeit    timestamptz not null default now()
);
create index if not exists lern_anmeldeversuch_kennung on public.lern_anmeldeversuch (kennung, zeit);
alter table public.lern_anmeldeversuch enable row level security;
-- Keine Policies: nur die Funktion unten liest und schreibt.

create or replace function public.lern_anmelde_email(p_benutzername text, p_passwort text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_name  text := lower(ltrim(btrim(coalesce(p_benutzername, '')), '@'));
  v_email text;
  v_hash  text;
begin
  if v_name = '' or coalesce(p_passwort, '') = '' then return null; end if;
  if (select count(*) from public.lern_anmeldeversuch a where a.kennung = v_name and a.zeit > now() - interval '15 minutes') >= 10 then
    raise exception 'Zu viele Versuche. Bitte warte ein paar Minuten.';
  end if;
  select u.email, u.encrypted_password into v_email, v_hash
    from public.lern_profil p
    join auth.users u on u.id = p.id
   where p.benutzername = v_name;
  if v_email is not null and v_hash like '$2%' and v_hash = extensions.crypt(p_passwort, v_hash) then
    delete from public.lern_anmeldeversuch where kennung = v_name;
    return v_email;
  end if;
  insert into public.lern_anmeldeversuch (kennung) values (v_name);
  delete from public.lern_anmeldeversuch where zeit < now() - interval '1 day';
  return null;
end;
$$;
grant execute on function public.lern_anmelde_email(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
