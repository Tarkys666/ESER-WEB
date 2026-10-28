begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users limit 1),true);
set local role authenticated;
do $$
declare result jsonb;
begin
  result := public.admin_resource_usage();
  if (result->>'database_bytes')::bigint <> pg_database_size(current_database())
    or (result->>'image_count')::bigint <> (select count(*) from storage.objects where bucket_id='product-images')
    or (result->>'image_bytes')::bigint <> (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='product-images')
    or result->>'sampled_at' is null then
    raise exception 'Usage aggregation failed';
  end if;
end $$;
select public.admin_resource_usage() as admin_usage;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$
begin
  begin
    perform public.admin_resource_usage();
    raise exception 'Non-admin usage access allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.admin_resource_usage()','execute') then
    raise exception 'Anonymous usage access allowed';
  end if;
end $$;
select 'PASS: live aggregation, admin access, non-admin rejection, anonymous rejection' as result;
rollback;
