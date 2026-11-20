-- RLS smoke test against a real Supabase database.
-- Simulates a host + two anonymous participants inside one transaction, then raises
-- the report as an exception so every change rolls back. Run it in the SQL editor;
-- expected: every line of "SMOKE REPORT" ends in "ok".
do $$
declare
  h uuid := gen_random_uuid(); a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  inst uuid := '00000000-0000-0000-0000-000000000000';
  r uuid; pa uuid; pb uuid; ca uuid; cb uuid; ai uuid; k int; res text := '';
begin
  insert into auth.users (id, instance_id, aud, role, email, is_anonymous) values
    (h, inst, 'authenticated', 'authenticated', 'host@x.test', false),
    (a, inst, 'authenticated', 'authenticated', null, true),
    (b, inst, 'authenticated', 'authenticated', null, true);
  perform set_config('role', 'authenticated', true);

  -- 1. host creates a retro with INSERT ... RETURNING (what the app does)
  perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  begin
    insert into public.retros (code, title, host_user_id) values ('SMK234', 'smoke', h) returning id into r;
    res := res || E'\n1 create+returning: ok';
  exception when others then
    res := res || E'\n1 create+returning: FAIL ' || sqlerrm;
    execute 'reset role';
    insert into public.retros (code, title, host_user_id) values ('SMK234', 'smoke', h) returning id into r;
    perform set_config('role', 'authenticated', true);
  end;
  perform public.join_retro('SMK234', 'Host', 'scrum_master');

  -- 1b. anonymous users cannot create retros
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  begin
    insert into public.retros (code, title, host_user_id) values ('ANON22', 'x', a);
    res := res || E'\n1b anon cannot create: FAIL (inserted)';
  exception when others then res := res || E'\n1b anon cannot create: ok';
  end;
  pa := public.join_retro('smk234', ' Alice ', 'team');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  pb := public.join_retro('SMK234', 'Bob', 'product_owner');

  -- writing
  perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated')::text, true);
  update public.retros set phase = 'writing' where id = r;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  insert into public.cards (retro_id, author_participant_id, "column", text) values (r, pa, 'to_improve', 'Flaky CI') returning id into ca;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  insert into public.cards (retro_id, author_participant_id, "column", text) values (r, pb, 'went_well', 'Demos') returning id into cb;
  select count(*) into k from public.get_cards(r) g where g.id = ca;
  res := res || E'\n2a B hidden from A card in writing: ' || case when k = 0 then 'ok' else 'FAIL' end;

  -- 2. voting
  perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated')::text, true);
  update public.retros set phase = 'voting' where id = r;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  begin
    insert into public.votes (retro_id, card_id, participant_id) values (r, ca, pb);
    res := res || E'\n2 vote on other card: ok';
  exception when others then res := res || E'\n2 vote on other card: FAIL ' || sqlerrm;
  end;
  insert into public.votes (retro_id, card_id, participant_id) values (r, ca, pb), (r, cb, pb);
  begin
    insert into public.votes (retro_id, card_id, participant_id) values (r, ca, pb);
    res := res || E'\n2c 4th vote rejected: FAIL';
  exception when others then res := res || E'\n2c 4th vote rejected: ok';
  end;
  -- 2d. host-set vote count: raise to 5 lets a 4th vote in; lower to 2 keeps votes but blocks new ones
  perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated')::text, true);
  update public.retros set votes_per_person = 5 where id = r;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  begin
    insert into public.votes (retro_id, card_id, participant_id) values (r, cb, pb);
    res := res || E'\n2d 4th vote allowed at limit 5: ok';
  exception when others then res := res || E'\n2d 4th vote allowed at limit 5: FAIL ' || sqlerrm;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated')::text, true);
  update public.retros set votes_per_person = 2 where id = r;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  select count(*) into k from public.votes v where v.participant_id = pb;
  res := res || E'\n2e lowered limit keeps votes: ' || case when k = 4 then 'ok' else 'FAIL ' || k end;
  begin
    insert into public.votes (retro_id, card_id, participant_id) values (r, cb, pb);
    res := res || E'\n2f lowered limit blocks new: FAIL';
  exception when others then res := res || E'\n2f lowered limit blocks new: ok';
  end;
  delete from public.votes where id = (select v.id from public.votes v where v.participant_id = pb and v.card_id = cb limit 1);
  select count(*) into k from public.votes v where v.participant_id = pb;
  res := res || E'\n2g unvote still allowed: ' || case when k = 3 then 'ok' else 'FAIL ' || k end;
  perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated')::text, true);
  begin
    update public.retros set votes_per_person = 11 where id = r;
    res := res || E'\n2h limit above 10 rejected: FAIL';
  exception when others then res := res || E'\n2h limit above 10 rejected: ok';
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  begin
    update public.retros set votes_per_person = 10 where id = r;
    select votes_per_person into k from public.retros where id = r;
    res := res || E'\n2i participant cannot change limit: ' || case when k = 2 then 'ok' else 'FAIL ' || k end;
  exception when others then res := res || E'\n2i participant cannot change limit: ok';
  end;

  select count(*) into k from public.get_vote_totals(r);
  res := res || E'\n2b totals hidden in voting: ' || case when k = 0 then 'ok' else 'FAIL' end;

  -- 3. action plan
  perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated')::text, true);
  update public.retros set phase = 'action_plan' where id = r;
  insert into public.action_items (retro_id, text) values (r, 'Fix CI') returning id into ai;
  begin
    insert into public.action_item_refs (action_item_id, card_id, retro_id) values (ai, ca, r);
    res := res || E'\n3 host refs other card: ok';
  exception when others then res := res || E'\n3 host refs other card: FAIL ' || sqlerrm;
  end;
  select count(*) into k from public.get_cards(r) g where g.author_participant_id is not null;
  res := res || E'\n4 host sees no authors: ' || case when k = 0 then 'ok' else 'FAIL' end;
  select count(*) into k from public.get_vote_totals(r) t where t.card_id = ca and t.n = 2;
  res := res || E'\n4b totals in action_plan: ' || case when k = 1 then 'ok' else 'FAIL' end;

  -- 5. card times of others are hidden
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  select count(*) into k from public.get_cards(r) g where g.id = ca and g.created_at is not null;
  res := res || E'\n5 other card time hidden: ' || case when k = 0 then 'ok' else 'FAIL' end;
  select count(*) into k from public.get_cards(r) g where g.id = cb and g.created_at is not null;
  res := res || E'\n5b own card time visible: ' || case when k = 1 then 'ok' else 'FAIL' end;

  -- 6. host email-domain allowlist
  execute 'reset role';
  begin
    insert into public.host_domains (domain) values ('acme.com');
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated', 'email', 'host@x.test', 'is_anonymous', false)::text, true);
    begin
      insert into public.retros (code, title, host_user_id) values ('DOM234', 'x', h);
      res := res || E'\n6 domain allowlist blocks: FAIL (inserted)';
    exception when others then res := res || E'\n6 domain allowlist blocks: ok';
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', h, 'role', 'authenticated', 'email', 'host@ACME.com', 'is_anonymous', false)::text, true);
    begin
      insert into public.retros (code, title, host_user_id) values ('DOM345', 'x', h) returning id into r;
      res := res || E'\n6b allowed domain creates: ok';
    exception when others then res := res || E'\n6b allowed domain creates: FAIL ' || sqlerrm;
    end;
  exception when others then res := res || E'\n6 domain allowlist: FAIL ' || sqlerrm;
  end;

  -- 7. PIN lockout RPCs (key-guarded)
  execute 'reset role';
  insert into private.app_secrets (name, value_hash)
    values ('pin_key', encode(extensions.digest('smoke-key', 'sha256'), 'hex'))
    on conflict (name) do update set value_hash = excluded.value_hash;
  perform set_config('role', 'anon', true);
  begin
    perform public.pin_check('wrong-key', 'host@x.test');
    res := res || E'\n7 wrong key rejected: FAIL';
  exception when others then res := res || E'\n7 wrong key rejected: ok';
  end;
  begin
    perform 1 from private.pin_attempts;
    res := res || E'\n7a anon cannot read lock table: FAIL';
  exception when others then res := res || E'\n7a anon cannot read lock table: ok';
  end;
  declare t timestamptz; ex boolean;
  begin
    for i in 1..4 loop
      perform public.pin_begin('smoke-key', 'Host@X.test');
      t := public.pin_record('smoke-key', 'Host@X.test', false);
    end loop;
    res := res || E'\n7b four failures not locked: ' || case when t is null then 'ok' else 'FAIL' end;
    perform public.pin_begin('smoke-key', ' host@x.test ');
    t := public.pin_record('smoke-key', ' host@x.test ', false);
    res := res || E'\n7c fifth failure locks ~15m: '
      || case when t between now() + interval '14 minutes' and now() + interval '16 minutes' then 'ok' else 'FAIL ' || coalesce(t::text, 'null') end;
    select c.account_exists, c.locked_until into ex, t from public.pin_check('smoke-key', 'HOST@x.test') c;
    res := res || E'\n7d check sees account + lock: ' || case when ex and t is not null then 'ok' else 'FAIL' end;
    perform public.pin_record('smoke-key', 'host@x.test', true);
    select c.locked_until into t from public.pin_check('smoke-key', 'host@x.test') c;
    res := res || E'\n7e success clears lock: ' || case when t is null then 'ok' else 'FAIL' end;
    select c.account_exists into ex from public.pin_check('smoke-key', 'nobody@x.test') c;
    res := res || E'\n7f unknown email not found: ' || case when not ex then 'ok' else 'FAIL' end;
    -- 7g. six reservations in a row (as parallel requests would): only 5 get a slot
    perform public.pin_record('smoke-key', 'host@x.test', true);
    k := 0;
    for i in 1..6 loop
      select b.locked_until into t from public.pin_begin('smoke-key', 'host@x.test') b;
      if t is null then k := k + 1; end if;
    end loop;
    res := res || E'\n7g only 5 slots: ' || case when k = 5 and t is not null then 'ok' else 'FAIL ' || k end;
  end;

  raise exception 'SMOKE REPORT:%', res;
end $$;
