import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { PracticeHub } from "@/components/practice/practice-hub";

export default async function PracticePage() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  // All three reads are independent — fetch in parallel
  const [
    { data: student },
    { data: knowledgeTags },
    { data: tagLinks },
  ] = await Promise.all([
    supabase.from("students").select("id").eq("user_id", user.id).single(),
    supabase
      .from("question_tags")
      .select(
        "id, name, slug, parent_id, sort_order, metadata, category_id, question_tag_categories(slug)"
      )
      .order("sort_order", { ascending: true }),
    supabase.from("question_tag_links").select("tag_id"),
  ]);

  const kpTags = (knowledgeTags || []).filter(
    (t) => (t.question_tag_categories as unknown as { slug: string } | null)?.slug === "knowledge_point"
  );

  const tagQuestionCounts: Record<string, number> = {};
  tagLinks?.forEach((l) => {
    tagQuestionCounts[l.tag_id] = (tagQuestionCounts[l.tag_id] || 0) + 1;
  });

  // Build topic tree from knowledge point tags
  const topLevelTags = kpTags.filter((t) => !t.parent_id);
  const childTags = kpTags.filter((t) => t.parent_id);

  const topicTree = topLevelTags.map((parent) => {
    const children = childTags.filter((c) => c.parent_id === parent.id);
    const totalQuestions = children.reduce(
      (sum, c) => sum + (tagQuestionCounts[c.id] || 0),
      0
    ) + (tagQuestionCounts[parent.id] || 0);
    const subject = (parent.metadata as { subject?: string } | null)?.subject || "";
    return {
      id: parent.id,
      title: parent.name,
      parent_id: parent.parent_id,
      sort_order: parent.sort_order,
      subject,
      children: children.map((c) => ({
        id: c.id,
        title: c.name,
        parent_id: c.parent_id,
        sort_order: c.sort_order,
        subject: (c.metadata as { subject?: string } | null)?.subject || subject,
      })),
      totalQuestions,
    };
  });

  // Build topicQuestionCounts compatible map
  const topicQuestionCounts: Record<string, number> = tagQuestionCounts;

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Practice</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">Pick a topic to start practicing</p>
      <PracticeHub
        topicTree={topicTree}
        topicQuestionCounts={topicQuestionCounts}
        studentId={student?.id || ""}
      />
    </div>
  );
}
