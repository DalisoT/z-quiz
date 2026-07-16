-- ============================================================================
-- 0001_initial_schema.sql
-- Z-Quiz core schema
-- ============================================================================
-- Paste this into the Supabase SQL Editor, then run.
-- Idempotent: safe to re-run.

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- ENUM-like CHECK constraints (text + check for portability)
-- ----------------------------------------------------------------------------

-- ============================================================================
-- GRADES
-- ============================================================================
create table if not exists public.grades (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,            -- 'G7', 'G8', ..., 'G12', 'GCE'
  name          text not null,                   -- 'Grade 7', 'Grade 12', 'GCE'
  display_order int  not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_grades_updated_at on public.grades;
create trigger trg_grades_updated_at
  before update on public.grades
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SUBJECTS
-- ============================================================================
create table if not exists public.subjects (
  id            uuid primary key default gen_random_uuid(),
  grade_id      uuid not null references public.grades(id) on delete cascade,
  name          text not null,                   -- 'Mathematics'
  slug          text not null,                   -- 'mathematics'
  icon          text,                            -- emoji or icon name
  display_order int  not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(grade_id, slug)
);

create index if not exists idx_subjects_grade_id on public.subjects(grade_id);

drop trigger if exists trg_subjects_updated_at on public.subjects;
create trigger trg_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TOPICS
-- ============================================================================
create table if not exists public.topics (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects(id) on delete cascade,
  name          text not null,                   -- 'Differentiation'
  slug          text not null,
  display_order int  not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(subject_id, slug)
);

create index if not exists idx_topics_subject_id on public.topics(subject_id);

drop trigger if exists trg_topics_updated_at on public.topics;
create trigger trg_topics_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

-- ============================================================================
-- QUESTION IMAGES (diagrams / figures stored in Supabase Storage)
-- ============================================================================
create table if not exists public.question_images (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,                    -- path inside Supabase Storage bucket
  alt_text     text,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- QUESTIONS
-- ============================================================================
create table if not exists public.questions (
  id              uuid primary key default gen_random_uuid(),
  topic_id        uuid not null references public.topics(id) on delete cascade,
  question_type   text not null check (question_type in ('mcq', 'short_answer', 'essay', 'equation')),
  prompt          text not null,                  -- The question text
  explanation     text,                           -- Shown after answering
  marks           int  not null default 1 check (marks > 0),
  difficulty      text check (difficulty in ('easy', 'medium', 'hard')),
  source_year     int,                            -- Metadata: which year paper
  source_paper    text,                           -- 'Paper 1', 'Paper 2'
  source_examiner text,                           -- 'ECZ', 'UNZA', etc.
  image_id        uuid references public.question_images(id) on delete set null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_questions_topic_id on public.questions(topic_id);
create index if not exists idx_questions_type     on public.questions(question_type);
create index if not exists idx_questions_active   on public.questions(is_active) where is_active = true;

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- MCQ OPTIONS
-- ============================================================================
create table if not exists public.question_options (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.questions(id) on delete cascade,
  label         text not null,                    -- 'A', 'B', 'C', 'D'
  text          text not null,
  is_correct    boolean not null default false,
  display_order int  not null,
  unique(question_id, label)
);

create index if not exists idx_question_options_question_id on public.question_options(question_id);

-- ============================================================================
-- EXPECTED ANSWERS (for short_answer / essay / equation; used by AI marking v2)
-- ============================================================================
create table if not exists public.question_answers (
  id                    uuid primary key default gen_random_uuid(),
  question_id           uuid not null references public.questions(id) on delete cascade,
  expected_answer       text not null,
  marking_notes         text,                       -- For AI marking v2
  acceptable_variations text[],                     -- Synonyms / acceptable forms
  is_primary            boolean not null default true,
  created_at            timestamptz not null default now()
);

create index if not exists idx_question_answers_question_id on public.question_answers(question_id);

-- ============================================================================
-- QUIZZES (a collection of questions — e.g., "G12 Maths 2022 P1")
-- ============================================================================
create table if not exists public.quizzes (
  id                uuid primary key default gen_random_uuid(),
  topic_id          uuid not null references public.topics(id) on delete cascade,
  title             text not null,
  description       text,
  time_limit_minutes int,                          -- null = untimed
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_quizzes_topic_id     on public.quizzes(topic_id);
create index if not exists idx_quizzes_published    on public.quizzes(is_published) where is_published = true;

drop trigger if exists trg_quizzes_updated_at on public.quizzes;
create trigger trg_quizzes_updated_at
  before update on public.quizzes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- QUIZ ↔ QUESTION (many-to-many, with order)
-- ============================================================================
create table if not exists public.quiz_questions (
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  display_order  int  not null,
  primary key (quiz_id, question_id)
);

create index if not exists idx_quiz_questions_quiz_id     on public.quiz_questions(quiz_id);
create index if not exists idx_quiz_questions_question_id on public.quiz_questions(question_id);

-- ============================================================================
-- USER PROFILES (extends auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  grade_code    text,                              -- Preferred grade (e.g., 'G12')
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- QUIZ ATTEMPTS
-- ============================================================================
create table if not exists public.quiz_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  quiz_id         uuid not null references public.quizzes(id) on delete cascade,
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  total_marks     int,
  marks_obtained  numeric(6,2),
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'submitted', 'graded'))
);

create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts(user_id);
create index if not exists idx_quiz_attempts_quiz_id on public.quiz_attempts(quiz_id);

-- ============================================================================
-- ATTEMPT ANSWERS
-- ============================================================================
create table if not exists public.attempt_answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id         uuid not null references public.questions(id) on delete cascade,
  selected_option_id  uuid references public.question_options(id),   -- for MCQ
  text_answer         text,                                          -- for short/essay
  image_storage_path  text,                                          -- for handwritten
  is_correct          boolean,
  marks_awarded       numeric(6,2),
  marked_by           text check (marked_by in ('auto', 'ai', 'human')),
  created_at          timestamptz not null default now()
);

create index if not exists idx_attempt_answers_attempt_id  on public.attempt_answers(attempt_id);
create index if not exists idx_attempt_answers_question_id on public.attempt_answers(question_id);

-- ============================================================================
-- USER TOPIC PROGRESS (denormalized for fast dashboard)
-- ============================================================================
create table if not exists public.user_topic_progress (
  user_id              uuid not null references auth.users(id) on delete cascade,
  topic_id             uuid not null references public.topics(id) on delete cascade,
  attempts_count       int  not null default 0,
  total_score          numeric(8,2) not null default 0,
  max_possible_score   numeric(8,2) not null default 0,
  last_attempt_at      timestamptz,
  primary key (user_id, topic_id)
);

-- ============================================================================
-- Comments
-- ============================================================================
comment on table public.grades                 is 'Grade levels (G7-G12, GCE)';
comment on table public.subjects               is 'Subjects within a grade (Mathematics, English, ...)';
comment on table public.topics                 is 'Topics within a subject (Algebra, Differentiation, ...)';
comment on table public.questions              is 'Question bank — supports MCQ, short_answer, essay, equation';
comment on table public.question_options       is 'MCQ options (A/B/C/D)';
comment on table public.question_answers       is 'Expected answers for non-MCQ questions; used by AI marking v2';
comment on table public.quizzes                is 'A published collection of questions (e.g., 2022 ECZ Maths P1)';
comment on table public.quiz_attempts          is 'A user taking a quiz';
comment on table public.attempt_answers        is 'A user answer to a question during an attempt';
comment on table public.profiles               is 'Public profile data, extends auth.users';
comment on table public.user_topic_progress    is 'Cached per-topic progress for fast dashboard rendering';
