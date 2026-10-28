begin;
create or replace function public.save_product_bundle(
  p_product jsonb,
  p_specs jsonb,
  p_media jsonb,
  p_expected_updated_at timestamptz default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_product_id uuid := (p_product->>'id')::uuid;
  current_product public.products%rowtype;
  saved_product public.products%rowtype;
  removed_paths text[];
begin
  if not exists(select 1 from public.admin_users where user_id = (select auth.uid())) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if v_product_id is null or jsonb_typeof(p_product) is distinct from 'object'
     or jsonb_typeof(p_specs) is distinct from 'array' or jsonb_typeof(p_media) is distinct from 'array'
     or jsonb_array_length(p_specs) > 50 or jsonb_array_length(p_media) > 12
     or length(coalesce(p_product->>'summary','')) > 500
     or length(coalesce(p_product->>'content','')) > 20000 then
    raise exception 'INVALID_PRODUCT';
  end if;
  if (select count(*) from jsonb_array_elements(p_media)) <>
     (select count(distinct value->>'id') from jsonb_array_elements(p_media)) then
    raise exception 'INVALID_MEDIA';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_media) as incoming(id uuid, storage_path text)
    where incoming.id is null or incoming.storage_path is null
      or incoming.storage_path not like v_product_id::text || '/%'
      or exists(select 1 from public.product_media existing where existing.id=incoming.id and (existing.product_id<>v_product_id or existing.storage_path<>incoming.storage_path))
      or not exists(select 1 from storage.objects o where o.bucket_id='product-images' and o.name=incoming.storage_path)
  ) then raise exception 'INVALID_MEDIA'; end if;

  select * into current_product from public.products where id=v_product_id for update;
  if found then
    if p_expected_updated_at is null or current_product.updated_at <> p_expected_updated_at then
      raise exception 'EDIT_CONFLICT';
    end if;
    update public.products set
      title=trim(p_product->>'title'), slug=trim(p_product->>'slug'),
      category_id=p_product->>'category_id', summary=coalesce(p_product->>'summary',''),
      content=coalesce(p_product->>'content',''), status=p_product->>'status',
      source_url=nullif(trim(p_product->>'source_url'),''),
      sort_order=coalesce((p_product->>'sort_order')::integer,0)
    where id=v_product_id returning * into saved_product;
  else
    if p_expected_updated_at is not null then raise exception 'EDIT_CONFLICT'; end if;
    insert into public.products(id,title,slug,category_id,summary,content,status,source_url,sort_order)
    values(v_product_id,trim(p_product->>'title'),trim(p_product->>'slug'),p_product->>'category_id',
      coalesce(p_product->>'summary',''),coalesce(p_product->>'content',''),
      coalesce(p_product->>'status','draft'),nullif(trim(p_product->>'source_url'),''),
      coalesce((p_product->>'sort_order')::integer,0))
    returning * into saved_product;
  end if;

  delete from public.product_specs where product_specs.product_id=v_product_id;
  insert into public.product_specs(product_id,label,value,unit,sort_order)
  select v_product_id,trim(item->>'label'),trim(item->>'value'),coalesce(item->>'unit',''),position::integer-1
  from jsonb_array_elements(p_specs) with ordinality as spec(item,position);

  select array_agg(storage_path) into removed_paths from public.product_media old
  where old.product_id=v_product_id and not exists(
    select 1 from jsonb_to_recordset(p_media) as incoming(id uuid) where incoming.id=old.id);
  delete from public.product_media old where old.product_id=v_product_id and not exists(
    select 1 from jsonb_to_recordset(p_media) as incoming(id uuid) where incoming.id=old.id);
  insert into public.product_media(id,product_id,storage_path,alt_text,sort_order)
  select (item->>'id')::uuid,v_product_id,item->>'storage_path',left(coalesce(item->>'alt_text',''),500),position::integer-1
  from jsonb_array_elements(p_media) with ordinality as media(item,position)
  on conflict (id) do update set alt_text=excluded.alt_text,sort_order=excluded.sort_order;
  return jsonb_build_object('product',to_jsonb(saved_product),'removed_paths',coalesce(to_jsonb(removed_paths),'[]'::jsonb));
end;
$$;
revoke all on function public.save_product_bundle(jsonb,jsonb,jsonb,timestamptz) from public, anon;
grant execute on function public.save_product_bundle(jsonb,jsonb,jsonb,timestamptz) to authenticated;
commit;
