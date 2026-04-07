import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const url = new URL(request.url);
    const subject = url.searchParams.get("subject");

    // Fetch all knowledge topics (optionally filtered by subject)
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

    // Build tree structure
    const topicMap = new Map<string, typeof topics[0] & { children: typeof topics }>();
    const roots: (typeof topics[0] & { children: typeof topics })[] = [];

    // Initialize all nodes
    for (const topic of topics || []) {
      topicMap.set(topic.id, { ...topic, children: [] });
    }

    // Build the tree
    for (const topic of topics || []) {
      const node = topicMap.get(topic.id)!;
      if (topic.parent_id && topicMap.has(topic.parent_id)) {
        topicMap.get(topic.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Fetch list of all subjects
    const { data: allTopics } = await supabase
      .from("knowledge_topics")
      .select("subject")
      .is("parent_id", null);

    const subjects = [...new Set((allTopics || []).map(t => t.subject))];

    return NextResponse.json({ topics: roots, subjects });
  } catch (error) {
    console.error("Failed to fetch knowledge topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge topics" },
      { status: 500 }
    );
  }
}
