begin;
create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_path text not null check (
    (image_path like 'assets/%' or image_path ~ '^slides/[a-f0-9-]+\.(jpg|jpeg|png|webp|avif)$')
    and image_path not like '%..%' and length(image_path) <= 300
  ),
  alt_text text not null default '' check(length(alt_text)<=500),
  is_active boolean not null default true,
  sort_order integer not null default 0 check(sort_order between 0 and 1000000),
  updated_at timestamptz not null default now()
);
alter table public.hero_slides enable row level security;
grant select on public.hero_slides to anon, authenticated;
grant insert, update, delete on public.hero_slides to authenticated;
create policy slides_public_read on public.hero_slides for select to anon using (is_active);
create policy slides_authenticated_read on public.hero_slides for select to authenticated
  using (is_active or exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy slides_admin_insert on public.hero_slides for insert to authenticated
  with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy slides_admin_update on public.hero_slides for update to authenticated
  using (exists(select 1 from public.admin_users where user_id=(select auth.uid())))
  with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy slides_admin_delete on public.hero_slides for delete to authenticated
  using (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create trigger hero_slides_updated_at before update on public.hero_slides
  for each row execute function public.set_updated_at();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hero-images','hero-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']);
create policy hero_image_admin_select on storage.objects for select to authenticated
  using(bucket_id='hero-images' and exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy hero_image_admin_insert on storage.objects for insert to authenticated
  with check(bucket_id='hero-images' and name ~ '^slides/[a-f0-9-]+\.(jpg|jpeg|png|webp|avif)$' and exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy hero_image_admin_delete on storage.objects for delete to authenticated
  using(bucket_id='hero-images' and exists(select 1 from public.admin_users where user_id=(select auth.uid())));
commit;
