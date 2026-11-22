-- =====================================================================
-- 31) Videokurse (Coach)
-- =====================================================================
-- Die Themen aus Abschnitt 30 werden zu Videokursen: jeder Kurs bekommt eine
-- Kategorie (Theorie, Praxis, Kurzvideos, Technik), jedes Video ein Kapitel.
-- Außerdem merkt sich der Server, welche Videos ein Nutzer angesehen hat –
-- daraus entstehen „x von y Videos angesehen“ und die Zahl der Lernenden.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher müssen Abschnitt 26 (update-manager.sql) und Abschnitt 30
-- (update-themen.sql) gelaufen sein. Mehrfaches Ausführen ist unschädlich.
-- Steht auch in schema.sql (Abschnitt 31).

-- a) Kategorie je Kurs, Kapitel je Video ------------------------------------------
alter table public.lern_thema add column if not exists kategorie text not null default 'theorie';
do $$
begin
  alter table public.lern_thema add constraint lern_thema_kategorie check (kategorie in ('theorie', 'praxis', 'kurzvideos', 'technik'));
exception when duplicate_object then
  null;
end $$;

alter table public.lern_themavideo add column if not exists kapitel text not null default '';
do $$
begin
  alter table public.lern_themavideo add constraint lern_themavideo_kapitel check (char_length(kapitel) <= 60);
exception when duplicate_object then
  null;
end $$;

create or replace function public.lern_thema_kategorie_setzen(p_id text, p_kategorie text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if p_kategorie not in ('theorie', 'praxis', 'kurzvideos', 'technik') then raise exception 'Ungültige Kategorie'; end if;
  update public.lern_thema set kategorie = p_kategorie where id = p_id;
  if not found then raise exception 'Thema nicht gefunden'; end if;
end;
$$;

create or replace function public.lern_themavideo_kapitel_setzen(p_id uuid, p_kapitel text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber'; end if;
  if char_length(btrim(coalesce(p_kapitel, ''))) > 60 then raise exception 'Der Kapitelname darf höchstens 60 Zeichen lang sein.'; end if;
  update public.lern_themavideo set kapitel = btrim(coalesce(p_kapitel, '')) where id = p_id;
  if not found then raise exception 'Video nicht gefunden'; end if;
end;
$$;

revoke execute on function public.lern_thema_kategorie_setzen(text, text) from public, anon;
revoke execute on function public.lern_themavideo_kapitel_setzen(uuid, text) from public, anon;
grant execute on function public.lern_thema_kategorie_setzen(text, text) to authenticated;
grant execute on function public.lern_themavideo_kapitel_setzen(uuid, text) to authenticated;

-- b) Angesehene Videos ------------------------------------------------------------------
-- Eine Zeile je Nutzer und Video. Lesen darf jeder nur seine eigenen; eintragen
-- geht nur über lern_kurs_video_gesehen. Wird das Konto oder das Video
-- gelöscht, verschwinden die Zeilen mit.
create table if not exists public.lern_kurs_gesehen (
  nutzer     uuid not null references auth.users(id) on delete cascade,
  video_id   uuid not null references public.lern_themavideo(id) on delete cascade,
  thema_id   text not null,
  gesehen_am timestamptz not null default now(),
  primary key (nutzer, video_id)
);
create index if not exists lern_kurs_gesehen_thema on public.lern_kurs_gesehen (thema_id);

alter table public.lern_kurs_gesehen enable row level security;
drop policy if exists "lern_kurs_gesehen_eigene" on public.lern_kurs_gesehen;
create policy "lern_kurs_gesehen_eigene" on public.lern_kurs_gesehen for select to authenticated using (nutzer = auth.uid());
revoke all on public.lern_kurs_gesehen from anon, authenticated;
grant select on public.lern_kurs_gesehen to authenticated;

create or replace function public.lern_kurs_video_gesehen(p_video uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_thema text;
begin
  if auth.uid() is null then return; end if;
  select thema_id into v_thema from public.lern_themavideo where id = p_video;
  if v_thema is null then return; end if;
  insert into public.lern_kurs_gesehen (nutzer, video_id, thema_id)
  values (auth.uid(), p_video, v_thema)
  on conflict (nutzer, video_id) do update set gesehen_am = now();
end;
$$;

-- Zahl der Lernenden je Kurs (wer mindestens ein Video gesehen hat). Nur Zahlen, keine Namen.
create or replace function public.lern_kurse_lernende()
returns table (thema_id text, lernende integer)
language sql stable security definer set search_path = public
as $$
  select g.thema_id, count(distinct g.nutzer)::integer
    from public.lern_kurs_gesehen g
   group by g.thema_id;
$$;

revoke execute on function public.lern_kurs_video_gesehen(uuid) from public, anon;
grant execute on function public.lern_kurs_video_gesehen(uuid) to authenticated;
revoke execute on function public.lern_kurse_lernende() from public;
grant execute on function public.lern_kurse_lernende() to anon, authenticated;

notify pgrst, 'reload schema';
