-- =====================================================================
-- DEMO-DATEN für FahrschulApp
-- =====================================================================
-- Füllt die eigene Fahrschule mit realistischen Beispieldaten, damit sich
-- alle Ansichten (Leitstand, Disposition, Schüler, Finanzen, Prüfungen,
-- Erinnerungen, Cockpit, Berichte …) mit Inhalt anschauen lassen.
--
-- ANWENDEN: Supabase → SQL Editor → Inhalt einfügen → „Run".
-- Das Skript ist wiederholbar: Es entfernt zuerst seine eigenen Daten und
-- legt sie neu an. Vorhandene ECHTE Daten bleiben unangetastet.
--
-- WIEDER ENTFERNEN: siehe supabase/demo-daten-entfernen.sql
--
-- Alle Demo-Datensätze haben eine erkennbare Kennung, die mit
-- 'dddddddd-' beginnt. Nur solche Zeilen werden angelegt und gelöscht.
-- Die Daten hängen an der ÄLTESTEN Fahrschule des Kontos. Wer mehrere
-- Fahrschulen hat und eine bestimmte füllen will, trägt deren ID unten
-- bei „v_wunsch" ein (Zeile mit := null durch := 'xxxx-…' ersetzen).
-- =====================================================================

do $$
declare
  -- Optional: ID einer bestimmten Fahrschule eintragen. null = älteste.
  v_wunsch    uuid := null;
  v_fs        uuid;
  v_lehrer    uuid[];
  v_fz        uuid[];
  v_sch       uuid[];
  v_kurs      uuid;
  v_th        uuid;
  v_re        uuid;
  i           int;
  k           int;
  v_tag       date;
  v_typ       public.fahrstunde_typ;
  v_brutto    numeric;
  v_status    public.rechnung_status;
  v_mahn      int;
  v_anz       int;
  v_nr        int := 0;
  v_monat     text := (array['Januar','Februar','März','April','Mai','Juni',
                             'Juli','August','September','Oktober','November','Dezember'])
                      [extract(month from current_date)::int];
  v_px        text := 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
begin
  -- Fahrschule bestimmen -----------------------------------------------
  select id into v_fs from public.fahrschule
   where v_wunsch is null or id = v_wunsch
   order by created_at, id limit 1;
  if v_fs is null then
    raise exception 'Keine Fahrschule gefunden. Bitte zuerst in der App die Einrichtung abschließen.';
  end if;

  -- Alte Demo-Daten entfernen (Kinder zuerst) ---------------------------
  delete from public.rechnung_position where id::text like 'dddddddd-%';
  delete from public.zahlung            where id::text like 'dddddddd-%';
  delete from public.rate               where id::text like 'dddddddd-%';
  delete from public.theorie_teilnahme  where id::text like 'dddddddd-%';
  delete from public.kurs_teilnahme     where id::text like 'dddddddd-%';
  delete from public.dokument           where id::text like 'dddddddd-%';
  delete from public.schueler_fortschritt where id::text like 'dddddddd-%';
  delete from public.fahrstunde         where id::text like 'dddddddd-%';
  delete from public.pruefung           where id::text like 'dddddddd-%';
  delete from public.aufgabe            where id::text like 'dddddddd-%';
  delete from public.nachricht          where id::text like 'dddddddd-%';
  delete from public.pinnwand           where id::text like 'dddddddd-%';
  delete from public.kassenbuch_eintrag where id::text like 'dddddddd-%';
  delete from public.leistung           where id::text like 'dddddddd-%';
  delete from public.rechnung           where id::text like 'dddddddd-%';
  delete from public.theoriestunde      where id::text like 'dddddddd-%';
  delete from public.kurs               where id::text like 'dddddddd-%';
  delete from public.fahrschueler       where id::text like 'dddddddd-%';
  delete from public.fahrzeug           where id::text like 'dddddddd-%';
  delete from public.benutzerrolle      where id::text like 'dddddddd-%';
  delete from public.fahrlehrer         where id::text like 'dddddddd-%';

  -- ------------------------------------------------------------------
  -- Fahrlehrer und Büro (ohne Login – der eigene Account bleibt unberührt)
  -- ------------------------------------------------------------------
  insert into public.fahrlehrer
    (id, fahrschule_id, vorname, nachname, email, telefon, fuehrerscheinklassen, rolle, aktiv, kuerzel, ort, geburtsdatum, stundenlohn, lohn_pro_fahrstunde)
  values
    ('dddddddd-0001-4000-8000-000000000001', v_fs, 'Sabine',  'Klein',  'sabine.klein@demo.de',  '0170 1110001', array['B','BE'],      'fahrlehrer', true, 'SK', 'Berlin', '1984-03-12', null, 22.00),
    ('dddddddd-0001-4000-8000-000000000002', v_fs, 'Tobias',  'Braun',  'tobias.braun@demo.de',  '0170 1110002', array['B','A','A2'], 'fahrlehrer', true, 'TB', 'Berlin', '1990-07-25', null, 24.00),
    ('dddddddd-0001-4000-8000-000000000003', v_fs, 'Nadine',  'Schulz', 'nadine.schulz@demo.de', '0170 1110003', array['B'],          'fahrlehrer', true, 'NS', 'Berlin', '1995-11-02', null, 21.00),
    ('dddddddd-0001-4000-8000-000000000004', v_fs, 'Petra',   'Lang',   'petra.lang@demo.de',    '0170 1110004', array[]::text[],     'buero',      true, 'PL', 'Berlin', '1979-05-18', 19.50, null);

  select array_agg(id order by id) into v_lehrer
    from public.fahrlehrer where fahrschule_id = v_fs and rolle <> 'buero' and id::text like 'dddddddd-%';

  -- Rollen-Profile ----------------------------------------------------
  insert into public.benutzerrolle (id, fahrschule_id, name, beschreibung, zugangsart, web_zugang, rechte)
  values
    ('dddddddd-0009-4000-8000-000000000001', v_fs, 'Büro Standard', 'Verwaltung ohne Finanzen', 'web', true,
     '{"allgemein":{"exportieren":false},"sidebar":{"schueler":{"ansehen":true,"bearbeiten":true},"finanzen":{"ansehen":false}}}'::jsonb),
    ('dddddddd-0009-4000-8000-000000000002', v_fs, 'Fahrlehrer eingeschränkt', 'Nur eigene Termine und Schüler', 'app', false,
     '{"allgemein":{},"sidebar":{"kalender":{"ansehen":true},"schueler":{"ansehen":true}}}'::jsonb);

  -- ------------------------------------------------------------------
  -- Fahrzeuge
  -- ------------------------------------------------------------------
  insert into public.fahrzeug
    (id, fahrschule_id, kennzeichen, marke, modell, klasse, aktiv, name, nummer, getriebeart, klassen, fahrlehrer_ids,
     anhaenger, hauptuntersuchung, hu_faellig, versicherung, km_stand, naechste_wartung)
  values
    ('dddddddd-0002-4000-8000-000000000001', v_fs, 'B-FS 1234', 'VW',       'Golf 8',    'B', true, 'Golf 8 (Schalter)', 1, 'Schaltung', array['B'],      v_lehrer, false, current_date - 210, current_date + 155, 'HUK Coburg',  61340, current_date + 34),
    ('dddddddd-0002-4000-8000-000000000002', v_fs, 'B-FS 5678', 'Škoda',    'Octavia',   'B', true, 'Octavia (Automatik)', 2, 'Automatik', array['B'],    v_lehrer, false, current_date - 300, current_date + 65,  'Allianz',     38900, current_date + 6),
    ('dddddddd-0002-4000-8000-000000000003', v_fs, 'B-FS 9012', 'VW',       'T-Roc',     'B', true, 'T-Roc (Anhänger)',  3, 'Schaltung', array['B','BE'], v_lehrer, true,  current_date - 350, current_date + 14,  'HUK Coburg',  74210, current_date + 60),
    ('dddddddd-0002-4000-8000-000000000004', v_fs, 'B-FS 3456', 'BMW',      'F 900 R',   'A', true, 'F 900 R (Motorrad)', 4, 'Schaltung', array['A','A2'], v_lehrer, false, current_date - 120, current_date + 245, 'LVM',          9800, current_date + 90),
    ('dddddddd-0002-4000-8000-000000000005', v_fs, 'B-FS 7788', 'Mercedes', 'Sprinter',  'C', false,'Sprinter (außer Dienst)', 5, 'Schaltung', array['C1'], array[]::uuid[], false, current_date - 400, current_date - 35, 'Allianz', 182400, current_date - 20);

  select array_agg(id order by id) into v_fz
    from public.fahrzeug where fahrschule_id = v_fs and aktiv and id::text like 'dddddddd-%';

  -- ------------------------------------------------------------------
  -- Fahrschüler
  -- ------------------------------------------------------------------
  insert into public.fahrschueler
    (id, fahrschule_id, vorname, nachname, geburtsdatum, strasse, plz, ort, telefon, email, fuehrerscheinklassen,
     anmeldedatum, theorie_bestanden, theorie_termin, pruefung_termin, avatar_farbe, kundennummer, prueforganisation,
     preisliste, intensivkurs, lernstatus, anrede, zahlungsart, sehtest_am, passbild_ok, erste_hilfe_am, ausweis_ok,
     vertrag_am, bf17, kostentraeger, notizen)
  values
    ('dddddddd-0003-4000-8000-000000000001', v_fs, 'Lena',   'Hoffmann', '2007-04-12', 'Lindenstraße 8',   '10115', 'Berlin', '0176 5550001', 'lena.hoffmann@demo.de',  array['B'],  current_date - 90,  true,  null,              null,              '#2B59E6', 1042, 'TÜV Nord', 'Standard', false, 90,  'Frau', 'Überweisung', current_date - 80, true,  current_date - 78, true,  current_date - 88, false, null, null),
    ('dddddddd-0003-4000-8000-000000000002', v_fs, 'Mia',    'Schäfer',  '2006-09-30', 'Kastanienallee 21','10119', 'Berlin', '0176 5550002', 'mia.schaefer@demo.de',   array['B'],  current_date - 140, true,  null,              current_date + 2,  '#7C3AED', 1043, 'TÜV Nord', 'Standard', false, 96,  'Frau', 'Lastschrift', current_date - 130,true,  current_date - 125,true,  current_date - 138, false, null, 'Prüfung steht an – Unterlagen vollständig.'),
    ('dddddddd-0003-4000-8000-000000000003', v_fs, 'Jonas',  'Weber',    '2005-01-22', 'Gartenweg 4',      '10247', 'Berlin', '0176 5550003', 'jonas.weber@demo.de',    array['B'],  current_date - 70,  true,  null,              null,              '#D97706', 1044, 'TÜV Süd',  'Standard', false, 72,  'Herr', 'Überweisung', null,              true,  current_date - 60, true,  current_date - 68,  false, null, 'Sehtest fehlt noch.'),
    ('dddddddd-0003-4000-8000-000000000004', v_fs, 'Ben',    'Krüger',   '2004-06-08', 'Ringstraße 77',    '10405', 'Berlin', '0176 5550004', 'ben.krueger@demo.de',    array['A'],  current_date - 25,  false, current_date + 9,  null,              '#0F766E', 1045, 'DEKRA',    'Motorrad', false, 25,  'Herr', 'Lastschrift', null,              false, null,              false, null,               false, null, 'Unterlagen unvollständig.'),
    ('dddddddd-0003-4000-8000-000000000005', v_fs, 'Sophie', 'Bauer',    '2007-12-03', 'Am Park 12',       '10555', 'Berlin', '0176 5550005', 'sophie.bauer@demo.de',   array['B'],  current_date - 75,  false, current_date + 3,  null,              '#0369A1', 1046, 'TÜV Süd',  'Standard', false, 58,  'Frau', 'Überweisung', current_date - 60, true,  current_date - 55, true,  current_date - 72,  false, 'Agentur für Arbeit Berlin Mitte', 'Kostenträger bewilligt.'),
    ('dddddddd-0003-4000-8000-000000000006', v_fs, 'Marie',  'Wagner',   '2003-02-17', 'Seestraße 3',      '13353', 'Berlin', '0176 5550006', 'marie.wagner@demo.de',   array['BE'], current_date - 160, true,  null,              current_date + 16, '#B91C1C', 1047, 'DEKRA',    'Anhänger', false, 100, 'Frau', 'Überweisung', current_date - 150,true,  current_date - 148,true,  current_date - 158, false, null, 'Praxis beim zweiten Versuch.'),
    ('dddddddd-0003-4000-8000-000000000007', v_fs, 'Elias',  'Fischer',  '2008-08-19', 'Blumenweg 9',      '12045', 'Berlin', '0176 5550007', 'elias.fischer@demo.de',  array['B'],  current_date - 30,  false, current_date + 9,  null,              '#4F46E5', 1048, 'TÜV Nord', 'Standard', false, 18,  'Herr', 'Überweisung', null,              false, null,              true,  current_date - 28,  true,  null, 'BF17 – Begleitperson gemeldet.'),
    ('dddddddd-0003-4000-8000-000000000008', v_fs, 'Paul',   'Schmidt',  '2006-05-05', 'Hauptstraße 100',  '10827', 'Berlin', '0176 5550008', 'paul.schmidt@demo.de',   array['B'],  current_date - 8,   false, current_date + 17, null,              '#16A34A', 1049, 'TÜV Nord', 'Intensiv', true,  8,   'Herr', 'Lastschrift', null,              false, null,              false, null,               false, null, 'Intensivkurs gebucht.'),
    ('dddddddd-0003-4000-8000-000000000009', v_fs, 'Hannah', 'Roth',     '2005-10-14', 'Feldstraße 18',    '10999', 'Berlin', '0176 5550009', 'hannah.roth@demo.de',    array['B'],  current_date - 110, true,  null,              null,              '#DB2777', 1050, 'TÜV Süd',  'Standard', false, 84,  'Frau', 'Überweisung', current_date - 100,true,  current_date - 95, true,  current_date - 108, false, null, null),
    ('dddddddd-0003-4000-8000-000000000010', v_fs, 'Noah',   'Keller',   '2004-03-28', 'Wiesenweg 6',      '12101', 'Berlin', '0176 5550010', 'noah.keller@demo.de',    array['B'],  current_date - 55,  true,  null,              null,              '#059669', 1051, 'DEKRA',    'Standard', false, 64,  'Herr', 'Überweisung', current_date - 45, true,  current_date - 40, true,  current_date - 53,  false, null, null),
    ('dddddddd-0003-4000-8000-000000000011', v_fs, 'Emily',  'Neumann',  '2007-07-07', 'Bergstraße 44',    '13187', 'Berlin', '0176 5550011', 'emily.neumann@demo.de',  array['B'],  current_date - 200, true,  null,              null,              '#9333EA', 1052, 'TÜV Nord', 'Standard', false, 100, 'Frau', 'Überweisung', current_date - 190,true,  current_date - 185,true,  current_date - 198, false, null, 'Ausbildung abgeschlossen.'),
    ('dddddddd-0003-4000-8000-000000000012', v_fs, 'Luca',   'Hartmann', '2006-11-11', 'Talstraße 2',      '10967', 'Berlin', '0176 5550012', 'luca.hartmann@demo.de',  array['B'],  current_date - 45,  false, current_date + 24, null,              '#EA580C', 1053, 'TÜV Süd',  'Standard', false, 42,  'Herr', 'Lastschrift', current_date - 35, true,  null,              true,  current_date - 43,  false, null, 'Erste-Hilfe-Kurs noch offen.');

  update public.fahrschueler
     set ausbildung_beendet = true
   where id = 'dddddddd-0003-4000-8000-000000000011';

  update public.fahrschueler
     set iban = 'DE12 5001 0517 0648 4898 90',
         sepa_mandat_ref = 'MND-' || to_char(current_date, 'YYYY') || '-045',
         sepa_mandat_am = current_date - 20
   where id in ('dddddddd-0003-4000-8000-000000000004',
                'dddddddd-0003-4000-8000-000000000008',
                'dddddddd-0003-4000-8000-000000000012');

  select array_agg(id order by id) into v_sch
    from public.fahrschueler where fahrschule_id = v_fs and id::text like 'dddddddd-%';

  -- ------------------------------------------------------------------
  -- Ausbildungsfortschritt je Schüler
  -- ------------------------------------------------------------------
  insert into public.schueler_fortschritt
    (id, schueler_id, klasse, fahrstunden_gesamt, fahrstunden_bezahlt, normalfahrten, autobahnfahrten, nachtfahrten, ueberlandfahrten, pruefungsreif)
  select ('dddddddd-000a-4000-8000-' || lpad(s.nr::text, 12, '0'))::uuid,
         v_sch[s.nr],
         (select coalesce(fuehrerscheinklassen[1], 'B') from public.fahrschueler where id = v_sch[s.nr]),
         g.gesamt, greatest(g.gesamt - 3, 0), g.normal, g.autobahn, g.nacht, g.ueberland,
         (g.ueberland >= 5 and g.autobahn >= 4 and g.nacht >= 3)
    from generate_series(1, array_length(v_sch, 1)) as s(nr)
    cross join lateral (
      select (array[27,36,20,9,15,34,6,2,30,18,38,14])[s.nr] as gesamt,
             (array[18,24,14,8,11,22,6,2,20,12,25,10])[s.nr] as normal,
             (array[3,4,1,0,1,4,0,0,3,2,4,1])[s.nr]          as autobahn,
             (array[2,3,2,0,1,3,0,0,2,1,3,1])[s.nr]          as nacht,
             (array[4,5,3,1,2,5,0,0,5,3,6,2])[s.nr]          as ueberland
    ) g;

  -- ------------------------------------------------------------------
  -- Leistungskatalog (Preisliste)
  -- ------------------------------------------------------------------
  insert into public.leistung (id, fahrschule_id, name, kategorie, preis, einheit, klasse, aktiv, sortierung)
  values
    ('dddddddd-000b-4000-8000-000000000001', v_fs, 'Grundgebühr Klasse B',             'Grundgebühr', 450.00, 'pauschal', 'B',  true, 1),
    ('dddddddd-000b-4000-8000-000000000002', v_fs, 'Übungsstunde 45 Min',              'Fahrstunde',   60.00, 'Stunde',   'B',  true, 2),
    ('dddddddd-000b-4000-8000-000000000003', v_fs, 'Sonderfahrt Überland 45 Min',      'Sonderfahrt',  68.00, 'Stunde',   'B',  true, 3),
    ('dddddddd-000b-4000-8000-000000000004', v_fs, 'Sonderfahrt Autobahn 45 Min',      'Sonderfahrt',  68.00, 'Stunde',   'B',  true, 4),
    ('dddddddd-000b-4000-8000-000000000005', v_fs, 'Sonderfahrt Nacht 45 Min',         'Sonderfahrt',  68.00, 'Stunde',   'B',  true, 5),
    ('dddddddd-000b-4000-8000-000000000006', v_fs, 'Vorstellung praktische Prüfung',   'Prüfung',     230.00, 'pauschal', 'B',  true, 6),
    ('dddddddd-000b-4000-8000-000000000007', v_fs, 'Vorstellung theoretische Prüfung', 'Prüfung',      90.00, 'pauschal', 'B',  true, 7),
    ('dddddddd-000b-4000-8000-000000000008', v_fs, 'Lehrmaterial-Paket',               'Material',     89.00, 'pauschal', null, true, 8),
    ('dddddddd-000b-4000-8000-000000000009', v_fs, 'Grundgebühr Klasse A',             'Grundgebühr', 520.00, 'pauschal', 'A',  true, 9);

  -- ------------------------------------------------------------------
  -- Kurse und Theorieunterricht
  -- ------------------------------------------------------------------
  v_kurs := 'dddddddd-0006-4000-8000-000000000001';
  insert into public.kurs (id, fahrschule_id, name, klasse, beschreibung, start_datum, status)
  values
    (v_kurs,                                  v_fs, 'Theoriekurs ' || v_monat,                          'B', 'Grundstoff, 12 Lektionen – montags und mittwochs 18:00 Uhr', current_date - 28, 'laufend'),
    ('dddddddd-0006-4000-8000-000000000002',  v_fs, 'Intensivkurs Ferien',                             'B', 'Grundstoff kompakt in sechs Tagen',                          current_date + 21, 'geplant'),
    ('dddddddd-0006-4000-8000-000000000003',  v_fs, 'Motorrad-Theorie Klasse A',                       'A', 'Zusatzstoff Klasse A, 4 Lektionen',                          current_date - 90, 'beendet');

  insert into public.kurs_teilnahme (id, fahrschule_id, kurs_id, schueler_id)
  select ('dddddddd-0007-4000-8000-' || lpad(s.nr::text, 12, '0'))::uuid, v_fs, v_kurs, v_sch[s.nr]
    from generate_series(1, 7) as s(nr);

  insert into public.kurs_teilnahme (id, fahrschule_id, kurs_id, schueler_id)
  values ('dddddddd-0007-4000-8000-000000000101', v_fs, 'dddddddd-0006-4000-8000-000000000002', v_sch[8]),
         ('dddddddd-0007-4000-8000-000000000102', v_fs, 'dddddddd-0006-4000-8000-000000000003', v_sch[4]);

  -- Zwölf Theoriestunden: acht gehalten, vier geplant
  for i in 1..12 loop
    v_th := ('dddddddd-0008-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    insert into public.theoriestunde (id, fahrschule_id, datum, uhrzeit, thema, max_teilnehmer, kurs_id)
    values (v_th, v_fs, current_date - 28 + (i - 1) * 3, '18:00'::time,
            'Lektion ' || i || ' – ' || (array[
              'Persönliche Voraussetzungen', 'Risikofaktor Mensch', 'Rechtliche Rahmenbedingungen',
              'Straßenverkehrssystem', 'Vorfahrt und Vorrang', 'Verkehrsregelungen',
              'Geschwindigkeit und Abstand', 'Andere Verkehrsteilnehmer', 'Ruhender Verkehr',
              'Umweltbewusster Umgang', 'Technische Bedingungen', 'Fahren mit Anhänger'])[i],
            20, v_kurs);

    -- Anwesenheit nur für bereits gehaltene Stunden
    if current_date - 28 + (i - 1) * 3 <= current_date then
      insert into public.theorie_teilnahme (id, theoriestunde_id, schueler_id, anwesend)
      select ('dddddddd-000c-4000-8000-' || lpad((i * 100 + s.nr)::text, 12, '0'))::uuid, v_th, v_sch[s.nr], (i + s.nr) % 6 <> 0
        from generate_series(1, 7) as s(nr);
    end if;
  end loop;

  -- ------------------------------------------------------------------
  -- Fahrstunden
  -- ------------------------------------------------------------------
  -- a) Vergangenheit: abgeschlossen (Fortschritt, Auslastung, Lohn)
  for i in 1..190 loop
    v_tag := current_date - (1 + (i % 62));
    if extract(isodow from v_tag) = 7 then
      v_tag := v_tag - 1;
    end if;
    v_typ := (array['normal','normal','normal','ueberland','autobahn','nacht'])[1 + (i % 6)]::public.fahrstunde_typ;
    insert into public.fahrstunde
      (id, fahrschule_id, schueler_id, fahrlehrer_id, fahrzeug_id, datum, uhrzeit, dauer_minuten, typ, status, unterschrift)
    values (
      ('dddddddd-0004-4000-8000-' || lpad(i::text, 12, '0'))::uuid, v_fs,
      v_sch[1 + (i % 12)], v_lehrer[1 + (i % 3)], v_fz[1 + (i % 4)],
      v_tag,
      (array['08:00','09:45','11:30','13:15','15:00','16:45','18:30'])[1 + (i % 7)]::time,
      case when v_typ = 'normal' then 45 else 90 end, v_typ, 'abgeschlossen', 'demo-signatur');
  end loop;

  -- b) Vergangenheit: ausgefallen (No-Show-Quote im Cockpit)
  for i in 1..16 loop
    insert into public.fahrstunde
      (id, fahrschule_id, schueler_id, fahrlehrer_id, fahrzeug_id, datum, uhrzeit, dauer_minuten, typ, status, notiz, abgesagt_am)
    values (
      ('dddddddd-0004-4000-8000-' || lpad((300 + i)::text, 12, '0'))::uuid, v_fs,
      v_sch[1 + (i % 12)], v_lehrer[1 + (i % 3)], v_fz[1 + (i % 4)],
      current_date - (2 + (i * 2) % 28),
      (array['10:00','14:00','16:00'])[1 + (i % 3)]::time,
      45, 'normal', 'ausgefallen',
      case when i % 2 = 0 then 'Nicht erschienen' else 'Kurzfristig abgesagt' end,
      now() - ((2 + (i * 2) % 28) || ' days')::interval);
  end loop;

  -- c) Heute: voller Tagesplan für den Leitstand
  for i in 1..8 loop
    insert into public.fahrstunde
      (id, fahrschule_id, schueler_id, fahrlehrer_id, fahrzeug_id, datum, uhrzeit, dauer_minuten, typ, status,
       bestaetigung_token, bestaetigt_am, erinnerung_gesendet_am)
    values (
      ('dddddddd-0004-4000-8000-' || lpad((400 + i)::text, 12, '0'))::uuid, v_fs,
      v_sch[i], v_lehrer[1 + (i % 3)], v_fz[1 + (i % 4)],
      current_date,
      (array['08:00','09:00','11:00','13:00','14:45','15:30','16:00','19:30'])[i]::time,
      case when i % 3 = 0 then 90 else 45 end,
      (array['normal','ueberland','normal','autobahn','normal','normal','normal','nacht'])[i]::public.fahrstunde_typ,
      'geplant',
      gen_random_uuid(),
      case when i % 3 <> 0 then now() - interval '1 day' else null end,
      now() - interval '1 day');
  end loop;

  -- d) Nächste drei Tage: für die Erinnerungen-Seite (teils offen, teils bestätigt)
  for i in 1..14 loop
    insert into public.fahrstunde
      (id, fahrschule_id, schueler_id, fahrlehrer_id, fahrzeug_id, datum, uhrzeit, dauer_minuten, typ, status,
       bestaetigung_token, bestaetigt_am, erinnerung_gesendet_am)
    values (
      ('dddddddd-0004-4000-8000-' || lpad((500 + i)::text, 12, '0'))::uuid, v_fs,
      v_sch[1 + (i % 12)], v_lehrer[1 + (i % 3)], v_fz[1 + (i % 4)],
      current_date + (1 + (i % 3)),
      (array['08:00','09:30','11:00','13:00','15:00','16:30','18:00'])[1 + (i % 7)]::time,
      case when i % 4 = 0 then 90 else 45 end,
      (array['normal','normal','ueberland','normal','autobahn','normal','nacht'])[1 + (i % 7)]::public.fahrstunde_typ,
      'geplant',
      gen_random_uuid(),
      case when i % 3 = 1 then now() - interval '6 hours' else null end,
      case when i % 4 <> 0 then now() - interval '8 hours' else null end);
  end loop;

  -- e) Kommende zwei Wochen: gefüllter Kalender
  for i in 1..40 loop
    v_tag := current_date + (4 + (i % 14));
    if extract(isodow from v_tag) = 7 then
      v_tag := v_tag + 1;
    end if;
    insert into public.fahrstunde
      (id, fahrschule_id, schueler_id, fahrlehrer_id, fahrzeug_id, datum, uhrzeit, dauer_minuten, typ, status, bestaetigung_token)
    values (
      ('dddddddd-0004-4000-8000-' || lpad((600 + i)::text, 12, '0'))::uuid, v_fs,
      v_sch[1 + (i % 12)], v_lehrer[1 + (i % 3)], v_fz[1 + (i % 4)],
      v_tag,
      (array['08:00','09:45','11:30','13:15','15:00','16:45'])[1 + (i % 6)]::time,
      case when i % 5 = 0 then 90 else 45 end,
      (array['normal','normal','ueberland','autobahn','normal','nacht'])[1 + (i % 6)]::public.fahrstunde_typ,
      'geplant', gen_random_uuid());
  end loop;

  -- ------------------------------------------------------------------
  -- Prüfungen
  -- ------------------------------------------------------------------
  insert into public.pruefung (id, fahrschule_id, schueler_id, art, klasse, datum, uhrzeit, pruefstelle, ergebnis, versuch, gebuehr)
  values
    ('dddddddd-0005-4000-8000-000000000001', v_fs, v_sch[2],  'praxis',  'B', current_date + 2,  '08:30'::time, 'TÜV Nord', 'offen',          1, 130.00),
    ('dddddddd-0005-4000-8000-000000000002', v_fs, v_sch[5],  'theorie', 'B', current_date + 3,  '10:00'::time, 'TÜV Süd',  'offen',          1,  25.00),
    ('dddddddd-0005-4000-8000-000000000003', v_fs, v_sch[4],  'theorie', 'A', current_date + 9,  '13:15'::time, 'DEKRA',    'offen',          1,  25.00),
    ('dddddddd-0005-4000-8000-000000000004', v_fs, v_sch[7],  'theorie', 'B', current_date + 9,  '09:00'::time, 'TÜV Nord', 'offen',          1,  25.00),
    ('dddddddd-0005-4000-8000-000000000005', v_fs, v_sch[6],  'praxis',  'BE',current_date + 16, '11:00'::time, 'DEKRA',    'offen',          2, 130.00),
    ('dddddddd-0005-4000-8000-000000000006', v_fs, v_sch[1],  'theorie', 'B', current_date - 34, '09:30'::time, 'TÜV Nord', 'bestanden',      1,  25.00),
    ('dddddddd-0005-4000-8000-000000000007', v_fs, v_sch[3],  'theorie', 'B', current_date - 20, '09:30'::time, 'TÜV Süd',  'bestanden',      1,  25.00),
    ('dddddddd-0005-4000-8000-000000000008', v_fs, v_sch[6],  'praxis',  'BE',current_date - 12, '14:00'::time, 'DEKRA',    'nicht_bestanden',1, 130.00),
    ('dddddddd-0005-4000-8000-000000000009', v_fs, v_sch[9],  'theorie', 'B', current_date - 48, '08:00'::time, 'TÜV Nord', 'bestanden',      2,  25.00),
    ('dddddddd-0005-4000-8000-000000000010', v_fs, v_sch[11], 'praxis',  'B', current_date - 25, '10:30'::time, 'TÜV Nord', 'bestanden',      1, 130.00),
    ('dddddddd-0005-4000-8000-000000000011', v_fs, v_sch[11], 'theorie', 'B', current_date - 60, '12:00'::time, 'TÜV Süd',  'bestanden',      1,  25.00),
    ('dddddddd-0005-4000-8000-000000000012', v_fs, v_sch[10], 'theorie', 'B', current_date - 15, '11:30'::time, 'DEKRA',    'bestanden',      1,  25.00);

  -- ------------------------------------------------------------------
  -- Rechnungen, Positionen und Zahlungen (sechs Monate)
  -- ------------------------------------------------------------------
  for k in reverse 5..0 loop
    for i in 1..6 loop
      v_nr := v_nr + 1;
      v_re := ('dddddddd-000d-4000-8000-' || lpad(v_nr::text, 12, '0'))::uuid;
      v_brutto := (array[180, 320, 250, 480, 140, 610, 295, 380, 220, 450])[1 + ((k * 6 + i) % 10)];

      if k = 0 and i <= 3 then
        v_status := 'offen';  v_mahn := 0;
      elsif k = 1 and i = 2 then
        v_status := 'ueberfaellig'; v_mahn := 1;
      elsif k = 2 and i = 4 then
        v_status := 'ueberfaellig'; v_mahn := 2;
      elsif k = 3 and i = 1 then
        v_status := 'ueberfaellig'; v_mahn := 1;
      else
        v_status := 'bezahlt'; v_mahn := 0;
      end if;

      insert into public.rechnung
        (id, fahrschule_id, schueler_id, nummer, betrag_netto, steuersatz, betrag_brutto, status,
         rechnungsdatum, faelligkeitsdatum, mahnstufe, letzte_mahnung, bezahlt_am)
      values (
        v_re, v_fs, v_sch[1 + ((k * 6 + i) % 12)],
        'RE-' || to_char(current_date - (k * 30), 'YYYY') || '-' || lpad(v_nr::text, 4, '0'),
        round(v_brutto / 1.19, 2), 19, v_brutto, v_status,
        (date_trunc('month', current_date) - (k || ' months')::interval)::date + (i * 4 - 1),
        (date_trunc('month', current_date) - (k || ' months')::interval)::date + (i * 4 + 13),
        v_mahn,
        case when v_mahn > 0 then (date_trunc('month', current_date) - (k || ' months')::interval)::date + (i * 4 + 24) else null end,
        case when v_status = 'bezahlt' then (date_trunc('month', current_date) - (k || ' months')::interval)::date + (i * 4 + 10) else null end);

      insert into public.rechnung_position (id, rechnung_id, beschreibung, menge, einheit, einzelpreis)
      values (('dddddddd-000e-4000-8000-' || lpad((v_nr * 10 + 1)::text, 12, '0'))::uuid, v_re,
              'Übungsstunde 45 Min', greatest(1, round(v_brutto / 60)), 'Stunde', 60.00);

      if i % 2 = 0 then
        insert into public.rechnung_position (id, rechnung_id, beschreibung, menge, einheit, einzelpreis)
        values (('dddddddd-000e-4000-8000-' || lpad((v_nr * 10 + 2)::text, 12, '0'))::uuid, v_re,
                'Sonderfahrt Überland 45 Min', 1, 'Fahrt', 68.00);
      end if;

      if v_status = 'bezahlt' then
        insert into public.zahlung (id, fahrschule_id, schueler_id, rechnung_id, betrag, datum, art)
        values (('dddddddd-000f-4000-8000-' || lpad(v_nr::text, 12, '0'))::uuid, v_fs,
                v_sch[1 + ((k * 6 + i) % 12)], v_re, v_brutto,
                (date_trunc('month', current_date) - (k || ' months')::interval)::date + (i * 4 + 10),
                (array['ueberweisung','lastschrift','bar','karte'])[1 + (i % 4)]);
      end if;
    end loop;
  end loop;

  -- Ratenplan für zwei Schüler
  insert into public.rate (id, fahrschule_id, schueler_id, betrag, faellig_am, bezahlt, notiz)
  values
    ('dddddddd-0010-4000-8000-000000000001', v_fs, v_sch[1], 600.00, current_date - 60, true,  'Grundgebühr 1/3'),
    ('dddddddd-0010-4000-8000-000000000002', v_fs, v_sch[1], 600.00, current_date - 30, true,  'Grundgebühr 2/3'),
    ('dddddddd-0010-4000-8000-000000000003', v_fs, v_sch[1], 600.00, current_date,      false, 'Grundgebühr 3/3'),
    ('dddddddd-0010-4000-8000-000000000004', v_fs, v_sch[8], 450.00, current_date + 10, false, 'Intensivkurs 1/4'),
    ('dddddddd-0010-4000-8000-000000000005', v_fs, v_sch[8], 450.00, current_date + 40, false, 'Intensivkurs 2/4');

  -- ------------------------------------------------------------------
  -- Aufgaben
  -- ------------------------------------------------------------------
  insert into public.aufgabe (id, fahrschule_id, titel, status, prioritaet, faellig_am, schueler_id)
  values
    ('dddddddd-0011-4000-8000-000000000001', v_fs, 'TÜV-Anmeldung Mia Schäfer',            'offen',    'hoch',    current_date,      v_sch[2]),
    ('dddddddd-0011-4000-8000-000000000002', v_fs, 'Rückruf Frau Bauer (Kostenträger)',    'offen',    'hoch',    current_date,      v_sch[5]),
    ('dddddddd-0011-4000-8000-000000000003', v_fs, 'Rechnung Jonas Weber prüfen',          'offen',    'mittel',  current_date + 1,  v_sch[3]),
    ('dddddddd-0011-4000-8000-000000000004', v_fs, 'Fahrzeug B-FS 5678 zur Hauptuntersuchung', 'offen','mittel',  current_date + 6,  null),
    ('dddddddd-0011-4000-8000-000000000005', v_fs, 'Sehtest von Jonas Weber nachfordern',  'offen',    'niedrig', current_date + 4,  v_sch[3]),
    ('dddddddd-0011-4000-8000-000000000006', v_fs, 'Unterlagen Ben Krüger vervollständigen','offen',   'hoch',    current_date - 2,  v_sch[4]),
    ('dddddddd-0011-4000-8000-000000000007', v_fs, 'Preisliste für das neue Jahr prüfen',  'erledigt', 'niedrig', current_date - 9,  null),
    ('dddddddd-0011-4000-8000-000000000008', v_fs, 'Theorie-Nachweis Elias erfassen',      'offen',    'mittel',  null,              v_sch[7]);

  -- ------------------------------------------------------------------
  -- Kassenbuch
  -- ------------------------------------------------------------------
  insert into public.kassenbuch_eintrag (id, fahrschule_id, datum, typ, betrag, kategorie, beschreibung, beleg)
  values
    ('dddddddd-0012-4000-8000-000000000001', v_fs, current_date - 1,  'einnahme', 140.00, 'Fahrstunden', 'Barzahlung Sophie Bauer',        'B-0231'),
    ('dddddddd-0012-4000-8000-000000000002', v_fs, current_date - 2,  'ausgabe',   86.40, 'Kraftstoff',  'Tanken B-FS 1234',               'T-1187'),
    ('dddddddd-0012-4000-8000-000000000003', v_fs, current_date - 4,  'ausgabe',   39.90, 'Büro',        'Druckerpapier und Toner',        'B-0230'),
    ('dddddddd-0012-4000-8000-000000000004', v_fs, current_date - 6,  'einnahme', 610.00, 'Fahrstunden', 'Barzahlung Mia Schäfer',         'B-0229'),
    ('dddddddd-0012-4000-8000-000000000005', v_fs, current_date - 9,  'ausgabe',  120.00, 'Wartung',     'Reifenwechsel B-FS 5678',        'W-0442'),
    ('dddddddd-0012-4000-8000-000000000006', v_fs, current_date - 12, 'einnahme',  25.00, 'Gebühren',    'Vorschuss Theorieprüfung',       'B-0228'),
    ('dddddddd-0012-4000-8000-000000000007', v_fs, current_date - 15, 'ausgabe',  248.00, 'Versicherung','Monatsbeitrag Flotte',           'V-0091'),
    ('dddddddd-0012-4000-8000-000000000008', v_fs, current_date - 18, 'einnahme', 480.00, 'Fahrstunden', 'Barzahlung Marie Wagner',        'B-0227'),
    ('dddddddd-0012-4000-8000-000000000009', v_fs, current_date - 22, 'ausgabe',   95.50, 'Kraftstoff',  'Tanken B-FS 9012',               'T-1180'),
    ('dddddddd-0012-4000-8000-000000000010', v_fs, current_date - 27, 'ausgabe',   64.00, 'Material',    'Lehrmaterial nachbestellt',      'M-0033');

  -- ------------------------------------------------------------------
  -- Kommunikation
  -- ------------------------------------------------------------------
  insert into public.nachricht (id, fahrschule_id, kanal, betreff, text, empfaenger, anzahl, status, created_at)
  values
    ('dddddddd-0013-4000-8000-000000000001', v_fs, 'email', 'Erinnerung: Theorieprüfung',
     'Hallo Sophie, denk bitte an deine Theorieprüfung beim TÜV Süd. Bring deinen Ausweis und die Bestätigung mit.',
     'sophie.bauer@demo.de', 1, 'gesendet', now() - interval '2 days'),
    ('dddddddd-0013-4000-8000-000000000002', v_fs, 'sms', null,
     'Hi Lena, morgen um 09:00 Uhr Übungsstunde mit Sabine. Bitte kurz bestätigen.',
     '0176 5550001', 1, 'gesendet', now() - interval '1 day'),
    ('dddddddd-0013-4000-8000-000000000003', v_fs, 'email', 'Neue Öffnungszeiten ab nächstem Monat',
     'Liebe Fahrschülerinnen und Fahrschüler, ab nächstem Monat ist unser Büro montags bis freitags von 9 bis 17 Uhr erreichbar.',
     'Alle aktiven Schüler', 12, 'gesendet', now() - interval '6 days'),
    ('dddddddd-0013-4000-8000-000000000004', v_fs, 'notiz', 'Telefonat Kostenträger',
     'Frau Bauer: Zusage der Agentur liegt vor, der Bescheid kommt per Post.',
     null, 0, 'entwurf', now() - interval '3 days');

  -- ------------------------------------------------------------------
  -- Pinnwand (News und To-dos der Mobile-App)
  -- ------------------------------------------------------------------
  insert into public.pinnwand (id, fahrschule_id, typ, titel, inhalt, erledigt, created_at)
  values
    ('dddddddd-0015-4000-8000-000000000001', v_fs, 'news', 'Neue Öffnungszeiten',
     'Ab nächstem Monat ist das Büro montags bis freitags von 9 bis 17 Uhr besetzt.', false, now() - interval '6 days'),
    ('dddddddd-0015-4000-8000-000000000002', v_fs, 'news', 'Zweites Automatik-Fahrzeug',
     'Der Škoda Octavia steht ab sofort für Automatik-Ausbildungen bereit.', false, now() - interval '2 days'),
    ('dddddddd-0015-4000-8000-000000000003', v_fs, 'todo', 'Tankkarten abrechnen', 'Belege bis Monatsende einreichen.', false, now() - interval '3 days'),
    ('dddddddd-0015-4000-8000-000000000004', v_fs, 'todo', 'Reifenwechsel einplanen', 'Termin für beide Golf buchen.', false, now() - interval '1 day'),
    ('dddddddd-0015-4000-8000-000000000005', v_fs, 'todo', 'Theorieraum aufräumen', null, true, now() - interval '9 days');

  -- ------------------------------------------------------------------
  -- Dokumente (kleine Platzhalter-Dateien)
  -- ------------------------------------------------------------------
  insert into public.dokument (id, fahrschule_id, schueler_id, name, kategorie, mime, groesse, datei)
  values
    ('dddddddd-0014-4000-8000-000000000001', v_fs, v_sch[1], 'Sehtest.png',                'Sehtest',     'image/png', 95, v_px),
    ('dddddddd-0014-4000-8000-000000000002', v_fs, v_sch[1], 'Erste-Hilfe-Bescheinigung.png','Erste Hilfe','image/png', 95, v_px),
    ('dddddddd-0014-4000-8000-000000000003', v_fs, v_sch[1], 'Passbild.png',               'Passbild',    'image/png', 95, v_px),
    ('dddddddd-0014-4000-8000-000000000004', v_fs, v_sch[2], 'Sehtest.png',                'Sehtest',     'image/png', 95, v_px);

  -- ------------------------------------------------------------------
  -- Zusammenfassung
  -- ------------------------------------------------------------------
  select count(*) into v_anz from public.fahrstunde where id::text like 'dddddddd-%';
  raise notice 'Demo-Daten angelegt für Fahrschule %: % Fahrstunden, % Schüler, % Rechnungen.',
    v_fs, v_anz,
    (select count(*) from public.fahrschueler where id::text like 'dddddddd-%'),
    (select count(*) from public.rechnung where id::text like 'dddddddd-%');
end $$;
