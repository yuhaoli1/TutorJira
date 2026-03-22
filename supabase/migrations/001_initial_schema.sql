-- 创建自定义枚举类型
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'parent', 'student');
CREATE TYPE checkin_frequency AS ENUM ('daily', 'weekly');
CREATE TYPE task_type AS ENUM ('dictation', 'recitation', 'correction', 'homework', 'other');
CREATE TYPE task_assignment_status AS ENUM ('pending', 'submitted', 'confirmed', 'rejected');
CREATE TYPE question_type AS ENUM ('choice', 'fill_blank');

-- ============================================
-- 用户表（扩展 Supabase Auth）
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 学生表（独立于用户表，小孩可能没有账号）
-- ============================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 家长-学生关联表
-- ============================================
CREATE TABLE parent_student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  UNIQUE(parent_id, student_id)
);

-- ============================================
-- 打卡项目
-- ============================================
CREATE TABLE checkin_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  frequency checkin_frequency NOT NULL DEFAULT 'daily',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 打卡记录
-- ============================================
CREATE TABLE checkin_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_item_id UUID NOT NULL REFERENCES checkin_items(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  checked_by UUID NOT NULL REFERENCES users(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL,
  note TEXT,
  UNIQUE(checkin_item_id, student_id, date) -- 同一天同一项目同一学生只能打卡一次
);

-- ============================================
-- 任务
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type task_type NOT NULL DEFAULT 'other',
  due_date TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 任务指派
-- ============================================
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status task_assignment_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, student_id)
);

-- ============================================
-- 知识点（树形结构）
-- ============================================
CREATE TABLE knowledge_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  sort_order INT NOT NULL DEFAULT 0,
  subject TEXT NOT NULL DEFAULT '奥数',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 题目
-- ============================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  type question_type NOT NULL,
  content JSONB NOT NULL, -- { stem, options?, answer, explanation? }
  difficulty INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 做题记录
-- ============================================
CREATE TABLE question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_seconds INT
);

-- ============================================
-- 自动更新 updated_at 的触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有有 updated_at 的表添加触发器
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON checkin_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON task_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON knowledge_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;

-- 辅助函数：获取当前用户角色
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 辅助函数：获取当前家长绑定的学生 ID 列表
CREATE OR REPLACE FUNCTION get_my_student_ids()
RETURNS SETOF UUID AS $$
  SELECT student_id FROM parent_student WHERE parent_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users 策略
CREATE POLICY "users_select" ON users FOR SELECT USING (TRUE); -- 所有登录用户可查看
CREATE POLICY "users_update_self" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert_self" ON users FOR INSERT WITH CHECK (id = auth.uid()); -- 用户只能创建自己的 profile

-- students 策略
CREATE POLICY "students_select_admin_teacher" ON students FOR SELECT
  USING (get_user_role() IN ('admin', 'teacher') OR id IN (SELECT get_my_student_ids()));
CREATE POLICY "students_insert" ON students FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher', 'parent'));
CREATE POLICY "students_update" ON students FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher') OR id IN (SELECT get_my_student_ids()));

-- parent_student 策略
CREATE POLICY "parent_student_select" ON parent_student FOR SELECT
  USING (parent_id = auth.uid() OR get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "parent_student_insert" ON parent_student FOR INSERT
  WITH CHECK (parent_id = auth.uid() OR get_user_role() IN ('admin', 'teacher'));

-- checkin_items 策略
CREATE POLICY "checkin_items_select" ON checkin_items FOR SELECT USING (TRUE);
CREATE POLICY "checkin_items_insert" ON checkin_items FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "checkin_items_update" ON checkin_items FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));

-- checkin_records 策略
CREATE POLICY "checkin_records_select" ON checkin_records FOR SELECT
  USING (get_user_role() IN ('admin', 'teacher') OR student_id IN (SELECT get_my_student_ids()));
CREATE POLICY "checkin_records_insert" ON checkin_records FOR INSERT
  WITH CHECK (checked_by = auth.uid());

-- tasks 策略
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (TRUE);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));

-- task_assignments 策略
CREATE POLICY "task_assignments_select" ON task_assignments FOR SELECT
  USING (get_user_role() IN ('admin', 'teacher') OR student_id IN (SELECT get_my_student_ids()));
CREATE POLICY "task_assignments_insert" ON task_assignments FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "task_assignments_update" ON task_assignments FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher') OR student_id IN (SELECT get_my_student_ids()));

-- knowledge_topics 策略（所有人可读）
CREATE POLICY "knowledge_topics_select" ON knowledge_topics FOR SELECT USING (TRUE);
CREATE POLICY "knowledge_topics_insert" ON knowledge_topics FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "knowledge_topics_update" ON knowledge_topics FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));

-- questions 策略（所有人可读）
CREATE POLICY "questions_select" ON questions FOR SELECT USING (TRUE);
CREATE POLICY "questions_insert" ON questions FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "questions_update" ON questions FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));

-- question_attempts 策略
CREATE POLICY "question_attempts_select" ON question_attempts FOR SELECT
  USING (get_user_role() IN ('admin', 'teacher') OR student_id IN (SELECT get_my_student_ids()));
CREATE POLICY "question_attempts_insert" ON question_attempts FOR INSERT
  WITH CHECK (TRUE); -- 学生做题时通过 API 层控制

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_parent_student_parent ON parent_student(parent_id);
CREATE INDEX idx_parent_student_student ON parent_student(student_id);
CREATE INDEX idx_checkin_records_date ON checkin_records(date);
CREATE INDEX idx_checkin_records_student ON checkin_records(student_id);
CREATE INDEX idx_task_assignments_student ON task_assignments(student_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_question_attempts_student ON question_attempts(student_id);
CREATE INDEX idx_knowledge_topics_parent ON knowledge_topics(parent_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
