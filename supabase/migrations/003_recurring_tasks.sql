-- ============================================
-- 重复任务模板
-- ============================================
CREATE TYPE recurrence_type AS ENUM ('daily', 'weekly');

CREATE TABLE recurring_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type task_type NOT NULL DEFAULT 'other',
  recurrence_type recurrence_type NOT NULL DEFAULT 'daily',
  recurrence_days INT[], -- 周几重复 (1=周一..7=周日), daily 时为 NULL
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = 永不结束
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  student_ids UUID[] NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  last_generated_date DATE, -- 最后一次生成到哪天
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 在 tasks 表上添加关联字段，防止重复生成
ALTER TABLE tasks ADD COLUMN recurring_template_id UUID REFERENCES recurring_task_templates(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN recurring_date DATE;
CREATE UNIQUE INDEX idx_tasks_recurring_unique ON tasks(recurring_template_id, recurring_date) WHERE recurring_template_id IS NOT NULL;

-- 触发器
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recurring_task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 索引
CREATE INDEX idx_recurring_templates_active ON recurring_task_templates(is_active, last_generated_date);

-- RLS
ALTER TABLE recurring_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_templates_select" ON recurring_task_templates FOR SELECT
  USING (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "recurring_templates_insert" ON recurring_task_templates FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "recurring_templates_update" ON recurring_task_templates FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));
