begin;
insert into public.products(category_id, slug, title) values ('termal-kameralar', 'rls-verification-draft', 'RLS verification');
set local role anon;
do $$
declare rejected boolean := false;
begin
  if (select count(*) from public.products where slug = 'rls-verification-draft') <> 0 then raise exception 'Anonymous draft leak'; end if;
  if (select count(*) from public.products) = 0 then raise exception 'Published catalog unavailable'; end if;
  begin
    insert into public.products(category_id, slug, title) values ('termal-kameralar', 'anonymous-write-test', 'Test');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Anonymous write allowed'; end if;
end $$;
reset role;
set local role authenticated;
do $$
declare rejected boolean := false;
begin
  if (select count(*) from public.products where slug = 'rls-verification-draft') <> 0 then raise exception 'Non-admin draft leak'; end if;
  begin
    insert into public.products(category_id, slug, title) values ('termal-kameralar', 'non-admin-write-test', 'Test');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Non-admin write allowed'; end if;
end $$;
reset role;
do $$
declare test_user uuid := gen_random_uuid();
begin
  insert into auth.users(id, email) values(test_user, 'catalog-policy-test@invalid.example');
  insert into public.admin_users(user_id) values(test_user);
  perform set_config('request.jwt.claim.sub', test_user::text, true);
end $$;
set local role authenticated;
do $$
begin
  if (select count(*) from public.products where slug = 'rls-verification-draft') <> 1 then raise exception 'Admin cannot read draft'; end if;
  insert into public.products(category_id, slug, title) values ('termal-kameralar', 'admin-write-test', 'Test');
  update public.products set summary = 'policy test' where slug = 'rls-verification-draft';
  if not found then raise exception 'Admin cannot update'; end if;
  delete from public.products where slug = 'rls-verification-draft';
  if not found then raise exception 'Admin cannot delete'; end if;
end $$;
reset role;
select 'PASS: anon published read, draft isolation, anon/non-admin write rejection, admin draft CRUD. All test data rolled back.' as verification;
rollback;
