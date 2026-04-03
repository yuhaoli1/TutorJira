-- ============================================
-- Phase 2: Task Collaboration Features
-- 1. Comments (评论/对话)
-- 2. Task-Question linking (关联题目)
-- 3. File attachments (附件)
-- 4. Labels/Tags (标签)
-- ============================================

-- ============================================
-- 1. Comments
-- ============================================
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_assignment ON task_comments(task_assignment_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_select" ON task_comments FOR SELECT
  USING (
    get_user_role() IN ('admin', 'teacher')
    OR task_assignment_id IN (
      SELECT ta.id FROM task_assignments ta WHERE ta.student_id IN (SELECT get_my_student_ids())
    )
  );

CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE
  USING (author_id = auth.uid());

-- ============================================
-- 2. Task-Question linking
-- ============================================
CREATE TABLE task_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, question_id)
);

CREATE INDEX idx_task_questions_task ON task_questions(task_id);

ALTER TABLE task_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_questions_select" ON task_questions FOR SELECT USING (TRUE);

CREATE POLICY "task_questions_insert" ON task_questions FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));

CREATE POLICY "task_questions_delete" ON task_questions FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));

-- ============================================
-- 3. File attachments
-- ============================================
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_attachments_assignment ON task_attachments(task_assignment_id);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select" ON task_attachments FOR SELECT
  USING (
    get_user_role() IN ('admin', 'teacher')
    OR task_assignment_id IN (
      SELECT ta.id FROM task_assignments ta WHERE ta.student_id IN (SELECT get_my_student_ids())
    )
  );

CREATE POLICY "task_attachments_insert" ON task_attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "task_attachments_delete" ON task_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR get_user_role() IN ('admin', 'teacher'));

-- ============================================
-- 4. Labels / Tags
-- ============================================
CREATE TABLE task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#B4BCC8',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_labels_select" ON task_labels FOR SELECT USING (TRUE);
CREATE POLICY "task_labels_insert" ON task_labels FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "task_labels_update" ON task_labels FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));

-- Junction table for task <-> label (many-to-many)
CREATE TABLE task_label_map (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

ALTER TABLE task_label_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_label_map_select" ON task_label_map FOR SELECT USING (TRUE);
CREATE POLICY "task_label_map_insert" ON task_label_map FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "task_label_map_delete" ON task_label_map FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));
