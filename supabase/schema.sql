begin;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.categories (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 150),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 250),
  summary text not null default '',
  content text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  source_url text check (source_url is null or source_url ~ '^https://'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_status_order_idx on public.products(category_id, status, sort_order, id);
create index products_status_order_idx on public.products(status, sort_order, id);

create table public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 150),
  value text not null check (length(trim(value)) between 1 and 500),
  unit text not null default '',
  sort_order integer not null default 0
);
create index product_specs_product_order_idx on public.product_specs(product_id, sort_order, id);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '',
  sort_order integer not null default 0,
  check (storage_path like product_id::text || '/%')
);
create index product_media_product_order_idx on public.product_media(product_id, sort_order, id);

create function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
create trigger categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy admin_self_read on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));

alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
create policy categories_public_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin_write on public.categories for all to authenticated
using (exists(select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
create policy products_published_read on public.products for select to anon, authenticated
using (status = 'published');
create policy products_admin_manage on public.products for all to authenticated
using (exists(select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));

do $$
declare relation_name text;
begin
  foreach relation_name in array array['product_specs', 'product_media'] loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('revoke all on public.%I from anon, authenticated', relation_name);
    execute format('grant select on public.%I to anon, authenticated', relation_name);
    execute format('grant insert, update, delete on public.%I to authenticated', relation_name);
    execute format(
      'create policy published_product_read on public.%I for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and p.status = ''published''))',
      relation_name);
    execute format(
      'create policy admin_manage on public.%I for all to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())))',
      relation_name);
  end loop;
end;
$$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

create policy product_image_published_read on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images' and exists (
  select 1 from public.product_media m join public.products p on p.id = m.product_id
  where m.storage_path = storage.objects.name and p.status = 'published'
));
create policy product_image_admin_manage on storage.objects for all to authenticated
using (bucket_id = 'product-images' and exists(select 1 from public.admin_users where user_id = (select auth.uid())))
with check (bucket_id = 'product-images' and exists(select 1 from public.admin_users where user_id = (select auth.uid())));

commit;
