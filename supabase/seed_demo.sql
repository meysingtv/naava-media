-- =====================================================================
-- DEMO-DATEN für eine Präsentation
-- Einmal im Supabase SQL-Editor ausführen (Projekt, das auch die App nutzt!).
-- Befüllt JEDE Fahrschule mit Team, Schülern, Fahrzeugen, Fahrstunden,
-- Rechnungen und Theorie – egal welche gerade aktiv ist.
-- Web, iPad-App und iPhone-App zeigen die Daten automatisch (gleiche DB).
-- =====================================================================
do $$
declare
  v_fs uuid;
begin
  for v_fs in select id from public.fahrschule loop

    -- Pro Fahrschule überspringen, falls Demo-Daten schon da sind
    if exists (
      select 1 from public.fahrlehrer
      where fahrschule_id = v_fs and vorname = 'Michael' and nachname = 'Wagner'
    ) then
      continue;
    end if;

    -- ---- Team / Fahrlehrer ----
    insert into public.fahrlehrer
      (fahrschule_id, vorname, nachname, email, telefon, fuehrerscheinklassen, rolle, aktiv, kuerzel)
    values
      (v_fs,'Michael','Wagner','m.wagner@fahrpilot.de','0151 2345671', array['B','BE','A'],   'fahrlehrer', true, 'MW'),
      (v_fs,'Sandra','Klein','s.klein@fahrpilot.de','0151 2345672',   array['B','B197'],      'fahrlehrer', true, 'SK'),
      (v_fs,'Tobias','Fischer','t.fischer@fahrpilot.de','0151 2345673',array['B','C','CE'],    'fahrlehrer', true, 'TF'),
      (v_fs,'Julia','Hofmann','buero@fahrpilot.de','0151 2345674',    array['B'],             'buero',      true, 'JH');

    -- ---- Fahrzeuge ----
    insert into public.fahrzeug (fahrschule_id, kennzeichen, marke, modell, klasse, aktiv, name)
    values
      (v_fs,'K-FP 1010','VW','Golf 8','B', true,'Golf 1'),
      (v_fs,'K-FP 1020','VW','Golf 8','B', true,'Golf 2'),
      (v_fs,'K-FP 2030','Mercedes-Benz','A-Klasse','B', true,'A-Klasse'),
      (v_fs,'K-FP 3040','BMW','R 1250','A', true,'Motorrad');

    -- ---- Fahrschüler ----
    insert into public.fahrschueler
      (fahrschule_id, vorname, nachname, geburtsdatum, telefon, email, ort, fuehrerscheinklassen,
       anmeldedatum, theorie_bestanden, theorie_termin, pruefung_termin, avatar_farbe, kundennummer)
    values
      (v_fs,'Lena','Schäfer','2006-03-14','0160 1110001','lena.schaefer@example.de','Köln',   array['B'],     current_date-60, true,  null,            current_date+10,'#2563EB',1001),
      (v_fs,'Jonas','Becker','2005-07-22','0160 1110002','jonas.becker@example.de','Köln',     array['B','BE'],current_date-90, true,  null,            current_date+4, '#16A34A',1002),
      (v_fs,'Mia','Wolf','2007-01-09','0160 1110003','mia.wolf@example.de','Köln',             array['B'],     current_date-30, false, current_date+7,  null,           '#9333EA',1003),
      (v_fs,'Leon','Schulz','2006-11-30','0160 1110004','leon.schulz@example.de','Frechen',    array['B'],     current_date-45, true,  null,            current_date+18,'#DB2777',1004),
      (v_fs,'Emma','Richter','2005-05-18','0160 1110005','emma.richter@example.de','Köln',     array['A1','B'],current_date-120,true,  null,            null,           '#EA580C',1005),
      (v_fs,'Paul','Neumann','2006-09-03','0160 1110006','paul.neumann@example.de','Hürth',    array['B'],     current_date-15, false, current_date+3,  null,           '#0891B2',1006),
      (v_fs,'Hannah','Braun','2007-02-27','0160 1110007','hannah.braun@example.de','Köln',     array['B'],     current_date-75, true,  null,            current_date+25,'#CA8A04',1007),
      (v_fs,'Finn','Krüger','2005-12-12','0160 1110008','finn.krueger@example.de','Köln',      array['B','A'], current_date-50, true,  null,            null,           '#4F46E5',1008),
      (v_fs,'Sophie','Lehmann','2006-06-06','0160 1110009','sophie.lehmann@example.de','Pulheim',array['B'],   current_date-20, false, current_date+12, null,           '#059669',1009),
      (v_fs,'Luca','Köhler','2006-08-19','0160 1110010','luca.koehler@example.de','Köln',      array['B'],     current_date-100,true,  null,            current_date+6, '#DC2626',1010),
      (v_fs,'Marie','Vogel','2007-04-01','0160 1110011','marie.vogel@example.de','Köln',       array['B'],     current_date-10, false, current_date+20, null,           '#2563EB',1011),
      (v_fs,'Ben','Schmitt','2005-10-25','0160 1110012','ben.schmitt@example.de','Frechen',    array['B','BE'],current_date-65, true,  null,            current_date+2, '#16A34A',1012);

    -- ---- Fahrstunden (vergangene 2 Tage bis +5 Tage, inkl. HEUTE) ----
    insert into public.fahrstunde
      (fahrschule_id, schueler_id, fahrlehrer_id, fahrzeug_id, datum, uhrzeit, dauer_minuten, typ, status)
    select
      v_fs,
      (select id from public.fahrschueler where fahrschule_id = v_fs order by random() limit 1),
      (select id from public.fahrlehrer  where fahrschule_id = v_fs and rolle <> 'buero' order by random() limit 1),
      (select id from public.fahrzeug    where fahrschule_id = v_fs order by random() limit 1),
      (current_date + d),
      (time '08:00' + (slot * interval '90 minutes')),
      45,
      (array['normal','normal','autobahn','ueberland','nacht','pruefung']::public.fahrstunde_typ[])[1 + floor(random()*6)::int],
      (case when d < 0 then 'abgeschlossen' else 'geplant' end)::public.fahrstunde_status
    from generate_series(-2, 5) as d, generate_series(0, 2) as slot;

    -- ---- Rechnungen ----
    insert into public.rechnung
      (fahrschule_id, schueler_id, nummer, betrag_netto, steuersatz, betrag_brutto, status, rechnungsdatum, faelligkeitsdatum)
    select
      v_fs,
      (select id from public.fahrschueler where fahrschule_id = v_fs order by random() limit 1),
      'RE-' || left(v_fs::text, 4) || '-' || lpad(g::text, 4, '0'),
      betr, 19, round(betr * 1.19, 2),
      (array['offen','bezahlt','bezahlt','ueberfaellig']::public.rechnung_status[])[1 + floor(random()*4)::int],
      current_date - (g * 4),
      current_date - (g * 4) + 14
    from generate_series(1, 7) as g,
         lateral (select round((180 + random() * 900)::numeric, 2) as betr) x;

    -- ---- Theoriestunden + Teilnahme ----
    insert into public.theoriestunde (fahrschule_id, datum, uhrzeit, thema, max_teilnehmer)
    values
      (v_fs, current_date + 1, '18:00', 'Grundstoff 3 – Verkehrszeichen', 20),
      (v_fs, current_date + 4, '18:00', 'Zusatzstoff Klasse B (1)', 20);

    insert into public.theorie_teilnahme (theoriestunde_id, schueler_id, anwesend)
    select t.id, s.id, (random() < 0.7)
    from public.theoriestunde t
    cross join lateral (
      select id from public.fahrschueler where fahrschule_id = v_fs order by random() limit 6
    ) s
    where t.fahrschule_id = v_fs;

  end loop;

  raise notice 'Demo-Daten eingespielt.';
end $$;

-- =====================================================================
-- Demo-Daten später entfernen (optional):
--   delete from public.fahrschueler where email like '%@example.de';
--   delete from public.fahrlehrer  where email like '%@fahrpilot.de';
--   delete from public.fahrzeug    where kennzeichen like 'K-FP %';
-- =====================================================================
