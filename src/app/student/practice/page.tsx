import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { PracticeHub } from "@/components/practice/practice-hub";

export default async function PracticePage() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  // Get student record
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();

  // Fetch knowledge topics (top-level only, with children count)
  const { data: topics } = await supabase
    .from("knowledge_topics")
    .select("id, title, parent_id, sort_order, subject")
    .order("sort_order", { ascending: true });

  // Fetch question counts per topic
  const { data: questions } = await supabase
    .from("questions")
    .select("topic_id");

  const topicQuestionCounts: Record<string, number> = {};
  questions?.forEach((q) => {
    topicQuestionCounts[q.topic_id] = (topicQuestionCounts[q.topic_id] || 0) + 1;
  });

  // Build topic tree
  const topLevelTopics = topics?.filter((t) => !t.parent_id) || [];
  const childTopics = topics?.filter((t) => t.parent_id) || [];

  const topicTree = topLevelTopics.map((parent) => {
    const children = childTopics.filter((c) => c.parent_id === parent.id);
    const totalQuestions = children.reduce(
      (sum, c) => sum + (topicQuestionCounts[c.id] || 0),
      0
    ) + (topicQuestionCounts[parent.id] || 0);
    return {
      ...parent,
      children,
      totalQuestions,
    };
  });

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">做题练习</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">选择知识点开始练习</p>
      <PracticeHub
        topicTree={topicTree}
        topicQuestionCounts={topicQuestionCounts}
        studentId={student?.id || ""}
      />
    </div>
  );
}
