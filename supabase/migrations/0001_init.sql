-- Claude Retro — schema, RLS, RPCs
-- Private data (others' cards while writing, hidden authors, vote totals before
-- discussion) is only reachable through SECURITY DEFINER RPCs that strip it.

create type public.phase as enum ('lobby','writing','reveal','voting','discussion','action_plan','summary');
create type public.retro_role as enum ('team','product_owner','scrum_master','viewer');
create type public.retro_column as enum ('went_well','to_improve','ideas');

create table public.retros (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  title text not null check (char_length(title) between 1 and 120),
  host_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  phase public.phase not null default 'lobby',
  timer_ends_at timestamptz,
  timer_remaining_ms integer check (timer_remaining_ms >= 0),
  timer_started boolean not null default false,
  phase_durations jsonb not null default '{}'::jsonb,
  show_authors boolean not null default false,
  focused_card_id uuid,
  created_at timestamptz not null default now()
);
create index on public.retros (host_user_id);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  retro_id uuid not null references public.retros(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  role public.retro_role not null,
  created_at timestamptz not null default now(),
  unique (retro_id, user_id)
);
create index on public.participants (user_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  retro_id uuid not null references public.retros(id) on delete cascade,
  author_participant_id uuid not null references public.participants(id) on delete cascade,
  "column" public.retro_column not null,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.cards (retro_id);
create index on public.cards (author_participant_id);

alter table public.retros
  add constraint retros_focused_card_fk foreign key (focused_card_id) references public.cards(id) on delete set null;

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  retro_id uuid not null references public.retros(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.votes (retro_id);
create index on public.votes (participant_id);
create index on public.votes (card_id);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  retro_id uuid not null references public.retros(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  owner_text text not null default '' check (char_length(owner_text) <= 80),
  owner_participant_id uuid references public.participants(id) on delete set null,
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.action_items (retro_id);
create index on public.action_items (owner_participant_id);

create table public.action_item_refs (
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  retro_id uuid not null references public.retros(id) on delete cascade,
  primary key (action_item_id, card_id)
);
create index on public.action_item_refs (card_id);
create index on public.action_item_refs (retro_id);

-- ---------- helpers ----------
create or replace function public.phase_rank(p public.phase) returns integer
language sql immutable set search_path = '' as $$
  select array_position(enum_range(null::public.phase), p)
$$;

create or replace function public.is_host(p_retro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.retros r where r.id = p_retro and r.host_user_id = (select auth.uid()))
$$;

create or replace function public.is_member(p_retro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.participants p where p.retro_id = p_retro and p.user_id = (select auth.uid()))
$$;

create or replace function public.can_see_retro(p_retro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_host(p_retro) or public.is_member(p_retro)
$$;

-- participant row of the caller, only if they may write/vote in the given phase
create or replace function public.owns_active_participant(p_participant uuid, p_retro uuid, p_phase public.phase)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.participants p
    join public.retros r on r.id = p.retro_id
    where p.id = p_participant and p.retro_id = p_retro
      and p.user_id = (select auth.uid()) and p.role <> 'viewer' and r.phase = p_phase
  )
$$;

create or replace function public.owns_participant(p_participant uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.participants p where p.id = p_participant and p.user_id = (select auth.uid()))
$$;

-- ---------- RLS ----------
alter table public.retros enable row level security;
alter table public.participants enable row level security;
alter table public.cards enable row level security;
alter table public.votes enable row level security;
alter table public.action_items enable row level security;
alter table public.action_item_refs enable row level security;

create policy retros_select on public.retros for select to authenticated
  using (public.can_see_retro(id));
create policy retros_insert on public.retros for insert to authenticated
  with check (host_user_id = (select auth.uid()) and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy retros_update on public.retros for update to authenticated
  using (public.is_host(id)) with check (public.is_host(id));
create policy retros_delete on public.retros for delete to authenticated
  using (public.is_host(id));

create policy participants_select on public.participants for select to authenticated
  using (public.can_see_retro(retro_id));

create policy cards_select_own on public.cards for select to authenticated
  using (public.owns_participant(author_participant_id));
create policy cards_insert on public.cards for insert to authenticated
  with check (public.owns_active_participant(author_participant_id, retro_id, 'writing'));
create policy cards_update on public.cards for update to authenticated
  using (public.owns_active_participant(author_participant_id, retro_id, 'writing'))
  with check (public.owns_active_participant(author_participant_id, retro_id, 'writing'));
create policy cards_delete on public.cards for delete to authenticated
  using (public.owns_active_participant(author_participant_id, retro_id, 'writing'));

create policy votes_select_own on public.votes for select to authenticated
  using (public.owns_participant(participant_id));
create policy votes_insert on public.votes for insert to authenticated
  with check (
    public.owns_active_participant(participant_id, retro_id, 'voting')
    and exists (select 1 from public.cards c where c.id = card_id and c.retro_id = votes.retro_id)
  );
create policy votes_delete on public.votes for delete to authenticated
  using (public.owns_active_participant(participant_id, retro_id, 'voting'));

create policy action_items_select on public.action_items for select to authenticated
  using (public.can_see_retro(retro_id));
create policy action_items_write on public.action_items for all to authenticated
  using (public.is_host(retro_id)) with check (public.is_host(retro_id));

create policy action_item_refs_select on public.action_item_refs for select to authenticated
  using (public.can_see_retro(retro_id));
create policy action_item_refs_write on public.action_item_refs for all to authenticated
  using (public.is_host(retro_id))
  with check (
    public.is_host(retro_id)
    and exists (select 1 from public.cards c where c.id = card_id and c.retro_id = action_item_refs.retro_id)
    and exists (select 1 from public.action_items a where a.id = action_item_id and a.retro_id = action_item_refs.retro_id)
  );

-- ---------- vote limit ----------
create or replace function public.enforce_vote_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.participant_id::text, 0));
  if (select count(*) from public.votes v where v.participant_id = new.participant_id) >= 3 then
    raise exception 'vote limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger votes_limit before insert on public.votes
  for each row execute function public.enforce_vote_limit();

-- ---------- RPCs ----------
create or replace function public.server_now() returns timestamptz
language sql stable set search_path = '' as $$ select now() $$;

create or replace function public.get_retro_by_code(p_code text)
returns table (id uuid, title text, phase public.phase)
language sql stable security definer set search_path = '' as $$
  select r.id, r.title, r.phase from public.retros r where r.code = upper(trim(p_code))
$$;

create or replace function public.join_retro(p_code text, p_name text, p_role public.retro_role)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_retro uuid;
  v_name text := trim(p_name);
  v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'invalid name' using errcode = 'check_violation';
  end if;
  select r.id into v_retro from public.retros r where r.code = upper(trim(p_code));
  if v_retro is null then raise exception 'retro not found' using errcode = 'P0002'; end if;
  insert into public.participants (retro_id, user_id, name, role)
  values (v_retro, (select auth.uid()), v_name, p_role)
  on conflict (retro_id, user_id) do update set name = excluded.name, role = excluded.role
  returning participants.id into v_id;
  return v_id;
end $$;

create or replace function public.get_cards(p_retro uuid)
returns table (id uuid, "column" public.retro_column, text text, created_at timestamptz,
               author_participant_id uuid, is_mine boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_retro(p_retro) then return; end if;
  return query
    select c.id, c."column", c.text, c.created_at,
           case when r.show_authors or p.user_id = (select auth.uid()) then c.author_participant_id end,
           p.user_id = (select auth.uid())
    from public.cards c
    join public.participants p on p.id = c.author_participant_id
    join public.retros r on r.id = c.retro_id
    where c.retro_id = p_retro
      and (public.phase_rank(r.phase) >= public.phase_rank('reveal') or p.user_id = (select auth.uid()))
    order by c.created_at;
end $$;

create or replace function public.get_card_counts(p_retro uuid)
returns table (participant_id uuid, n integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_retro(p_retro) then return; end if;
  return query
    select c.author_participant_id, count(*)::integer from public.cards c
    where c.retro_id = p_retro group by c.author_participant_id;
end $$;

create or replace function public.get_vote_totals(p_retro uuid)
returns table (card_id uuid, n integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_retro(p_retro) then return; end if;
  if (select public.phase_rank(r.phase) from public.retros r where r.id = p_retro) < public.phase_rank('discussion') then
    return;
  end if;
  return query
    select v.card_id, count(*)::integer from public.votes v where v.retro_id = p_retro group by v.card_id;
end $$;

-- ---------- grants ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.server_now(), public.get_retro_by_code(text),
  public.join_retro(text, text, public.retro_role), public.get_cards(uuid),
  public.get_card_counts(uuid), public.get_vote_totals(uuid)
  to authenticated;
grant execute on function public.phase_rank(public.phase), public.is_host(uuid), public.is_member(uuid),
  public.can_see_retro(uuid), public.owns_active_participant(uuid, uuid, public.phase),
  public.owns_participant(uuid)
  to authenticated;

-- ---------- realtime ----------
alter publication supabase_realtime add table public.retros, public.participants, public.action_items, public.action_item_refs;
