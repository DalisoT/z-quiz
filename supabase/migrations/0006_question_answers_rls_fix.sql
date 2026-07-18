-- ============================================================================
-- 0006_question_answers_rls_fix.sql
-- Loosen RLS on question_answers so the user's session can read the expected
-- answer during quiz submission (needed for AI marking in v2).
--
-- Same security level as question_options (already public-read for active
-- questions). For production we'd move this read to a service-role call from
-- the server action, but for v1 this is the right balance of simplicity + safety.
-- ============================================================================
-- Paste into the Supabase SQL Editor and run.
-- Idempotent: drops existing policy before re-creating.

drop policy if exists "question_answers: no public read" on public.question_answers;

drop policy if exists "question_answers: read for active questions" on public.question_answers;
create policy "question_answers: read for active questions"
  on public.question_answers for select
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_answers.question_id
        and q.is_active = true
    )
  );
