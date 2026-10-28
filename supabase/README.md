# Dilek Makina backend

Project: `lxvccrhykqpmxsrxfozi` (`dilek_makina`, eu-west-1).

## Database

`schema.sql` is the initial schema snapshot. It was applied through the Supabase migration API as `20261028131616_create_product_catalog`. `policies.sql` was applied next as `refine_catalog_policies`, combining read policies and separating write operations. Do not rerun these on an existing database; inspect the schema and create a new migration for subsequent changes.

- `categories`: product groups and display order.
- `products`: unique slug, category, title, summary, plain text content, draft/published status and source URL.
- `product_specs`: ordered label/value/unit rows.
- `product_media`: ordered image references and alt text.
- `admin_users`: trusted Auth user UUIDs. Clients can read only their own membership and cannot grant admin access.

All tables have RLS. Visitors can read published products and their associated specifications/media. Only listed admins can edit content, see drafts or upload files. Category names are public. The `product-images` bucket is private, accepts JPEG/PNG/WebP/AVIF up to 5 MB per file, and permits public API reads only for objects linked to published products. Files use `<product UUID>/<filename>` paths; the editor manages their metadata and cleanup.

## Initial data

`node scripts/export-catalog-seed.cjs` regenerates `seed.sql` from the original sample catalog. It inserts missing categories/products without overwriting edited records. The initial 16 categories and 18 products have been imported. Technical specifications and product images have not been invented or imported.

## Website connection

`src/supabase-config.js` contains the project URL and browser-safe publishable key. Never place a secret/service-role key here. `src/backend.js` loads the published catalog in pages of 100; unavailable configured backends produce a visible error rather than silently displaying stale sample products. Removing the configuration explicitly restores static preview mode.

`node scripts/verify-backend.cjs` checks the live public API and outage handling. `verify-rls.sql` tests the seeded database with anonymous, non-admin and admin roles inside a rolled-back transaction. Run the latter using a trusted SQL connection, never from the public website.

## Administrator login

`admin.html` supports email/password sign-in through Supabase Auth using the official, locally vendored `supabase-js` SDK. Its exact version, source URL and SHA-256 are recorded in `src/vendor/vendor-lock.json`; the MIT license is retained alongside it.

The owner created their password directly in Supabase and their confirmed Auth UUID has been added to `public.admin_users`. Passwords are not stored in repository files. The browser verifies the session with `getUser()` and checks its own admin membership before displaying the product list. RLS enforces authorization for direct API calls too. The app supports session refresh, local sign-out, and a clear denial for non-admin accounts. There is no public registration form.

The login page also supports password recovery emails and a new-password form displayed for Supabase recovery sessions. Auth Site URL is `https://eserb.netlify.app/admin.html`. The exact redirect allowlist contains that address, its `/admin` clean URL and `http://127.0.0.1:4173/admin.html` for local development. New passwords must be entered and submitted by the owner in the app, not shared in chat.

To add another admin, create and confirm the approved account in Supabase Auth, then add its verified UUID to `public.admin_users` through a trusted administrative connection. Clients cannot grant themselves membership.

## Product management

`admin.html` provides search, category/status filters, counts and 20-row pagination. Choose **Yeni ürün** or **Düzenle** to edit the title, category, slug, summary, description, publication status, display order and optional source URL. Add up to 50 technical specification rows and 12 images. Images have local previews, editable alt text and ordering controls; the first is the cover. Selecting a file does not upload it until Save. Closing a changed form prompts before discarding it.

`catalog-editor.sql` is the final snapshot of the `save_product_bundle` RPC applied through `product_editor_atomic_save`, `qualify_product_editor_variables` and `validate_product_editor_payload_types` migrations. The invoker function checks admin membership, validates media ownership/storage paths and saves the product, specifications and image metadata atomically. A row lock and expected `updated_at` reject stale edits. Uploads happen before the transaction; unsuccessful saves attempt to remove new files. Removed images are cleaned from Storage after commit, with a retry control on failure. Closing the browser during a failed network request can leave an unreferenced object; no background janitor is claimed.

Published products show their cover in `urunler.html` and a gallery, description and specifications in `urun.html?urun=<slug>`. Private images use one-hour signed URLs. Draft products and their images remain unavailable to anonymous visitors. The editor can unpublish a product by selecting **Taslak**. Existing products also have an **Ürünü sil** action with a product-specific irreversible-deletion confirmation. `delete-product.sql`, applied as `admin_delete_product_bundle`, locks the product, checks admin membership and the expected modification time, then deletes product/spec/media records atomically. It returns removed image paths for deletion through the Storage API, using the existing cleanup/retry controls. The rollback check is `verify-delete-product.sql`.

## Homepage slides

The homepage currently uses its original shader/grid design again, following the owner's design preference. The slide editor, uploaded images and database records are retained, but are not currently displayed on the homepage. The implementation details below describe the retained slider module.

`hero-slides.sql` was applied as `admin_homepage_slides`; `seed-hero-slides.sql` was imported once for the ten supplied JPEG posters. `hero_slides` has active-only public reads and admin-only writes under RLS. Admin cards edit the description, display order, visibility and image; each card saves independently and checks `updated_at` to reject stale writes/deletes. New images go to the public promotional `hero-images` bucket (JPEG/PNG/WebP/AVIF, 5 MB maximum). Hidden slides are omitted from the slideshow; uploaded promotional files remain addressable by their public URLs. Deleting/replacing an uploaded image cleans up through the Storage API, with a retry control on failure. Original bundled assets are retained in Git rather than deleted by the editor.

The homepage fetches active slide metadata, displays one contained image at a time, and supports previous/next, pause/play and a 6.5-second interval. Reduced motion starts paused; keyboard focus pauses navigation, and hidden tabs stop the timer. It does not fetch all poster images on initial load. Supplied JPEGs total 3.04 MiB (115-460 KiB each) and are preserved without lossy recompression. `verify-hero-slides.sql` checks active-only reads, unauthorized writes and admin updates/deletes inside a rolled-back transaction.

## Admin resource usage

`resource-usage.sql` was applied as `admin_resource_usage`. The invoker RPC requires trusted admin membership and returns only the current database size, product-image bucket bytes/count and measurement time. It does not query Auth user data or expose privileged credentials. Existing Storage RLS applies. `verify-resource-usage.sql` checks the aggregates and rejects anonymous/non-admin calls in a rolled-back transaction.

The panel refreshes on login, on demand and after saving products. Its Free-plan references (500 MB database per project, 1 GB Storage per organization) were checked against the connected organization's plan and official documentation on 2026-10-28. These are explicitly dated configuration, not a live billing subscription API. Update them if the plan changes. The database percentage compares the current Postgres database size with the 500 MB reference. The image card deliberately has no organization quota percentage: it measures only the product bucket's live bytes, whereas Supabase Storage billing uses organization-wide GB-hours over the billing period. Traffic/MAU/billing values link to the official organization usage page rather than estimating them. Upload limits remain 5 MB/file and 12 images/product.

Sources: [database size](https://supabase.com/docs/guides/platform/database-size), [Storage usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size).

## Production deployment

Netlify's existing `eserb` project is connected to the GitHub repository's `main` branch. `netlify.toml` runs `node scripts/build-site.cjs` and publishes `dist/`. The build copies only frontend HTML, CSS, `src/` and `assets/`; SQL, tests, development documentation and Git metadata are not part of the website. `dist/` is ignored by Git. Browser configuration contains only the publishable Supabase key; database access remains protected by RLS.

## Verification results

The public API, catalog search and rolled-back RLS checks passed. `verify-editor.sql` checks creation, spec replacement, atomic rollback, stale update rejection and non-admin denial in a rolled-back transaction. The logged-in browser also exercised actual multi-image upload, ordering, editing, publishing, public gallery display and removal; temporary records are removed after testing.

The latest security advisor reports disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This Auth setting is separate from the catalog's tested RLS. Performance advisors report only a new unused category/status index; it supports the category foreign key and future database filtering. See [unused index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
