-- =====================================================================
-- 27) Konto selbst löschen und Nutzer blockieren
-- =====================================================================
-- Apple und Google verlangen, dass man sein Konto in der App löschen kann
-- (DSGVO Art. 17 ebenso), und bei Inhalten von Nutzern (Clips, Kommentare,
-- Live-Chat) eine Möglichkeit, andere zu blockieren.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql
-- (Abschnitt 27).

-- a) Konto löschen ------------------------------------------------------------
-- Löscht den eigenen Eintrag in auth.users. Alles, was daran hängt (Profil,
-- Lernstand, Clips, Kommentare, Likes, Crew, Chat, Push, Verwaltung …), wird
-- über „on delete cascade“ mitgelöscht. Die Dateien im Speicher (Profilbild,
-- eigene Clips) löscht die App vorher selbst. Das Inhaber-Konto lässt sich so
-- nicht löschen, damit die App nicht aus Versehen ohne Inhaber dasteht.
create or replace function public.lern_konto_loeschen()
returns void
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if public.lern_ist_inhaber() then
    raise exception 'Das Inhaber-Konto lässt sich nicht in der App löschen.';
  end if;
  delete from public.lern_limit l where l.user_id = v_ich;
  delete from auth.users u where u.id = v_ich;
end;
$$;
revoke execute on function public.lern_konto_loeschen() from public, anon;
grant execute on function public.lern_konto_loeschen() to authenticated;

-- b) Blockieren ---------------------------------------------------------------
-- „von“ sieht von „wen“ keine Clips, Kommentare und Chat-Nachrichten mehr
-- (gefiltert in der App). Beim Blockieren endet das Folgen in beide Richtungen.
create table if not exists public.lern_blockiert (
  von         uuid not null references auth.users(id) on delete cascade,
  wen         uuid not null references auth.users(id) on delete cascade,
  erstellt_am timestamptz not null default now(),
  primary key (von, wen),
  check (von <> wen)
);
alter table public.lern_blockiert enable row level security;
revoke all on public.lern_blockiert from anon, authenticated;
grant select on public.lern_blockiert to authenticated;

drop policy if exists "lern_blockiert_eigene" on public.lern_blockiert;
create policy "lern_blockiert_eigene" on public.lern_blockiert
  for select to authenticated
  using (von = auth.uid());

create or replace function public.lern_blockieren(p_wen uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ich uuid := auth.uid();
begin
  if v_ich is null then raise exception 'Nicht angemeldet'; end if;
  if p_wen is null or p_wen = v_ich then raise exception 'Dich selbst kannst du nicht blockieren.'; end if;
  if not exists (select 1 from public.lern_profil p where p.id = p_wen) then raise exception 'Diese Person gibt es nicht.'; end if;
  if (select count(*) from public.lern_blockiert b where b.von = v_ich) >= 1000 then
    raise exception 'Du hast schon sehr viele Personen blockiert.';
  end if;
  insert into public.lern_blockiert (von, wen) values (v_ich, p_wen) on conflict do nothing;
  delete from public.lern_folgen f
   where (f.folger = v_ich and f.folgt = p_wen) or (f.folger = p_wen and f.folgt = v_ich);
end;
$$;

create or replace function public.lern_entblocken(p_wen uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.lern_blockiert b where b.von = auth.uid() and b.wen = p_wen;
end;
$$;

-- Liste für die Einstellungen: wen ich blockiert habe, mit Name und Bild.
drop function if exists public.lern_blockiert_liste();
create or replace function public.lern_blockiert_liste()
returns table(id uuid, name text, benutzername text, avatar_farbe text, bild_pfad text, erstellt_am timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.benutzername, p.avatar_farbe, p.bild_pfad, b.erstellt_am
    from public.lern_blockiert b
    join public.lern_profil p on p.id = b.wen
   where b.von = auth.uid()
   order by b.erstellt_am desc;
$$;

revoke execute on function public.lern_blockieren(uuid) from public, anon;
revoke execute on function public.lern_entblocken(uuid) from public, anon;
revoke execute on function public.lern_blockiert_liste() from public, anon;
grant execute on function public.lern_blockieren(uuid) to authenticated;
grant execute on function public.lern_entblocken(uuid) to authenticated;
grant execute on function public.lern_blockiert_liste() to authenticated;

notify pgrst, 'reload schema';
