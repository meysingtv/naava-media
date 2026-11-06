-- 21) Erklärvideos zu Fragen -------------------------------------------------
-- Der Inhaber lädt zu einzelnen Fragen ein Erklärvideo hoch (Einstellungen →
-- Erklärvideos). Beim Lernen erscheint dann neben der KI-Hilfe ein Video-Knopf.
-- Die Videos liegen öffentlich lesbar im Speicher (wie Clips), die Liste dürfen
-- alle lesen. Hochladen, ersetzen und löschen darf nur der Inhaber.
-- Wiederholbar; derselbe Inhalt steht in schema.sql (Abschnitt 21).

create table if not exists public.lern_erklaervideo (
  frage_id        text primary key check (frage_id ~ '^[a-z]{1,16}[0-9]{1,5}$'),
  pfad            text not null,
  dauer           real,
  aktualisiert_am timestamptz not null default now()
);

alter table public.lern_erklaervideo enable row level security;
drop policy if exists "lern_erklaervideo_lesen" on public.lern_erklaervideo;
create policy "lern_erklaervideo_lesen" on public.lern_erklaervideo for select to anon, authenticated using (true);
revoke all on public.lern_erklaervideo from anon, authenticated;
grant select on public.lern_erklaervideo to anon, authenticated;

-- Speicher: öffentlich lesbar (schnell per CDN), 50 MB je Video wie bei Clips.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lern-erklaervideos', 'lern-erklaervideos', true, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lern_erklaervideo_hochladen" on storage.objects;
create policy "lern_erklaervideo_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lern-erklaervideos' and public.lern_ist_inhaber());

drop policy if exists "lern_erklaervideo_dateien_lesen" on storage.objects;
create policy "lern_erklaervideo_dateien_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'lern-erklaervideos' and public.lern_ist_inhaber());

drop policy if exists "lern_erklaervideo_dateien_loeschen" on storage.objects;
create policy "lern_erklaervideo_dateien_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lern-erklaervideos' and public.lern_ist_inhaber());

-- Inhaber: Video zu einer Frage eintragen (ersetzt ein altes). Liefert den alten
-- Pfad, damit die App die alte Datei löschen kann.
create or replace function public.lern_erklaervideo_setzen(p_frage text, p_pfad text, p_dauer real default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_alt text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if p_frage is null or p_frage !~ '^[a-z]{1,16}[0-9]{1,5}$' then raise exception 'Ungültige Frage'; end if;
  if p_pfad is null or p_pfad !~ ('^' || p_frage || '/[A-Za-z0-9_-]{4,64}\.(mp4|mov)$') then raise exception 'Ungültiger Pfad'; end if;
  select e.pfad into v_alt from public.lern_erklaervideo e where e.frage_id = p_frage;
  insert into public.lern_erklaervideo (frage_id, pfad, dauer, aktualisiert_am)
  values (p_frage, p_pfad, case when p_dauer > 0 and p_dauer < 3600 then p_dauer end, now())
  on conflict (frage_id) do update
    set pfad = excluded.pfad, dauer = excluded.dauer, aktualisiert_am = now();
  return case when v_alt is distinct from p_pfad then v_alt end;
end;
$$;

-- Inhaber: Video einer Frage entfernen. Liefert den Pfad der Datei zum Löschen.
create or replace function public.lern_erklaervideo_loeschen(p_frage text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_alt text;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  delete from public.lern_erklaervideo e where e.frage_id = p_frage returning e.pfad into v_alt;
  return v_alt;
end;
$$;

revoke execute on function public.lern_erklaervideo_setzen(text, text, real) from public, anon;
revoke execute on function public.lern_erklaervideo_loeschen(text) from public, anon;
grant execute on function public.lern_erklaervideo_setzen(text, text, real) to authenticated;
grant execute on function public.lern_erklaervideo_loeschen(text) to authenticated;

notify pgrst, 'reload schema';
