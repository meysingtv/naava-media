-- =====================================================================
-- DEMO-DATEN WIEDER ENTFERNEN
-- =====================================================================
-- Löscht ausschließlich die Zeilen, die supabase/demo-daten.sql angelegt
-- hat. Erkennungsmerkmal: Die Kennung (id) beginnt mit 'dddddddd-'.
-- Echte Daten werden nicht berührt.
--
-- ANWENDEN: Supabase → SQL Editor → Inhalt einfügen → „Run".
-- =====================================================================

do $$
declare
  v_weg int := 0;
  v_teil int;
begin
  -- Kinder zuerst, damit keine Fremdschlüssel blockieren.
  delete from public.rechnung_position   where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.zahlung             where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.rate                where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.theorie_teilnahme   where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.kurs_teilnahme      where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.dokument            where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.schueler_fortschritt where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.fahrstunde          where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.pruefung            where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.aufgabe             where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.nachricht           where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.pinnwand            where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.kassenbuch_eintrag  where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.leistung            where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.rechnung            where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.theoriestunde       where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.kurs                where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.fahrschueler        where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.fahrzeug            where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;

  -- Rollen-Profile lösen sich beim Löschen von Fahrlehrern nicht auf,
  -- deshalb erst die Zuordnung leeren, dann Rolle und Fahrlehrer.
  update public.fahrlehrer set benutzerrolle_id = null
   where benutzerrolle_id::text like 'dddddddd-%';
  delete from public.benutzerrolle       where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;
  delete from public.fahrlehrer          where id::text like 'dddddddd-%'; get diagnostics v_teil = row_count; v_weg := v_weg + v_teil;

  raise notice 'Demo-Daten entfernt: % Zeilen gelöscht.', v_weg;
end $$;
