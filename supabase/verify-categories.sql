begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users limit 1),true);
set local role authenticated;
insert into public.categories(id,name,sort_order) values ('category-verification-rollback','Kategori kontrolü',100);
do $$ begin
  if not exists(select 1 from public.categories where id='category-verification-rollback') then raise exception 'Admin category insert failed'; end if;
  begin
    insert into public.categories(id,name) values ('category-verification-rollback','Duplicate');
    raise exception 'Duplicate category allowed';
  exception when unique_violation then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  if not exists(select 1 from public.categories where id='category-verification-rollback') then raise exception 'Public category read failed'; end if;
  begin
    insert into public.categories(id,name) values ('category-anon-denied','Denied');
    raise exception 'Anonymous category creation allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
  begin
    insert into public.categories(id,name) values ('category-non-admin-denied','Denied');
    raise exception 'Non-admin category creation allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: admin creation, public read, duplicate and unauthorized insert rejection' as result;
rollback;
