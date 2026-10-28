begin;
insert into public.hero_slides(image_path,alt_text,is_active) values('assets/verification-only.jpeg','SLIDER_RLS_TEST',false);
set local role anon;
do $$ begin
  if exists(select 1 from public.hero_slides where alt_text='SLIDER_RLS_TEST') then raise exception 'Hidden slide leaked'; end if;
  if (select count(*) from public.hero_slides where is_active)<10 then raise exception 'Public slides missing'; end if;
  begin
    insert into public.hero_slides(image_path) values('assets/unauthorized.jpeg');
    raise exception 'Anonymous write allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.hero_slides where alt_text='SLIDER_RLS_TEST') then raise exception 'Non-admin hidden slide leaked'; end if;
  begin
    insert into public.hero_slides(image_path) values('assets/non-admin.jpeg');
    raise exception 'Non-admin write allowed';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.hero_slides where alt_text='SLIDER_RLS_TEST')<>0 then raise exception 'Hidden read allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users limit 1),true);
set local role authenticated;
do $$ declare test_id uuid; begin
  select id into test_id from public.hero_slides where alt_text='SLIDER_RLS_TEST';
  if test_id is null then raise exception 'Admin hidden slide missing'; end if;
  update public.hero_slides set sort_order=25,alt_text='SLIDER_ADMIN_UPDATED' where id=test_id;
  if not found then raise exception 'Admin update denied'; end if;
  delete from public.hero_slides where id=test_id;
  if not found then raise exception 'Admin delete denied'; end if;
end $$;
reset role;
select 'PASS: public active-only read, non-admin denial, admin update/delete' as result;
rollback;
