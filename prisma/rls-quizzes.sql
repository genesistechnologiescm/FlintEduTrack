-- RLS for the quiz tables (run after `prisma db push`).
-- Helper is_school_staff exists from rls.sql. App reaches these via Prisma (owner,
-- bypasses RLS); these harden the anon/authenticated PostgREST surface.

revoke all on "Quiz" from anon;
revoke all on "QuizQuestion" from anon;
revoke all on "QuizAttempt" from anon;
grant select, insert, update, delete on "Quiz" to authenticated;
grant select, insert, update, delete on "QuizQuestion" to authenticated;
grant select, insert, update, delete on "QuizAttempt" to authenticated;

alter table "Quiz" enable row level security;
alter table "QuizQuestion" enable row level security;
alter table "QuizAttempt" enable row level security;

-- Quizzes: staff manage their school's; any authenticated user may read (quiz
-- content is not PII; students rely on the server's Prisma path regardless).
create policy quiz_staff on "Quiz" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy quiz_read on "Quiz" for select to authenticated using ( true );

create policy quizq_staff on "QuizQuestion" for all to authenticated
  using ( exists (select 1 from "Quiz" q where q.id = "QuizQuestion"."quizId" and is_school_staff(q."schoolId")) )
  with check ( exists (select 1 from "Quiz" q where q.id = "QuizQuestion"."quizId" and is_school_staff(q."schoolId")) );
create policy quizq_read on "QuizQuestion" for select to authenticated using ( true );

-- Attempts: staff of the school manage; the owning student reads/writes their own
-- (auth.uid() is the StudentAccount id → map to the student).
create policy quiza_staff on "QuizAttempt" for all to authenticated
  using ( is_school_staff("schoolId") ) with check ( is_school_staff("schoolId") );
create policy quiza_student on "QuizAttempt" for all to authenticated
  using ( exists (select 1 from "StudentAccount" sa where sa.id = auth.uid()::text and sa."studentId" = "QuizAttempt"."studentId") )
  with check ( exists (select 1 from "StudentAccount" sa where sa.id = auth.uid()::text and sa."studentId" = "QuizAttempt"."studentId") );
