-- =====================================================================
-- Weitere Terminarten (keine Fahrstunden): Theorie & Sonstiges
-- =====================================================================
-- Erweitert das bestehende Enum fahrstunde_typ. Hinweis: ALTER TYPE ... ADD
-- VALUE muss außerhalb einer Transaktion laufen – im Supabase SQL-Editor ist
-- das der Fall, die beiden Zeilen also einzeln/zusammen ausführen.

alter type public.fahrstunde_typ add value if not exists 'theorie';
alter type public.fahrstunde_typ add value if not exists 'sonstiges';
