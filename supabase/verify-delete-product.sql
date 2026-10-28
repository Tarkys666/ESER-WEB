begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users limit 1),true);
set local role authenticated;
do $$
declare
  test_id uuid := gen_random_uuid();
  stamp timestamptz;
  result jsonb;
  rejected boolean := false;
  image_path text;
begin
  image_path := test_id::text || '/deletion-verification.png';
  insert into public.products(id,category_id,slug,title,status)
    values(test_id,'termal-kameralar','delete-verification-'||test_id::text,'Disposable deletion verification','draft')
    returning updated_at into stamp;
  insert into public.product_specs(product_id,label,value) values(test_id,'Test','1');
  insert into public.product_media(product_id,storage_path) values(test_id,image_path);
  begin
    perform public.delete_product_bundle(test_id,stamp - interval '1 second');
  exception when raise_exception then
    if SQLERRM='EDIT_CONFLICT' then rejected:=true; else raise; end if;
  end;
  if not rejected or not exists(select 1 from public.products where id=test_id) then
    raise exception 'Stale deletion was not rejected';
  end if;
  result := public.delete_product_bundle(test_id,stamp);
  if exists(select 1 from public.products where id=test_id)
    or exists(select 1 from public.product_specs where product_id=test_id)
    or exists(select 1 from public.product_media where product_id=test_id)
    or result->'removed_paths' <> jsonb_build_array(image_path) then
    raise exception 'Deletion cascade or cleanup paths failed';
  end if;
end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$ begin
  begin
    perform public.delete_product_bundle(gen_random_uuid(),now());
    raise exception 'Non-admin deletion allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.delete_product_bundle(uuid,timestamptz)','execute') then
    raise exception 'Anonymous deletion allowed';
  end if;
end $$;
select 'PASS: deletion, cascade, cleanup paths, stale version protection and authorization' as result;
rollback;
