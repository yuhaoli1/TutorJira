-- ============================================
-- 题库功能：扩展题目类型 + 上传表
-- ============================================

-- 添加 'solution' 到 question_type 枚举
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'solution';

-- ============================================
-- 题目上传表
-- ============================================
CREATE TABLE question_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'image')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ai_provider TEXT,
  extracted_questions JSONB,
  question_count INT DEFAULT 0,
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 questions 表添加来源字段
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_file_url TEXT;

-- 自动更新 updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON question_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS 策略
-- ============================================
ALTER TABLE question_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_uploads_select" ON question_uploads FOR SELECT
  USING (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "question_uploads_insert" ON question_uploads FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "question_uploads_update" ON question_uploads FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "question_uploads_delete" ON question_uploads FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));

-- questions 表添加删除策略（之前没有）
CREATE POLICY "questions_delete" ON questions FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_question_uploads_created_by ON question_uploads(created_by);
CREATE INDEX idx_question_uploads_status ON question_uploads(status);
CREATE INDEX idx_questions_source_type ON questions(source_type);

-- ============================================
-- Storage bucket（需在 Supabase Dashboard 手动创建或通过 API）
-- ============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('question-uploads', 'question-uploads', false);
