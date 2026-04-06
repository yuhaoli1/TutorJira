/**
 * 标签工具函数 — 从 tags 数组推导出 type / difficulty 等字段
 * 当旧字段 (questions.type, questions.difficulty, questions.topic_id) 被删除后，
 * 组件只需调用这些函数即可，无需任何改动。
 */

export interface QuestionTag {
  id: string;
  name: string;
  slug: string | null;
  category_id: string;
  question_tag_categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/** 从标签数组中提取题型 slug（choice / fill_blank / solution 等） */
export function getTypeFromTags(tags?: QuestionTag[]): string {
  if (!tags) return "solution";
  const tag = tags.find((t) => t.question_tag_categories?.slug === "question_type");
  return tag?.slug || "solution";
}

/** 从标签数组中提取难度数值 (1-5) */
export function getDifficultyFromTags(tags?: QuestionTag[]): number {
  if (!tags) return 3;
  const tag = tags.find((t) => t.question_tag_categories?.slug === "difficulty");
  return tag?.slug ? parseInt(tag.slug) || 3 : 3;
}

/** 从标签数组中提取知识点名称列表 */
export function getKnowledgePointsFromTags(tags?: QuestionTag[]): string[] {
  if (!tags) return [];
  return tags
    .filter((t) => t.question_tag_categories?.slug === "knowledge_point")
    .map((t) => t.name);
}

/** 从标签数组中提取年级标签 */
export function getGradeFromTags(tags?: QuestionTag[]): string | null {
  if (!tags) return null;
  const tag = tags.find((t) => t.question_tag_categories?.slug === "grade");
  return tag?.name || null;
}
