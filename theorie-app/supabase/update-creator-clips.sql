-- 23) Live-Creator laden auch Clips hoch -----------------------------------------
-- Wer als Live-Creator angenommen ist, darf auch Videos in Clips hochladen. Wird
-- der Zugang entzogen, endet das Hochladen sofort; hochgeladene Clips bleiben.
--
-- So geht's: Supabase → SQL Editor → „New query“ → diese ganze Datei einfügen
-- → „Run“. Vorher muss Abschnitt 22 (update-creator.sql) gelaufen sein.
-- Mehrfaches Ausführen ist unschädlich. Steht auch in schema.sql (Abschnitt 23).

-- Ohne Abschnitt 22 geht es nicht – dann gleich mit einer klaren Meldung abbrechen.
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'lern_live' and column_name = 'gastgeber_id')
     or to_regclass('public.lern_creator_bewerbung') is null then
    raise exception 'Zuerst update-creator.sql (Abschnitt 22) ausführen – oder gleich update-22-bis-25.sql.';
  end if;
end $$;

-- Hochladen dürfen: Inhaber, freigeschaltete Ersteller, alle Fahrlehrer und
-- angenommene Live-Creator.
create or replace function public.lern_darf_hochladen()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.lern_ist_inhaber()
          or exists (select 1 from public.lern_clip_ersteller e where e.user_id = auth.uid())
          or exists (select 1 from public.lern_profil p where p.id = auth.uid() and p.rolle = 'fahrlehrer')
          or exists (select 1 from public.lern_creator_bewerbung b where b.user_id = auth.uid() and b.status = 'angenommen'));
$$;

-- Mitteilung beim Annehmen nennt jetzt auch die Clips.
create or replace function public.lern_creator_entscheiden(p_id uuid, p_annehmen boolean, p_notiz text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_b public.lern_creator_bewerbung;
begin
  if not public.lern_ist_inhaber() then raise exception 'Nur für den Inhaber der App'; end if;
  select * into v_b from public.lern_creator_bewerbung where id = p_id for update;
  if not found then raise exception 'Bewerbung nicht gefunden'; end if;
  if p_annehmen then
    if v_b.status = 'angenommen' then return; end if;
    if v_b.status = 'zurueckgezogen' then raise exception 'Die Bewerbung wurde zurückgezogen.'; end if;
    -- Schon über eine andere Bewerbung freigeschaltet? Dann ist nichts zu tun.
    if exists (select 1 from public.lern_creator_bewerbung
                where user_id = v_b.user_id and status = 'angenommen' and id <> p_id) then
      return;
    end if;
    update public.lern_creator_bewerbung set status = 'zurueckgezogen', entschieden_am = now()
     where user_id = v_b.user_id and status = 'offen' and id <> p_id;
    update public.lern_creator_bewerbung
       set status = 'angenommen', notiz = left(btrim(coalesce(p_notiz, '')), 500), entschieden_am = now()
     where id = p_id;
    perform lern_intern.push_senden(array[v_b.user_id], 'Du bist jetzt Creator',
                                    'Deine Bewerbung wurde angenommen. Du kannst jetzt live gehen und Clips hochladen.',
                                    '/creator-bewerbung');
  else
    if v_b.status <> 'offen' then raise exception 'Über diese Bewerbung ist schon entschieden.'; end if;
    update public.lern_creator_bewerbung
       set status = 'abgelehnt', notiz = left(btrim(coalesce(p_notiz, '')), 500), entschieden_am = now()
     where id = p_id;
    perform lern_intern.push_senden(array[v_b.user_id], 'Deine Creator-Bewerbung',
                                    'Leider hat es diesmal nicht geklappt.', '/creator-bewerbung');
  end if;
end;
$$;

revoke execute on function public.lern_creator_entscheiden(uuid, boolean, text) from public, anon;
grant execute on function public.lern_creator_entscheiden(uuid, boolean, text) to authenticated;
grant execute on function public.lern_darf_hochladen() to authenticated;

notify pgrst, 'reload schema';
