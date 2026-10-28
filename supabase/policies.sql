begin;
drop policy categories_admin_write on public.categories;
create policy categories_admin_insert on public.categories for insert to authenticated  with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy categories_admin_update on public.categories for update to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy categories_admin_delete on public.categories for delete to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) ;
drop policy products_admin_manage on public.products;
drop policy products_published_read on public.products;
create policy products_published_read on public.products for select to anon using (status = 'published');
create policy products_authenticated_read on public.products for select to authenticated using (status = 'published' or exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy products_admin_insert on public.products for insert to authenticated  with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy products_admin_update on public.products for update to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy products_admin_delete on public.products for delete to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) ;
drop policy admin_manage on public.product_specs;
drop policy published_product_read on public.product_specs;
create policy published_product_read on public.product_specs for select to anon using (exists(select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy authenticated_product_read on public.product_specs for select to authenticated using (exists(select 1 from public.products p where p.id = product_id));
create policy product_specs_admin_insert on public.product_specs for insert to authenticated  with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy product_specs_admin_update on public.product_specs for update to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy product_specs_admin_delete on public.product_specs for delete to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) ;
drop policy admin_manage on public.product_media;
drop policy published_product_read on public.product_media;
create policy published_product_read on public.product_media for select to anon using (exists(select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy authenticated_product_read on public.product_media for select to authenticated using (exists(select 1 from public.products p where p.id = product_id));
create policy product_media_admin_insert on public.product_media for insert to authenticated  with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy product_media_admin_update on public.product_media for update to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy product_media_admin_delete on public.product_media for delete to authenticated using (exists(select 1 from public.admin_users where user_id = (select auth.uid()))) ;
drop policy product_image_admin_manage on storage.objects;
drop policy product_image_published_read on storage.objects;
create policy product_image_published_read on storage.objects for select to anon
using (bucket_id = 'product-images' and exists (
  select 1 from public.product_media m join public.products p on p.id = m.product_id
  where m.storage_path = storage.objects.name and p.status = 'published'
));
create policy product_image_authenticated_read on storage.objects for select to authenticated
using (bucket_id = 'product-images' and (exists(select 1 from public.admin_users where user_id = (select auth.uid())) or exists(select 1 from public.product_media m where m.storage_path = storage.objects.name)));
create policy product_image_admin_insert on storage.objects for insert to authenticated  with check (bucket_id = 'product-images' and exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy product_image_admin_update on storage.objects for update to authenticated using (bucket_id = 'product-images' and exists(select 1 from public.admin_users where user_id = (select auth.uid()))) with check (bucket_id = 'product-images' and exists(select 1 from public.admin_users where user_id = (select auth.uid())));
create policy product_image_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'product-images' and exists(select 1 from public.admin_users where user_id = (select auth.uid()))) ;
commit;
