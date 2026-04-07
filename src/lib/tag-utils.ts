/**
 * Tag helpers — derive type / difficulty / etc. from the `tags` array.
 * Once legacy columns (questions.type, questions.difficulty, questions.topic_id)
 * are removed, components only need to call these helpers — no other changes.
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

/** Extract question-type slug (choice / fill_blank / solution / ...) from tags. */
export function getTypeFromTags(tags?: QuestionTag[]): string {
  if (!tags) return "solution";
  const tag = tags.find((t) => t.question_tag_categories?.slug === "question_type");
  return tag?.slug || "solution";
}

/** Extract difficulty value (1-5) from tags. */
export function getDifficultyFromTags(tags?: QuestionTag[]): number {
  if (!tags) return 3;
  const tag = tags.find((t) => t.question_tag_categories?.slug === "difficulty");
  return tag?.slug ? parseInt(tag.slug) || 3 : 3;
}

/** Extract knowledge-point names from tags. */
export function getKnowledgePointsFromTags(tags?: QuestionTag[]): string[] {
  if (!tags) return [];
  return tags
    .filter((t) => t.question_tag_categories?.slug === "knowledge_point")
    .map((t) => t.name);
}

/** Extract grade label from tags. */
export function getGradeFromTags(tags?: QuestionTag[]): string | null {
  if (!tags) return null;
  const tag = tags.find((t) => t.question_tag_categories?.slug === "grade");
  return tag?.name || null;
}
