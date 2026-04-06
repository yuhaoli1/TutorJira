-- ============================================
-- 题目多维度标签系统
-- ============================================

-- 1. 标签维度（知识点、题型、解题思路、年级、难度等级...）
CREATE TABLE question_tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  allow_multiple BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 标签（每个维度下的具体标签）
CREATE TABLE question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES question_tag_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  parent_id UUID REFERENCES question_tags(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_question_tags_unique ON question_tags(category_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'));

-- 3. 题目↔标签 多对多关联
CREATE TABLE question_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES question_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, tag_id)
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_question_tags_category ON question_tags(category_id);
CREATE INDEX idx_question_tags_parent ON question_tags(parent_id);
CREATE INDEX idx_question_tag_links_question ON question_tag_links(question_id);
CREATE INDEX idx_question_tag_links_tag ON question_tag_links(tag_id);

-- ============================================
-- 自动更新 updated_at
-- ============================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON question_tag_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON question_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS 策略
-- ============================================
ALTER TABLE question_tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tag_links ENABLE ROW LEVEL SECURITY;

-- 所有人可读
CREATE POLICY "tag_categories_select" ON question_tag_categories FOR SELECT USING (true);
CREATE POLICY "tags_select" ON question_tags FOR SELECT USING (true);
CREATE POLICY "tag_links_select" ON question_tag_links FOR SELECT USING (true);

-- 老师/管理员可写
CREATE POLICY "tag_categories_insert" ON question_tag_categories FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "tag_categories_update" ON question_tag_categories FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "tag_categories_delete" ON question_tag_categories FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));

CREATE POLICY "tags_insert" ON question_tags FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "tags_update" ON question_tags FOR UPDATE
  USING (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "tags_delete" ON question_tags FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));

CREATE POLICY "tag_links_insert" ON question_tag_links FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'teacher'));
CREATE POLICY "tag_links_delete" ON question_tag_links FOR DELETE
  USING (get_user_role() IN ('admin', 'teacher'));

-- ============================================
-- 插入系统默认维度
-- ============================================
INSERT INTO question_tag_categories (name, slug, description, sort_order, allow_multiple, is_system) VALUES
  ('知识点', 'knowledge_point', '题目涉及的知识点', 0, true, true),
  ('题型', 'question_type', '题目类型（选择、填空、解答等）', 1, false, true),
  ('难度', 'difficulty', '难度等级', 2, false, true),
  ('解题思路', 'solution_approach', '可用的解题方法', 3, true, false),
  ('年级', 'grade', '适用年级', 4, true, false);

-- ============================================
-- 插入系统默认标签
-- ============================================

-- 题型标签
INSERT INTO question_tags (category_id, name, slug, sort_order) VALUES
  ((SELECT id FROM question_tag_categories WHERE slug = 'question_type'), '选择题', 'choice', 0),
  ((SELECT id FROM question_tag_categories WHERE slug = 'question_type'), '填空题', 'fill_blank', 1),
  ((SELECT id FROM question_tag_categories WHERE slug = 'question_type'), '解答题', 'solution', 2),
  ((SELECT id FROM question_tag_categories WHERE slug = 'question_type'), '判断题', 'true_false', 3),
  ((SELECT id FROM question_tag_categories WHERE slug = 'question_type'), '连线题', 'matching', 4);

-- 难度标签
INSERT INTO question_tags (category_id, name, slug, sort_order, metadata) VALUES
  ((SELECT id FROM question_tag_categories WHERE slug = 'difficulty'), '简单', '1', 0, '{"numeric_value": 1}'),
  ((SELECT id FROM question_tag_categories WHERE slug = 'difficulty'), '较简单', '2', 1, '{"numeric_value": 2}'),
  ((SELECT id FROM question_tag_categories WHERE slug = 'difficulty'), '中等', '3', 2, '{"numeric_value": 3}'),
  ((SELECT id FROM question_tag_categories WHERE slug = 'difficulty'), '较难', '4', 3, '{"numeric_value": 4}'),
  ((SELECT id FROM question_tag_categories WHERE slug = 'difficulty'), '困难', '5', 4, '{"numeric_value": 5}');

-- 年级标签
INSERT INTO question_tags (category_id, name, slug, sort_order) VALUES
  ((SELECT id FROM question_tag_categories WHERE slug = 'grade'), '一年级', 'grade_1', 0),
  ((SELECT id FROM question_tag_categories WHERE slug = 'grade'), '二年级', 'grade_2', 1),
  ((SELECT id FROM question_tag_categories WHERE slug = 'grade'), '三年级', 'grade_3', 2),
  ((SELECT id FROM question_tag_categories WHERE slug = 'grade'), '四年级', 'grade_4', 3),
  ((SELECT id FROM question_tag_categories WHERE slug = 'grade'), '五年级', 'grade_5', 4),
  ((SELECT id FROM question_tag_categories WHERE slug = 'grade'), '六年级', 'grade_6', 5);

-- ============================================
-- 迁移现有数据到标签系统
-- ============================================

-- 迁移 knowledge_topics → question_tags（知识点维度）
-- 先插入根节点
INSERT INTO question_tags (category_id, name, slug, sort_order, metadata)
SELECT
  (SELECT id FROM question_tag_categories WHERE slug = 'knowledge_point'),
  kt.title,
  kt.id::text,
  kt.sort_order,
  jsonb_build_object('legacy_topic_id', kt.id, 'subject', kt.subject)
FROM knowledge_topics kt
WHERE kt.parent_id IS NULL;

-- 再插入子节点
INSERT INTO question_tags (category_id, name, slug, parent_id, sort_order, metadata)
SELECT
  (SELECT id FROM question_tag_categories WHERE slug = 'knowledge_point'),
  child.title,
  child.id::text,
  parent_tag.id,
  child.sort_order,
  jsonb_build_object('legacy_topic_id', child.id, 'subject', child.subject)
FROM knowledge_topics child
JOIN question_tags parent_tag ON parent_tag.metadata->>'legacy_topic_id' = child.parent_id::text
  AND parent_tag.category_id = (SELECT id FROM question_tag_categories WHERE slug = 'knowledge_point')
WHERE child.parent_id IS NOT NULL;

-- 为现有题目创建标签关联
-- 关联知识点
INSERT INTO question_tag_links (question_id, tag_id)
SELECT q.id, qt.id
FROM questions q
JOIN question_tags qt ON qt.metadata->>'legacy_topic_id' = q.topic_id::text
  AND qt.category_id = (SELECT id FROM question_tag_categories WHERE slug = 'knowledge_point')
WHERE q.topic_id IS NOT NULL;

-- 关联题型
INSERT INTO question_tag_links (question_id, tag_id)
SELECT q.id, qt.id
FROM questions q
JOIN question_tags qt ON qt.slug = q.type::text
  AND qt.category_id = (SELECT id FROM question_tag_categories WHERE slug = 'question_type');

-- 关联难度
INSERT INTO question_tag_links (question_id, tag_id)
SELECT q.id, qt.id
FROM questions q
JOIN question_tags qt ON (qt.metadata->>'numeric_value')::int = q.difficulty
  AND qt.category_id = (SELECT id FROM question_tag_categories WHERE slug = 'difficulty');

-- 标记旧字段为已弃用（注释）
COMMENT ON COLUMN questions.topic_id IS 'DEPRECATED: use question_tag_links with knowledge_point category instead';
COMMENT ON COLUMN questions.type IS 'DEPRECATED: use question_tag_links with question_type category instead';
COMMENT ON COLUMN questions.difficulty IS 'DEPRECATED: use question_tag_links with difficulty category instead';
