-- =====================================================================
-- Online-Zahlung mit Stripe
-- Jede Fahrschule verbindet ihr EIGENES Stripe-Konto (Stripe Connect).
-- Schüler bezahlen offene Rechnungen in der App oder im Portal über
-- Stripe Checkout (Apple Pay, Karte, Lastschrift, Klarna … – je nachdem,
-- was die Fahrschule in Stripe freischaltet). Ein Webhook bucht den
-- Eingang in public.zahlung und markiert die Rechnung als bezahlt.
-- Additiv – bestehende Daten bleiben unverändert.
-- =====================================================================

-- 1) Stripe-Verbindung je Fahrschule ------------------------------------
alter table public.fahrschule
  add column if not exists stripe_konto_id      text,
  add column if not exists stripe_bereit        boolean not null default false,
  add column if not exists online_zahlung_aktiv boolean not null default false;

-- Konto und Freigabe setzt nur der Server (Verbinden-Ablauf, Webhook).
-- Sonst könnte jemand aus dem Team Zahlungen auf ein fremdes Konto lenken.
create or replace function public.fahrschule_stripe_schutz()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', 'service_role') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.stripe_konto_id is not null or new.stripe_bereit then
      raise exception 'Die Stripe-Verbindung lässt sich nur über „Mit Stripe verbinden“ einrichten.';
    end if;
  elsif new.stripe_konto_id is distinct from old.stripe_konto_id
     or new.stripe_bereit is distinct from old.stripe_bereit then
    raise exception 'Die Stripe-Verbindung lässt sich nur über „Mit Stripe verbinden“ ändern.';
  end if;
  return new;
end;
$$;

drop trigger if exists fahrschule_stripe_schutz on public.fahrschule;
create trigger fahrschule_stripe_schutz
  before insert or update on public.fahrschule
  for each row execute function public.fahrschule_stripe_schutz();

-- 2) Bezahlvorgänge – je Stripe-Checkout einer ---------------------------
create table if not exists public.zahlungsvorgang (
  id                    uuid primary key default gen_random_uuid(),
  fahrschule_id         uuid not null references public.fahrschule(id) on delete cascade,
  schueler_id           uuid references public.fahrschueler(id) on delete set null,
  rechnung_ids          uuid[] not null,
  betrag                numeric(10,2) not null,
  status                text not null default 'offen'
                          check (status in ('offen', 'in_pruefung', 'bezahlt', 'fehlgeschlagen', 'abgebrochen')),
  zahlart               text,            -- card | apple_pay | google_pay | sepa_debit | klarna | paypal …
  stripe_session_id     text unique,
  stripe_payment_intent text,
  fehler                text,
  created_at            timestamptz not null default now(),
  bezahlt_am            timestamptz
);
create index if not exists zahlungsvorgang_schueler_idx on public.zahlungsvorgang(schueler_id, created_at desc);
create index if not exists zahlungsvorgang_fs_idx on public.zahlungsvorgang(fahrschule_id, created_at desc);

-- Lesen: Team der Fahrschule und der Schüler selbst. Schreiben nur der
-- Server mit Service-Role – daher keine Insert-/Update-Policy.
alter table public.zahlungsvorgang enable row level security;
drop policy if exists "zahlungsvorgang_select_team" on public.zahlungsvorgang;
create policy "zahlungsvorgang_select_team" on public.zahlungsvorgang
  for select to authenticated
  using (fahrschule_id = public.current_fahrschule_id());
drop policy if exists "zahlungsvorgang_select_schueler" on public.zahlungsvorgang;
create policy "zahlungsvorgang_select_schueler" on public.zahlungsvorgang
  for select to authenticated
  using (schueler_id = public.current_schueler_id());

-- 3) Zahlungseingang merkt sich den Vorgang – keine Doppelbuchung, wenn
--    Stripe ein Ereignis mehrfach schickt (NULL = manuell erfasst).
alter table public.zahlung
  add column if not exists zahlungsvorgang_id uuid references public.zahlungsvorgang(id) on delete set null;
create unique index if not exists zahlung_vorgang_rechnung_uidx
  on public.zahlung(zahlungsvorgang_id, rechnung_id);

-- 4) App und Portal: Kann dieser Schüler online bezahlen? --------------
create or replace function public.portal_online_zahlung()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select f.online_zahlung_aktiv and f.stripe_bereit and f.stripe_konto_id is not null
       from public.fahrschule f
       join public.fahrschueler s on s.fahrschule_id = f.id
      where s.user_id = auth.uid()
      limit 1),
    false);
$$;
grant execute on function public.portal_online_zahlung() to authenticated;

-- 5) Live-Aktualisierung in der App (falls Realtime aktiv ist) ----------
do $$ begin
  alter publication supabase_realtime add table public.zahlungsvorgang;
exception when others then null;
end $$;

notify pgrst, 'reload schema';
