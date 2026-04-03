-- ============================================
-- Phase 1: Task Enhancements
-- 1. Priority levels (紧急/高/中/低)
-- 2. Activity log (操作记录)
-- ============================================

-- Priority enum
CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'medium', 'low');

-- Add priority to tasks
ALTER TABLE tasks ADD COLUMN priority task_priority NOT NULL DEFAULT 'medium';
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Add priority to recurring templates too
ALTER TABLE recurring_task_templates ADD COLUMN priority task_priority NOT NULL DEFAULT 'medium';

-- ============================================
-- Activity Log table
-- ============================================
CREATE TABLE task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,        -- 'created', 'status_change', 'note_added', 'result_recorded', 'priority_changed'
  old_value TEXT,
  new_value TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_assignment ON task_activity_log(task_assignment_id);
CREATE INDEX idx_activity_log_created ON task_activity_log(created_at);

-- RLS
ALTER TABLE task_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select" ON task_activity_log FOR SELECT
  USING (
    get_user_role() IN ('admin', 'teacher')
    OR task_assignment_id IN (
      SELECT ta.id FROM task_assignments ta WHERE ta.student_id IN (SELECT get_my_student_ids())
    )
  );

CREATE POLICY "activity_log_insert" ON task_activity_log FOR INSERT
  WITH CHECK (TRUE);  -- 所有登录用户都可以产生活动记录
