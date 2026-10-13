-- =====================================================================
-- Portal-Bezahlen: Zahlungslink, Rechnungspositionen für Schüler lesbar,
-- Branding-Funktion um Bankdaten/Zahlungslink erweitern. Additiv.
-- =====================================================================

-- 1) Optionaler Online-Zahlungslink (Stripe Payment Link / PayPal.me / …)
alter table public.fahrschule
  add column if not exists zahlungslink text;

-- 2) Schüler dürfen die Positionen IHRER eigenen Rechnungen lesen
drop policy if exists "rechnung_position_select_schueler" on public.rechnung_position;
create policy "rechnung_position_select_schueler" on public.rechnung_position
  for select to authenticated
  using (
    rechnung_id in (
      select id from public.rechnung where schueler_id = public.current_schueler_id()
    )
  );

-- 3) Branding-/Zahlfunktion erweitern (IBAN wird ohnehin auf der Rechnung
--    angezeigt; nötig, damit der Schüler überweisen kann). Rückgabetyp
--    ändert sich -> vorher droppen.
drop function if exists public.schueler_fahrschule();
create or replace function public.schueler_fahrschule()
returns table(
  name         text,
  ort          text,
  logo_url     text,
  iban         text,
  kontoinhaber text,
  zahlungslink text
)
language sql stable security definer set search_path = public as $$
  select f.name, f.ort, f.logo_url, f.iban, f.kontoinhaber, f.zahlungslink
    from public.fahrschule f
    join public.fahrschueler s on s.fahrschule_id = f.id
   where s.user_id = auth.uid()
   limit 1;
$$;
