-- Fixes from the whole-branch review (verified with supabase/tests/rls_smoke.sql)

-- 1. INSERT ... RETURNING on retros: the SELECT policy ran is_host(), a STABLE
--    function whose snapshot cannot see the row being inserted. Check the column.
drop policy retros_select on public.retros;
create policy retros_select on public.retros for select to authenticated
  using (host_user_id = (select auth.uid()) or public.is_member(id));

-- 2 + 3. policy subqueries on cards ran under cards' RLS (own cards only), so
--    voting on / referencing someone else's card was rejected.
create or replace function public.card_in_retro(p_card uuid, p_retro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cards c where c.id = p_card and c.retro_id = p_retro)
$$;

drop policy votes_insert on public.votes;
create policy votes_insert on public.votes for insert to authenticated
  with check (
    public.owns_active_participant(participant_id, retro_id, 'voting')
    and public.card_in_retro(card_id, retro_id)
  );

create or replace function public.action_item_in_retro(p_item uuid, p_retro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.action_items a where a.id = p_item and a.retro_id = p_retro)
$$;

drop policy action_item_refs_write on public.action_item_refs;
create policy action_item_refs_write on public.action_item_refs for all to authenticated
  using (public.is_host(retro_id))
  with check (
    public.is_host(retro_id)
    and public.card_in_retro(card_id, retro_id)
    and public.action_item_in_retro(action_item_id, retro_id)
  );

-- 6. host email-domain allowlist enforced in the database (empty table = anyone)
create table public.host_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$')
);
alter table public.host_domains enable row level security; -- no policies: managed from the dashboard/SQL only

create or replace function public.host_email_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.host_domains)
    or exists (
      select 1 from public.host_domains d
      where d.domain = lower(split_part(coalesce((select auth.jwt()) ->> 'email', ''), '@', 2))
    )
$$;

drop policy retros_insert on public.retros;
create policy retros_insert on public.retros for insert to authenticated
  with check (
    host_user_id = (select auth.uid())
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and public.host_email_allowed()
  );

-- 7. after reveal, don't leak other people's card times or creation order
--    (they could be matched against the live "X wrote N" counters).
create or replace function public.get_cards(p_retro uuid)
returns table (id uuid, "column" public.retro_column, text text, created_at timestamptz,
               author_participant_id uuid, is_mine boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_retro(p_retro) then return; end if;
  return query
    select c.id, c."column", c.text,
           case when p.user_id = (select auth.uid()) then c.created_at end,
           case when r.show_authors or p.user_id = (select auth.uid()) then c.author_participant_id end,
           p.user_id = (select auth.uid())
    from public.cards c
    join public.participants p on p.id = c.author_participant_id
    join public.retros r on r.id = c.retro_id
    where c.retro_id = p_retro
      and (public.phase_rank(r.phase) >= public.phase_rank('reveal') or p.user_id = (select auth.uid()))
    order by c."column",
             case when p.user_id = (select auth.uid()) then c.created_at end nulls last,
             md5(c.id::text);
end $$;

-- advisor: trigger function must not be callable through the API
revoke execute on function public.enforce_vote_limit() from public, anon, authenticated;
revoke execute on function public.card_in_retro(uuid, uuid), public.action_item_in_retro(uuid, uuid),
  public.host_email_allowed() from public, anon;
grant execute on function public.card_in_retro(uuid, uuid), public.action_item_in_retro(uuid, uuid),
  public.host_email_allowed() to authenticated;
