-- Review fix: the server now sends a derived key (HMAC(PIN_SECRET, 'rpc-key')) instead of the raw
-- secret, so the secret itself never reaches the database or its logs. Store only:
--   insert into private.app_secrets (name, value_hash) values ('pin_rpc_key', '<sha256 hex of the derived key>');
-- 'pin_key' (sha256 of the raw secret) is still accepted for zero-downtime rollout; delete that row after deploy.
create or replace function private.assert_pin_key(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_key is null or not exists (
    select 1 from private.app_secrets s
    where s.name in ('pin_rpc_key', 'pin_key') and s.value_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
  ) then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;
end $$;
revoke execute on function private.assert_pin_key(text) from public, anon, authenticated;
