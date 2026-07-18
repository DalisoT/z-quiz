-- ============================================================================
-- 0003_seed.sql
-- Z-Quiz seed data — grades, G12 subjects, topics, sample MCQ questions,
-- and 2 working quizzes you can take right away.
-- ============================================================================
-- Paste this into the Supabase SQL Editor, then run.
-- Idempotent: uses ON CONFLICT DO NOTHING so re-running is safe.

-- ============================================================================
-- GRADES
-- ============================================================================
insert into public.grades (code, name, display_order) values
  ('G7',  'Grade 7',  1),
  ('G8',  'Grade 8',  2),
  ('G9',  'Grade 9',  3),
  ('G10', 'Grade 10', 4),
  ('G11', 'Grade 11', 5),
  ('G12', 'Grade 12', 6),
  ('GCE', 'GCE',      7)
on conflict (code) do nothing;

-- ============================================================================
-- G12 SUBJECTS — Mathematics + English (v1 focus)
-- ============================================================================
do $$
declare
  g12_id uuid;
  maths_id uuid;
  eng_id uuid;
  topic_id uuid;
  q_id uuid;
  quiz_id uuid;
begin
  select id into g12_id from public.grades where code = 'G12';

  -- Mathematics
  insert into public.subjects (grade_id, name, slug, icon, display_order)
  values (g12_id, 'Mathematics', 'mathematics', '➗', 1)
  on conflict (grade_id, slug) do update set icon = excluded.icon
  returning id into maths_id;

  -- English
  insert into public.subjects (grade_id, name, slug, icon, display_order)
  values (g12_id, 'English', 'english', '📖', 2)
  on conflict (grade_id, slug) do update set icon = excluded.icon
  returning id into eng_id;

  -- ==========================================================================
  -- MATHEMATICS TOPICS
  -- ==========================================================================
  insert into public.topics (subject_id, name, slug, display_order) values
    (maths_id, 'Algebra',              'algebra',              1),
    (maths_id, 'Calculus',             'calculus',             2),
    (maths_id, 'Trigonometry',         'trigonometry',         3),
    (maths_id, 'Statistics & Probability', 'statistics-probability', 4),
    (maths_id, 'Coordinate Geometry',  'coordinate-geometry',  5),
    (maths_id, 'Vectors & Mechanics',  'vectors-mechanics',    6)
  on conflict (subject_id, slug) do nothing;

  -- ==========================================================================
  -- ENGLISH TOPICS
  -- ==========================================================================
  insert into public.topics (subject_id, name, slug, display_order) values
    (eng_id, 'Comprehension',     'comprehension',     1),
    (eng_id, 'Summary Writing',   'summary-writing',   2),
    (eng_id, 'Composition',       'composition',       3),
    (eng_id, 'Grammar',           'grammar',           4),
    (eng_id, 'Literature',        'literature',        5),
    (eng_id, 'Oral English',      'oral-english',      6)
  on conflict (subject_id, slug) do nothing;

  -- ==========================================================================
  -- SAMPLE MCQ QUESTIONS — Mathematics / Algebra
  -- ==========================================================================
  select id into topic_id from public.topics where subject_id = maths_id and slug = 'algebra';

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    ('Solve for x:  2x + 5 = 13', 'Subtract 5 from both sides, then divide by 2.', 1, 'easy', 'ECZ', 'Paper 1', 2022),
    ('If f(x) = 2x² − 3x + 1, find f(2).', 'f(2) = 2(4) − 3(2) + 1 = 8 − 6 + 1 = 3', 1, 'easy', 'ECZ', 'Paper 1', 2021),
    ('Simplify (x² − 9) / (x − 3).', 'Factor the numerator: (x−3)(x+3). Cancel (x−3).', 1, 'medium', 'ECZ', 'Paper 1', 2020),
    ('Find the roots of x² − 5x + 6 = 0.', 'Factor: (x−2)(x−3) = 0, so x = 2 or x = 3.', 1, 'medium', 'ECZ', 'Paper 1', 2019)
  on conflict do nothing;

  -- Add options for each Algebra question (use the prompt as a poor-man's dedup,
  -- but since prompts are not unique we re-fetch by prompt + topic to be safe).
  for q_id in
    select id from public.questions
    where topic_id = (select id from public.topics where subject_id = maths_id and slug = 'algebra')
      and prompt in (
        'Solve for x:  2x + 5 = 13',
        'If f(x) = 2x² − 3x + 1, find f(2).',
        'Simplify (x² − 9) / (x − 3).',
        'Find the roots of x² − 5x + 6 = 0.'
      )
  loop
    -- Idempotency: skip if options already exist for this question
    if not exists (select 1 from public.question_options where question_id = q_id) then
      if q_id in (select id from public.questions where prompt = 'Solve for x:  2x + 5 = 13') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', '3', false, 1),
          (q_id, 'B', '4', true,  2),
          (q_id, 'C', '5', false, 3),
          (q_id, 'D', '6', false, 4);
      elsif q_id in (select id from public.questions where prompt = 'If f(x) = 2x² − 3x + 1, find f(2).') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', '1', false, 1),
          (q_id, 'B', '3', true,  2),
          (q_id, 'C', '5', false, 3),
          (q_id, 'D', '7', false, 4);
      elsif q_id in (select id from public.questions where prompt = 'Simplify (x² − 9) / (x − 3).') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'x − 3',   false, 1),
          (q_id, 'B', 'x + 3',   true,  2),
          (q_id, 'C', 'x² − 3',  false, 3),
          (q_id, 'D', 'x + 9',   false, 4);
      elsif q_id in (select id from public.questions where prompt = 'Find the roots of x² − 5x + 6 = 0.') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', '2 and 3',   true,  1),
          (q_id, 'B', '1 and 6',   false, 2),
          (q_id, 'C', '−2 and −3', false, 3),
          (q_id, 'D', '−1 and −6', false, 4);
      end if;
    end if;
  end loop;

  -- ==========================================================================
  -- SAMPLE MCQ QUESTIONS — Mathematics / Calculus
  -- ==========================================================================
  select id into topic_id from public.topics where subject_id = maths_id and slug = 'calculus';

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    ('Find dy/dx if y = 3x² + 2x.', 'Power rule: d/dx(axⁿ) = n·a·xⁿ⁻¹', 1, 'easy', 'ECZ', 'Paper 2', 2022),
    ('Evaluate ∫ 2x dx.', 'Antiderivative of 2x is x² + C.', 1, 'easy', 'ECZ', 'Paper 2', 2021),
    ('Find dy/dx if y = sin(x).', 'd/dx(sin x) = cos x.', 1, 'medium', 'ECZ', 'Paper 2', 2020)
  on conflict do nothing;

  for q_id in
    select id from public.questions
    where topic_id = (select id from public.topics where subject_id = maths_id and slug = 'calculus')
      and prompt in (
        'Find dy/dx if y = 3x² + 2x.',
        'Evaluate ∫ 2x dx.',
        'Find dy/dx if y = sin(x).'
      )
  loop
    if not exists (select 1 from public.question_options where question_id = q_id) then
      if q_id in (select id from public.questions where prompt = 'Find dy/dx if y = 3x² + 2x.') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', '6x + 2', true,  1),
          (q_id, 'B', '3x + 2', false, 2),
          (q_id, 'C', '6x² + 2', false, 3),
          (q_id, 'D', '6x',     false, 4);
      elsif q_id in (select id from public.questions where prompt = 'Evaluate ∫ 2x dx.') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'x² + C', true,  1),
          (q_id, 'B', '2x + C', false, 2),
          (q_id, 'C', 'x + C',  false, 3),
          (q_id, 'D', '2x² + C', false, 4);
      elsif q_id in (select id from public.questions where prompt = 'Find dy/dx if y = sin(x).') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'cos(x)',  true,  1),
          (q_id, 'B', '−cos(x)', false, 2),
          (q_id, 'C', '−sin(x)', false, 3),
          (q_id, 'D', 'tan(x)',  false, 4);
      end if;
    end if;
  end loop;

  -- ==========================================================================
  -- SAMPLE MCQ QUESTIONS — English / Grammar
  -- ==========================================================================
  select id into topic_id from public.topics where subject_id = eng_id and slug = 'grammar';

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    ('Choose the correct sentence.', '"She doesn''t know" is the correct third-person singular form.', 1, 'easy', 'ECZ', 'Paper 1', 2022),
    ('Identify the verb in: "The cat quickly ran across the yard."', '"Ran" is the action word (past tense of "run").', 1, 'easy', 'ECZ', 'Paper 1', 2021),
    ('Which sentence is in the passive voice?', 'Passive voice: subject receives the action ("was written").', 1, 'medium', 'ECZ', 'Paper 1', 2020)
  on conflict do nothing;

  for q_id in
    select id from public.questions
    where topic_id = (select id from public.topics where subject_id = eng_id and slug = 'grammar')
      and prompt in (
        'Choose the correct sentence.',
        'Identify the verb in: "The cat quickly ran across the yard."',
        'Which sentence is in the passive voice?'
      )
  loop
    if not exists (select 1 from public.question_options where question_id = q_id) then
      if q_id in (select id from public.questions where prompt = 'Choose the correct sentence.') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'She don''t know.',     false, 1),
          (q_id, 'B', 'She doesn''t knows.',  false, 2),
          (q_id, 'C', 'She doesn''t know.',   true,  3),
          (q_id, 'D', 'She not know.',        false, 4);
      elsif q_id in (select id from public.questions where prompt = 'Identify the verb in: "The cat quickly ran across the yard."') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'cat',     false, 1),
          (q_id, 'B', 'quickly', false, 2),
          (q_id, 'C', 'ran',     true,  3),
          (q_id, 'D', 'yard',    false, 4);
      elsif q_id in (select id from public.questions where prompt = 'Which sentence is in the passive voice?') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'The teacher praised the students.',  false, 1),
          (q_id, 'B', 'The students praised the teacher.',  false, 2),
          (q_id, 'C', 'The students were praised by the teacher.', true, 3),
          (q_id, 'D', 'The teacher is praising the students.', false, 4);
      end if;
    end if;
  end loop;

  -- ==========================================================================
  -- SAMPLE MCQ QUESTIONS — English / Comprehension
  -- ==========================================================================
  select id into topic_id from public.topics where subject_id = eng_id and slug = 'comprehension';

  insert into public.questions
    (topic_id, question_type, prompt, explanation, marks, difficulty, source_examiner, source_paper, source_year)
  values
    ('The word "ubiquitous" most nearly means:', 'Ubiquitous = present everywhere.', 1, 'medium', 'ECZ', 'Paper 2', 2022),
    ('What is the main purpose of reading a comprehension passage?', 'To test understanding of a given text.', 1, 'easy', 'ECZ', 'Paper 2', 2021)
  on conflict do nothing;

  for q_id in
    select id from public.questions
    where topic_id = (select id from public.topics where subject_id = eng_id and slug = 'comprehension')
      and prompt in (
        'The word "ubiquitous" most nearly means:',
        'What is the main purpose of reading a comprehension passage?'
      )
  loop
    if not exists (select 1 from public.question_options where question_id = q_id) then
      if q_id in (select id from public.questions where prompt = 'The word "ubiquitous" most nearly means:') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'rare',                false, 1),
          (q_id, 'B', 'present everywhere',  true,  2),
          (q_id, 'C', 'ancient',             false, 3),
          (q_id, 'D', 'hidden',              false, 4);
      elsif q_id in (select id from public.questions where prompt = 'What is the main purpose of reading a comprehension passage?') then
        insert into public.question_options (question_id, label, text, is_correct, display_order) values
          (q_id, 'A', 'To test vocabulary',              false, 1),
          (q_id, 'B', 'To test understanding of a text', true,  2),
          (q_id, 'C', 'To test grammar',                 false, 3),
          (q_id, 'D', 'To test spelling',                false, 4);
      end if;
    end if;
  end loop;

  -- ==========================================================================
  -- SAMPLE QUIZZES (published, ready to take)
  -- ==========================================================================

  -- Quiz 1: G12 Mathematics — Algebra Practice
  select id into topic_id from public.topics where subject_id = maths_id and slug = 'algebra';
  insert into public.quizzes (topic_id, title, description, time_limit_minutes, is_published)
  values (topic_id, 'Algebra — Quick Practice', '4 questions on basic G12 algebra.', 10, true)
  on conflict do nothing
  returning id into quiz_id;

  if quiz_id is not null then
    insert into public.quiz_questions (quiz_id, question_id, display_order)
    select quiz_id, q.id, row_number() over (order by q.created_at)
    from public.questions q
    where q.topic_id = topic_id
    on conflict do nothing;
  end if;

  -- Quiz 2: G12 English — Grammar Practice
  select id into topic_id from public.topics where subject_id = eng_id and slug = 'grammar';
  select id into quiz_id from public.quizzes
    where topic_id = (select id from public.topics where subject_id = eng_id and slug = 'grammar')
      and title = 'Grammar — Quick Practice';

  if quiz_id is null then
    insert into public.quizzes (topic_id, title, description, time_limit_minutes, is_published)
    values (topic_id, 'Grammar — Quick Practice', '3 questions on basic G12 English grammar.', 10, true)
    returning id into quiz_id;

    insert into public.quiz_questions (quiz_id, question_id, display_order)
    select quiz_id, q.id, row_number() over (order by q.created_at)
    from public.questions q
    where q.topic_id = topic_id
    on conflict do nothing;
  end if;

end $$;
