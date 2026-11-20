-- Review fix: reserve an attempt BEFORE checking the PIN, so parallel requests can't
-- all slip past the lock. `failures` now counts attempts in flight plus confirmed failures.
--   pin_begin   → reserves a slot (row-locked); refuses once 5 are used; no slot for unknown emails
--   pin_record  → ok: clear the row; not ok: confirm failure, lock on the 5th
--   pin_release → give a slot back when auth failed for a non-PIN reason (network, rate limit)

create or replace function public.pin_begin(p_key text, p_email text)
returns table (account_exists boolean, locked_until timestamptz)
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email)); f integer; l timestamptz;
begin
  perform private.assert_pin_key(p_key);
  if not exists (select 1 from auth.users u where lower(u.email) = e and not coalesce(u.is_anonymous, false)) then
    return query select false, null::timestamptz;
    return;
  end if;
  insert into private.pin_attempts as a (email, failures) values (e, 0)
  on conflict (email) do update
    set failures = case when a.locked_until is not null and a.locked_until <= now() then 0 else a.failures end,
        locked_until = case when a.locked_until is not null and a.locked_until <= now() then null else a.locked_until end
  returning a.failures, a.locked_until into f, l;
  if l is not null then
    return query select true, l;
    return;
  end if;
  if f >= 5 then
    l := now() + interval '15 minutes';
    update private.pin_attempts set locked_until = l where email = e;
    return query select true, l;
    return;
  end if;
  update private.pin_attempts set failures = failures + 1 where email = e;
  return query select true, null::timestamptz;
end $$;

create or replace function public.pin_record(p_key text, p_email text, p_ok boolean)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email)); f integer; until timestamptz;
begin
  perform private.assert_pin_key(p_key);
  if p_ok then
    delete from private.pin_attempts where email = e;
    return null;
  end if;
  select a.failures into f from private.pin_attempts a where a.email = e for update;
  if f is not null and f >= 5 then
    until := now() + interval '15 minutes';
    update private.pin_attempts set locked_until = until where email = e;
    return until;
  end if;
  return null;
end $$;

create or replace function public.pin_release(p_key text, p_email text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_pin_key(p_key);
  update private.pin_attempts set failures = greatest(failures - 1, 0)
  where email = lower(trim(p_email)) and locked_until is null;
end $$;

revoke execute on function public.pin_begin(text, text) from public;
revoke execute on function public.pin_release(text, text) from public;
grant execute on function public.pin_begin(text, text) to anon, authenticated;
grant execute on function public.pin_release(text, text) to anon, authenticated;
