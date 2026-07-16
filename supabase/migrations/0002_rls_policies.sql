-- ============================================================================
-- 0002_rls_policies.sql
-- Row Level Security for Z-Quiz
-- ============================================================================
-- Paste this into the Supabase SQL Editor, then run.
-- Idempotent: drops existing policies before re-creating.

-- ----------------------------------------------------------------------------
-- Enable RLS on every table
-- ----------------------------------------------------------------------------
alter table public.grades               enable row level security;
alter table public.subjects             enable row level security;
alter table public.topics               enable row level security;
alter table public.questions            enable row level security;
alter table public.question_options     enable row level security;
alter table public.question_answers     enable row level security;
alter table public.question_images      enable row level security;
alter table public.quizzes              enable row level security;
alter table public.quiz_questions       enable row level security;
alter table public.quiz_attempts        enable row level security;
alter table public.attempt_answers      enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_topic_progress  enable row level security;

-- ============================================================================
-- PUBLIC READ — content tables (everyone, even anonymous, can browse the bank)
-- ============================================================================

-- grades
drop policy if exists "grades: public read" on public.grades;
create policy "grades: public read"
  on public.grades for select
  using (true);

-- subjects
drop policy if exists "subjects: public read" on public.subjects;
create policy "subjects: public read"
  on public.subjects for select
  using (true);

-- topics
drop policy if exists "topics: public read" on public.topics;
create policy "topics: public read"
  on public.topics for select
  using (true);

-- questions (only active)
drop policy if exists "questions: public read active" on public.questions;
create policy "questions: public read active"
  on public.questions for select
  using (is_active = true);

-- question_options (only for active questions)
drop policy if exists "question_options: public read" on public.question_options;
create policy "question_options: public read"
  on public.question_options for select
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_options.question_id
        and q.is_active = true
    )
  );

-- question_images
drop policy if exists "question_images: public read" on public.question_images;
create policy "question_images: public read"
  on public.question_images for select
  using (true);

-- question_answers (only after the user has attempted the question — see below;
-- for v1 we keep expected answers hidden from anonymous reads to prevent cheating)
drop policy if exists "question_answers: no public read" on public.question_answers;
create policy "question_answers: no public read"
  on public.question_answers for select
  using (false);

-- quizzes (only published)
drop policy if exists "quizzes: public read published" on public.quizzes;
create policy "quizzes: public read published"
  on public.quizzes for select
  using (is_published = true);

-- quiz_questions (only via published quizzes)
drop policy if exists "quiz_questions: public read published" on public.quiz_questions;
create policy "quiz_questions: public read published"
  on public.quiz_questions for select
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and q.is_published = true
    )
  );

-- ============================================================================
-- PROFILES — own row only
-- ============================================================================
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================================
-- ATTEMPTS — own rows only
-- ============================================================================
drop policy if exists "quiz_attempts: read own" on public.quiz_attempts;
create policy "quiz_attempts: read own"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "quiz_attempts: insert own" on public.quiz_attempts;
create policy "quiz_attempts: insert own"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "quiz_attempts: update own" on public.quiz_attempts;
create policy "quiz_attempts: update own"
  on public.quiz_attempts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "quiz_attempts: delete own" on public.quiz_attempts;
create policy "quiz_attempts: delete own"
  on public.quiz_attempts for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- ATTEMPT ANSWERS — own rows only
-- ============================================================================
drop policy if exists "attempt_answers: read own" on public.attempt_answers;
create policy "attempt_answers: read own"
  on public.attempt_answers for select
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_answers.attempt_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "attempt_answers: insert own" on public.attempt_answers;
create policy "attempt_answers: insert own"
  on public.attempt_answers for insert
  with check (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_answers.attempt_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "attempt_answers: update own" on public.attempt_answers;
create policy "attempt_answers: update own"
  on public.attempt_answers for update
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_answers.attempt_id
        and a.user_id = auth.uid()
    )
  );

-- ============================================================================
-- USER TOPIC PROGRESS — own row only
-- ============================================================================
drop policy if exists "user_topic_progress: read own" on public.user_topic_progress;
create policy "user_topic_progress: read own"
  on public.user_topic_progress for select
  using (auth.uid() = user_id);

drop policy if exists "user_topic_progress: insert own" on public.user_topic_progress;
create policy "user_topic_progress: insert own"
  on public.user_topic_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_topic_progress: update own" on public.user_topic_progress;
create policy "user_topic_progress: update own"
  on public.user_topic_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- WRITES TO CONTENT (grades/subjects/topics/questions/quizzes/images)
-- Service role only. The web app NEVER writes to these directly.
-- The admin uploads happen via service-role key in a separate ingestion script
-- (we'll build that in v1 commit 6).
-- ============================================================================
-- No policies = no anon/authenticated writes allowed. Service role bypasses RLS.

-- ============================================================================
-- STORAGE — for question images
-- Run this in SQL Editor AFTER creating a 'question-images' bucket in Storage.
-- ============================================================================
-- (We keep this here as documentation; the actual storage.objects policies
-- must reference the bucket name.)

-- create policy "question-images: public read"
--   on storage.objects for select
--   using (bucket_id = 'question-images');

-- create policy "question-images: service role write"
--   on storage.objects for insert
--   with check (bucket_id = 'question-images' and auth.role() = 'service_role');
