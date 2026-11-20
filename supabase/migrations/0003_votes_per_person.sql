-- Host-set vote count per person (1-10, default 3).
-- Lowering it keeps votes already cast but blocks new ones until the person is under the limit.
alter table public.retros
  add column votes_per_person integer not null default 3
  check (votes_per_person between 1 and 10);

create or replace function public.enforce_vote_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.participant_id::text, 0));
  if (select count(*) from public.votes v where v.participant_id = new.participant_id)
     >= (select r.votes_per_person from public.retros r where r.id = new.retro_id) then
    raise exception 'vote limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke execute on function public.enforce_vote_limit() from public, anon, authenticated;
