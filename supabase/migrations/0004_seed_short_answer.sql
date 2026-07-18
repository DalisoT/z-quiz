-- ============================================================================
-- 0004_seed_short_answer.sql
-- v2 sample: a few short_answer questions to demo AI marking,
-- plus 2 short-answer quizzes.
-- ============================================================================
-- Paste into the Supabase SQL Editor and run.
-- Idempotent: cleanup at the top + ON CONFLICT DO NOTHING make it re-runnable.

do $$
declare
  v_topic_id uuid;
  q_id uuid;
  quiz_id uuid;
  algebra_id uuid;
  comprehension_id uuid;
  maths_id uuid;
  eng_id uuid;
begin
  -- --------------------------------------------------------------------------
  -- CLEANUP
  -- --------------------------------------------------------------------------
  delete from public.quizzes
  where title in ('Algebra — Short Answer', 'Comprehension — Vocabulary');

  delete from public.questions
  where prompt in (
    'What is a polynomial? Give a brief definition.',
    'Solve for x: 3x + 7 = 22. Show your work or just the answer.',
    'Give ONE synonym for the word "happy".',
    'In one sentence, what is the function of red blood cells?'
  );

  --------------------------------------------------------------------------
  -- Topic IDs (we need them to attach questions)
  --------------------------------------------------------------------------
  select id into maths_id         from public.subjects where slug = 'mathematics' limit 1;
  select id into eng_id           from public.subjects where slug = 'english'     limit 1;
  select id into algebra_id       from public.topics   where subject_id = maths_id and slug = 'algebra'       limit 1;
  select id into comprehension_id from public.topics   where subject_id = eng_id   and slug = 'comprehension' limit 1;

  -- --------------------------------------------------------------------------
  -- SHORT-ANSWER QUESTIONS — Mathematics / Algebra
  -- --------------------------------------------------------------------------
  v_topic_id := algebra_id;

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    (v_topic_id, 'short_answer', 'What is a polynomial? Give a brief definition.',
     'A polynomial is an algebraic expression made of variables and coefficients combined using addition, subtraction, and multiplication, with non-negative integer exponents on the variables.',
     2, 'easy', 'ECZ', 'Paper 1', 2022),
    (v_topic_id, 'short_answer', 'Solve for x: 3x + 7 = 22. Show your work or just the answer.',
     'x = 5. Work: subtract 7 from both sides (3x = 15), then divide by 3.',
     1, 'easy', 'ECZ', 'Paper 1', 2021)
  on conflict do nothing;

  insert into public.question_answers (question_id, expected_answer, marking_notes, is_primary)
  select q.id, 'An expression made of variables and coefficients combined with +, −, ×, and non-negative integer exponents.', 'Award 1 mark for "variable + coefficient + non-negative integer exponents"; award 2 marks if the student also mentions addition, subtraction, or multiplication.', true
  from public.questions q
  where q.topic_id = v_topic_id
    and q.prompt = 'What is a polynomial? Give a brief definition.'
    and not exists (
      select 1 from public.question_answers a where a.question_id = q.id
    );

  insert into public.question_answers (question_id, expected_answer, marking_notes, is_primary)
  select q.id, 'x = 5', 'Accept "5" alone, or "x = 5", or the full working. Full mark for the correct value.', true
  from public.questions q
  where q.topic_id = v_topic_id
    and q.prompt = 'Solve for x: 3x + 7 = 22. Show your work or just the answer.'
    and not exists (
      select 1 from public.question_answers a where a.question_id = q.id
    );

  -- --------------------------------------------------------------------------
  -- SHORT-ANSWER QUESTIONS — English / Comprehension
  -- --------------------------------------------------------------------------
  v_topic_id := comprehension_id;

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    (v_topic_id, 'short_answer', 'Give ONE synonym for the word "happy".',
     'Many valid answers: joyful, glad, cheerful, delighted, elated, content, pleased, merry, jubilant.',
     1, 'easy', 'ECZ', 'Paper 2', 2022),
    (v_topic_id, 'short_answer', 'In one sentence, what is the function of red blood cells?',
     'Red blood cells (erythrocytes) carry oxygen from the lungs to the body''s tissues and return carbon dioxide to the lungs.',
     2, 'medium', 'ECZ', 'Paper 2', 2021)
  on conflict do nothing;

  insert into public.question_answers (question_id, expected_answer, marking_notes, acceptable_variations, is_primary)
  select q.id,
         'A word meaning the same as "happy" — e.g. joyful, glad, cheerful, delighted, elated, content.',
         'Any clear synonym accepted. Common misspellings (e.g. "joyfull") still count if the meaning is obvious.',
         array['joyful','glad','cheerful','delighted','elated','content','pleased','merry','jubilant'],
         true
  from public.questions q
  where q.topic_id = v_topic_id
    and q.prompt = 'Give ONE synonym for the word "happy".'
    and not exists (
      select 1 from public.question_answers a where a.question_id = q.id
    );

  insert into public.question_answers (question_id, expected_answer, marking_notes, is_primary)
  select q.id,
         'To carry oxygen from the lungs to the body''s tissues (and bring carbon dioxide back).',
         'Award 1 mark for mentioning oxygen; award 2 marks if transport + from lungs/to body is included.',
         true
  from public.questions q
  where q.topic_id = v_topic_id
    and q.prompt = 'In one sentence, what is the function of red blood cells?'
    and not exists (
      select 1 from public.question_answers a where a.question_id = q.id
    );

  -- --------------------------------------------------------------------------
  -- SAMPLE SHORT-ANSWER QUIZZES
  -- --------------------------------------------------------------------------

  -- Quiz 3: Algebra — Short Answer
  v_topic_id := algebra_id;

  if not exists (
    select 1 from public.quizzes
    where public.quizzes.topic_id = v_topic_id
      and title = 'Algebra — Short Answer'
  ) then
    insert into public.quizzes (topic_id, title, description, time_limit_minutes, is_published)
    values (v_topic_id, 'Algebra — Short Answer', '2 short-answer questions on algebra basics. AI-marked.', 10, true)
    returning id into quiz_id;

    insert into public.quiz_questions (quiz_id, question_id, display_order)
    select quiz_id, q.id, row_number() over (order by q.created_at)
    from public.questions q
    where q.topic_id = v_topic_id
      and q.question_type = 'short_answer'
    on conflict do nothing;
  end if;

  -- Quiz 4: Comprehension — Vocabulary
  v_topic_id := comprehension_id;

  if not exists (
    select 1 from public.quizzes
    where public.quizzes.topic_id = v_topic_id
      and title = 'Comprehension — Vocabulary'
  ) then
    insert into public.quizzes (topic_id, title, description, time_limit_minutes, is_published)
    values (v_topic_id, 'Comprehension — Vocabulary', '1 short-answer question (synonym) + the existing MCQ questions.', 8, true)
    returning id into quiz_id;

    -- Add the short-answer question first
    insert into public.quiz_questions (quiz_id, question_id, display_order)
    select quiz_id, q.id, 1
    from public.questions q
    where q.topic_id = v_topic_id
      and q.prompt = 'Give ONE synonym for the word "happy".'
    on conflict do nothing;

    -- Then the existing MCQ questions
    insert into public.quiz_questions (quiz_id, question_id, display_order)
    select quiz_id, q.id, 10 + row_number() over (order by q.created_at)
    from public.questions q
    where q.topic_id = v_topic_id
      and q.question_type = 'mcq'
    on conflict do nothing;
  end if;

end $$;
