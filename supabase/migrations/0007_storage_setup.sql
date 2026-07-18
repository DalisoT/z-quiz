-- ============================================================================
-- 0007_storage_setup.sql
-- Create the attempt-images bucket + RLS policies for student-uploaded
-- handwritten work (used by v3 / equation questions).
-- ============================================================================
-- Paste into the Supabase SQL Editor and run.
-- Idempotent: drops + re-creates everything.

-- 1. Create the bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attempt-images',
  'attempt-images',
  false,                                          -- private bucket
  10 * 1024 * 1024,                               -- 10 MB max per upload
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update set
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. RLS: users can upload to their own folder only
--    Path convention: <user_id>/<question_id>.<ext>
drop policy if exists "attempt-images: own-folder upload" on storage.objects;
create policy "attempt-images: own-folder upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attempt-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. RLS: users can read their own images
drop policy if exists "attempt-images: own-folder read" on storage.objects;
create policy "attempt-images: own-folder read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attempt-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. RLS: users can update/delete their own images
drop policy if exists "attempt-images: own-folder update" on storage.objects;
create policy "attempt-images: own-folder update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'attempt-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'attempt-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "attempt-images: own-folder delete" on storage.objects;
create policy "attempt-images: own-folder delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attempt-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Service-role bypass: needed for any admin operations (none right now,
--    but covers future admin tooling).
