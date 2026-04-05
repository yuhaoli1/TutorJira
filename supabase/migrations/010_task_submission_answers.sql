-- 任务做题提交记录（学生可反复提交覆盖）
CREATE TABLE task_submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_assignment_id, question_id)
);

ALTER TABLE task_submission_answers ENABLE ROW LEVEL SECURITY;

-- 老师和本人可读
CREATE POLICY "task_submission_answers_select" ON task_submission_answers FOR SELECT
  USING (get_user_role() IN ('admin', 'teacher') OR
    task_assignment_id IN (
      SELECT id FROM task_assignments WHERE student_id IN (SELECT get_my_student_ids())
    ));

-- 学生可插入/更新自己的
CREATE POLICY "task_submission_answers_insert" ON task_submission_answers FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "task_submission_answers_update" ON task_submission_answers FOR UPDATE
  USING (TRUE);
CREATE POLICY "task_submission_answers_delete" ON task_submission_answers FOR DELETE
  USING (TRUE);

CREATE INDEX idx_task_submission_answers_assignment ON task_submission_answers(task_assignment_id);
