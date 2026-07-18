-- ============================================================================
-- 0008_seed_equation.sql
-- v3 sample: a few "equation" questions (handwritten upload + vision mark)
-- plus one equation quiz to demo the flow.
-- ============================================================================
-- Paste into the Supabase SQL Editor and run.
-- Idempotent: cleanup at the top + ON CONFLICT DO NOTHING.

do $$
declare
  v_topic_id uuid;
  quiz_id uuid;
  algebra_id uuid;
  calculus_id uuid;
  maths_id uuid;
begin
  -- --------------------------------------------------------------------------
  -- CLEANUP
  -- --------------------------------------------------------------------------
  delete from public.quizzes where title = 'Algebra — Handwritten Practice';
  delete from public.questions
  where prompt in (
    'Solve for x:  2x + 3 = 11. Show your working.',
    'Differentiate y = x² + 4x with respect to x. Show your working.',
    'A car travels 120 km in 2 hours, then 80 km in 1 hour. Find the average speed for the whole journey. Show your working.'
  );

  --------------------------------------------------------------------------
  -- Topic IDs
  --------------------------------------------------------------------------
  select id into maths_id    from public.subjects where slug = 'mathematics' limit 1;
  select id into algebra_id  from public.topics   where subject_id = maths_id and slug = 'algebra'   limit 1;
  select id into calculus_id from public.topics   where subject_id = maths_id and slug = 'calculus'  limit 1;

  -- --------------------------------------------------------------------------
  -- EQUATION QUESTIONS — Mathematics / Algebra
  -- --------------------------------------------------------------------------
  v_topic_id := algebra_id;

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    (v_topic_id, 'equation', 'Solve for x:  2x + 3 = 11. Show your working.',
     'x = 4. Work: subtract 3 from both sides (2x = 8), then divide by 2.',
     2, 'easy', 'ECZ', 'Paper 1', 2022),
    (v_topic_id, 'equation', 'A car travels 120 km in 2 hours, then 80 km in 1 hour. Find the average speed for the whole journey. Show your working.',
     'Total distance = 200 km, total time = 3 h, average speed = 200/3 ≈ 66.67 km/h.',
     3, 'medium', 'ECZ', 'Paper 1', 2020)
  on conflict do nothing;

  insert into public.question_answers (question_id, expected_answer, marking_notes, is_primary)
  select q.id, 'x = 4 (with working: 2x = 8, then x = 4)', 'Award 1 mark for the correct method (subtract 3, divide by 2). Award 2 marks for the correct final value x = 4.', true
  from public.questions q
  where q.topic_id = v_topic_id
    and q.prompt = 'Solve for x:  2x + 3 = 11. Show your working.'
    and not exists (select 1 from public.question_answers a where a.question_id = q.id);

  insert into public.question_answers (question_id, expected_answer, marking_notes, is_primary)
  select q.id, 'Average speed = 200 / 3 ≈ 66.67 km/h', 'Award 1 mark for total distance 200 km, 1 mark for total time 3 h, 1 mark for the correct final answer ≈66.67 km/h (or 66⅔ km/h, or 200/3 km/h).', true
  from public.questions q
  where q.topic_id = v_topic_id
    and q.prompt = 'A car travels 120 km in 2 hours, then 80 km in 1 hour. Find the average speed for the whole journey. Show your working.'
    and not exists (select 1 from public.question_answers a where a.question_id = q.id);

  -- --------------------------------------------------------------------------
  -- EQUATION QUESTIONS — Mathematics / Calculus
  -- --------------------------------------------------------------------------
  v_topic_id := calculus_id;

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    (v_topic_id, 'equation', 'Differentiate y = x² + 4x with respect to x. Show your working.',
     'dy/dx = 2x + 4. Power rule: d/dx(xⁿ) = nxⁿ⁻¹.',
     2, 'easy', 'ECZ', 'Paper 2', 2022)
  on conflict do nothing;

  insert into public.question_answers (question_id, expected_answer, marking_notes, is_primary)
  select q.id, 'dy/dx = 2x + 4 (with power rule applied: 2x + 4)', 'Award 1 mark for applying the power rule correctly to each term. Award 2 marks for the correct final answer 2x + 4.', true
  from public.questions q
  where q.topic_id = v_topic_id
    and q.prompt = 'Differentiate y = x² + 4x with respect to x. Show your working.'
    and not exists (select 1 from public.question_answers a where a.question_id = q.id);

  -- --------------------------------------------------------------------------
  -- SAMPLE EQUATION QUIZ
  -- --------------------------------------------------------------------------
  v_topic_id := algebra_id;

  if not exists (
    select 1 from public.quizzes
    where public.quizzes.topic_id = v_topic_id
      and title = 'Algebra — Handwritten Practice'
  ) then
    insert into public.quizzes (topic_id, title, description, time_limit_minutes, is_published)
    values (v_topic_id, 'Algebra — Handwritten Practice', '2 questions — snap a photo of your working, vision-AI marks it.', 15, true)
    returning id into quiz_id;

    insert into public.quiz_questions (quiz_id, question_id, display_order)
    select quiz_id, q.id, row_number() over (order by q.created_at)
    from public.questions q
    where q.topic_id = v_topic_id
      and q.question_type = 'equation'
    on conflict do nothing;
  end if;

end $$;
