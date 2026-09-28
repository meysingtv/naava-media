-- =====================================================================
-- Fahrschule Pro – Anmelden ohne E-Mail-Bestätigung
-- Im Supabase SQL Editor ausführen (mehrfach ausführbar). Steht auch als
-- Abschnitt 15 in schema.sql.
--
-- Neue Konten mit E-Mail + Passwort sind sofort nutzbar – keine
-- Bestätigungs-Mail, kein „Bitte bestätige zuerst deine E-Mail-Adresse“.
-- Weil die Adresse dabei nie geprüft wird, bekommen diese Konten in den
-- App-Metadaten (vom Nutzer nicht änderbar) die Markierung
-- "email_ungeprueft". Sonderrechte über die E-Mail-Adresse (Inhaber) gibt es
-- nur mit geprüfter Adresse oder über Google/Apple – sonst könnte jemand mit
-- einer fremden Inhaber-Adresse Inhaber werden.
--
-- Zusätzlich im Dashboard: Authentication → Sign In / Providers → Email →
-- „Confirm email“ ausschalten. Dann verschickt Supabase auch keine
-- Bestätigungs-Mails mehr (und das Mail-Limit bremst Registrierungen nicht aus).
-- =====================================================================

-- 15) Ohne E-Mail-Bestätigung ------------------------------------------
create or replace function public.lern_ohne_bestaetigung()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email' then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('email_ungeprueft', true);
    if new.email_confirmed_at is null then
      new.email_confirmed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lern_ohne_bestaetigung on auth.users;
create trigger lern_ohne_bestaetigung
  before insert on auth.users
  for each row execute function public.lern_ohne_bestaetigung();

revoke execute on function public.lern_ohne_bestaetigung() from public, anon, authenticated;

-- Wer sich schon registriert, aber nie bestätigt hat, kann sich ab jetzt anmelden
-- (Markierung „vorher“ = Konto stammt aus der Zeit vor der Umstellung).
update auth.users
   set email_confirmed_at = now(),
       raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('email_ungeprueft', 'vorher')
 where email_confirmed_at is null
   and coalesce(raw_app_meta_data->>'provider', 'email') = 'email';

-- Inhaber-Konten aus der Zeit vor der Umstellung gelten als geprüft (das bist du).
-- Neue Registrierungen mit einer Inhaber-Adresse bleiben markiert – auch wenn
-- diese Datei später noch einmal läuft.
update auth.users u
   set raw_app_meta_data = u.raw_app_meta_data - 'email_ungeprueft'
  from public.lern_inhaber i
 where lower(i.email) = lower(u.email)
   and u.raw_app_meta_data->>'email_ungeprueft' = 'vorher';

-- Inhaber nur mit geprüfter Adresse oder mit Google/Apple-Anmeldung.
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
         or exists (select 1 from auth.identities a where a.user_id = u.id and a.provider in ('google', 'apple'))
       )
  );
$$;

revoke execute on function public.lern_ist_inhaber() from public, anon;
grant execute on function public.lern_ist_inhaber() to authenticated;

notify pgrst, 'reload schema';
