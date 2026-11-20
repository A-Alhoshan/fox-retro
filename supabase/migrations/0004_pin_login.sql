-- Host sign-in with a 5-digit PIN: per-email lockout, callable only by our server.
-- The server proves itself with p_key (PIN_SECRET); only its sha256 lives in the database:
--   insert into private.app_secrets (name, value_hash)
--   values ('pin_key', encode(extensions.digest('<PIN_SECRET>', 'sha256'), 'hex'));
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  value_hash text not null
);

create table if not exists private.pin_attempts (
  email text primary key,
  failures integer not null default 0,
  locked_until timestamptz
);

create or replace function private.assert_pin_key(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_key is null or not exists (
    select 1 from private.app_secrets s
    where s.name = 'pin_key' and s.value_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
  ) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
end $$;

create or replace function public.pin_check(p_key text, p_email text)
returns table (account_exists boolean, locked_until timestamptz)
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  perform private.assert_pin_key(p_key);
  return query select
    exists (select 1 from auth.users u where lower(u.email) = e and not coalesce(u.is_anonymous, false)),
    (select a.locked_until from private.pin_attempts a where a.email = e and a.locked_until > now());
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
  insert into private.pin_attempts as a (email, failures) values (e, 1)
  on conflict (email) do update
    set failures = case when a.locked_until is not null and a.locked_until <= now() then 1 else a.failures + 1 end,
        locked_until = case when a.locked_until is not null and a.locked_until <= now() then null else a.locked_until end
  returning failures into f;
  if f >= 5 then
    until := now() + interval '15 minutes';
    update private.pin_attempts set locked_until = until, failures = 0 where email = e;
    return until;
  end if;
  return null;
end $$;

revoke execute on function private.assert_pin_key(text) from public, anon, authenticated;
revoke execute on function public.pin_check(text, text) from public;
revoke execute on function public.pin_record(text, text, boolean) from public;
grant execute on function public.pin_check(text, text) to anon, authenticated;
grant execute on function public.pin_record(text, text, boolean) to anon, authenticated;
