-- ============================================================================
-- 0005_add_ai_reasoning.sql
-- Add columns to attempt_answers for storing AI marking reasoning + confidence.
-- ============================================================================
-- Paste into the Supabase SQL Editor and run.
-- Idempotent: ADD COLUMN IF NOT EXISTS.

alter table public.attempt_answers
  add column if not exists ai_reasoning  text,
  add column if not exists ai_confidence text
    check (ai_confidence is null or ai_confidence in ('high', 'medium', 'low'));

comment on column public.attempt_answers.ai_reasoning  is 'Free-text explanation returned by the AI marker (short_answer / essay).';
comment on column public.attempt_answers.ai_confidence is 'AI self-reported confidence: high | medium | low.';
