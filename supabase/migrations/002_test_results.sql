-- ============================================
-- 抽测/默写成绩记录表
-- ============================================
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  total_questions INT NOT NULL,
  wrong_count INT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_results_assignment ON test_results(task_assignment_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON test_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_results_select" ON test_results FOR SELECT
  USING (
    get_user_role() IN ('admin', 'teacher')
    OR task_assignment_id IN (
      SELECT ta.id FROM task_assignments ta WHERE ta.student_id IN (SELECT get_my_student_ids())
    )
  );

CREATE POLICY "test_results_insert" ON test_results FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));

CREATE POLICY "test_results_update" ON test_results FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));

CREATE POLICY "test_results_delete" ON test_results FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));
