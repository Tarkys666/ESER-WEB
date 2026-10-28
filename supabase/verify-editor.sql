begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users limit 1),true);
set local role authenticated;
do $$
declare
  v_id uuid := gen_random_uuid();
  payload jsonb;
  result jsonb;
  failed boolean := false;
begin
  payload := jsonb_build_object('id',v_id,'title','Editor integration check','slug','editor-check-'||v_id::text,'category_id','termal-kameralar','status','draft','summary','Test summary','content','Plain text description','sort_order',0);
  result := public.save_product_bundle(payload,'[{"label":"Power","value":"100","unit":"W"}]'::jsonb,'[]'::jsonb,null);
  if not exists(select 1 from public.products where id=v_id and status='draft') then raise exception 'Create failed'; end if;
  if (select count(*) from public.product_specs where product_id=v_id)<>1 then raise exception 'Specs failed'; end if;
  begin
    perform public.save_product_bundle(payload || '{"title":"Must roll back"}'::jsonb,'[{"label":"Invalid","value":""}]'::jsonb,'[]'::jsonb,(result->'product'->>'updated_at')::timestamptz);
  exception when check_violation then failed:=true;
  end;
  if not failed or (select title from public.products where id=v_id)<>'Editor integration check' then raise exception 'Atomic rollback failed'; end if;
  failed:=false;
  begin
    perform public.save_product_bundle(payload,'[]'::jsonb,'[]'::jsonb,'2000-01-01'::timestamptz);
  exception when raise_exception then
    if SQLERRM='EDIT_CONFLICT' then failed:=true; else raise; end if;
  end;
  if not failed then raise exception 'Concurrency guard failed'; end if;
  result := public.save_product_bundle(payload || '{"status":"published"}'::jsonb,'[]'::jsonb,'[]'::jsonb,(result->'product'->>'updated_at')::timestamptz);
  if (select count(*) from public.product_specs where product_id=v_id)<>0 then raise exception 'Spec replacement failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  begin
    perform public.save_product_bundle('{}'::jsonb,'[]'::jsonb,'[]'::jsonb,null);
    raise exception 'Unauthorized call succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select not has_function_privilege('anon','public.save_product_bundle(jsonb,jsonb,jsonb,timestamptz)','execute') as anonymous_rpc_denied,
'PASS: create, spec replacement, transaction rollback, stale update rejection and non-admin denial' as verification;
rollback;
