import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const url = new URL(request.url);
    const subject = url.searchParams.get("subject");

    // 获取所有知识点（可按学科筛选）
    let query = supabase
      .from("knowledge_topics")
      .select("*")
      .order("sort_order", { ascending: true });

    if (subject) {
      query = query.eq("subject", subject);
    }

    const { data: topics, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 构建树形结构
    const topicMap = new Map<string, typeof topics[0] & { children: typeof topics }>();
    const roots: (typeof topics[0] & { children: typeof topics })[] = [];

    // 初始化所有节点
    for (const topic of topics || []) {
      topicMap.set(topic.id, { ...topic, children: [] });
    }

    // 构建树
    for (const topic of topics || []) {
      const node = topicMap.get(topic.id)!;
      if (topic.parent_id && topicMap.has(topic.parent_id)) {
        topicMap.get(topic.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // 获取所有学科列表
    const { data: allTopics } = await supabase
      .from("knowledge_topics")
      .select("subject")
      .is("parent_id", null);

    const subjects = [...new Set((allTopics || []).map(t => t.subject))];

    return NextResponse.json({ topics: roots, subjects });
  } catch (error) {
    console.error("获取知识点失败:", error);
    return NextResponse.json(
      { error: "获取知识点失败" },
      { status: 500 }
    );
  }
}
