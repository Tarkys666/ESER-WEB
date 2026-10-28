begin;
create function public.delete_product_bundle(p_product_id uuid, p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_product public.products%rowtype;
  removed_paths jsonb;
begin
  if not exists(select 1 from public.admin_users where user_id = (select auth.uid())) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select * into current_product from public.products where id=p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if p_expected_updated_at is null or current_product.updated_at <> p_expected_updated_at then
    raise exception 'EDIT_CONFLICT';
  end if;
  select coalesce(jsonb_agg(storage_path),'[]'::jsonb) into removed_paths
    from public.product_media where product_id=p_product_id;
  delete from public.products where id=p_product_id;
  return jsonb_build_object('removed_paths',removed_paths);
end;
$$;
revoke all on function public.delete_product_bundle(uuid,timestamptz) from public, anon;
grant execute on function public.delete_product_bundle(uuid,timestamptz) to authenticated;
commit;
