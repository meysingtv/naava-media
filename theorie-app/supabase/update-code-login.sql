-- =====================================================================
-- 28) Anmelden mit Code per E-Mail
-- =====================================================================
-- Die App meldet nur noch mit einem Code aus der E-Mail an (kein Passwort,
-- kein Google/Apple). Wer so hereinkommt, hat die Adresse bewiesen. Konten
-- ganz ohne Passwort sind nur per Code erreichbar – sie dürfen deshalb
-- Inhaber sein, auch wenn sie als „email_ungeprueft“ markiert sind.
-- Konten mit Passwort (z. B. direkt über die Schnittstelle registriert)
-- bleiben ohne geprüfte Adresse weiter außen vor.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher muss Abschnitt 15 (update-ohne-bestaetigung.sql) gelaufen
-- sein. Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql
-- (Abschnitt 28).

create or replace function public.lern_ist_inhaber()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
      from auth.users u
      join public.lern_inhaber i on lower(i.email) = lower(u.email)
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
       and (
         not (coalesce(u.raw_app_meta_data, '{}'::jsonb) ? 'email_ungeprueft')
         or coalesce(u.encrypted_password, '') = ''
         or exists (select 1 from auth.identities a where a.user_id = u.id and a.provider in ('google', 'apple'))
       )
  );
$$;

revoke execute on function public.lern_ist_inhaber() from public, anon;
grant execute on function public.lern_ist_inhaber() to authenticated;

notify pgrst, 'reload schema';
