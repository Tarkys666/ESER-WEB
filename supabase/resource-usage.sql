begin;
create function public.admin_resource_usage()
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.admin_users where user_id = (select auth.uid())) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'database_bytes',pg_catalog.pg_database_size(pg_catalog.current_database()),
      'image_bytes',coalesce(sum((metadata->>'size')::bigint),0),
      'image_count',count(*),'sampled_at',statement_timestamp()
    ) from storage.objects where bucket_id='product-images'
  );
end;
$$;
revoke all on function public.admin_resource_usage() from public, anon;
grant execute on function public.admin_resource_usage() to authenticated;
commit;
