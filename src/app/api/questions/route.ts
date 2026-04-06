import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/questions - 列表查询
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topic_id");
    const type = searchParams.get("type");
    const difficulty = searchParams.get("difficulty");
    const tagId = searchParams.get("tag_id");
    const ids = searchParams.getAll("ids");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "20");

    // If filtering by tag_id, first get question IDs from tag_links
    let tagFilteredIds: string[] | null = null;
    if (tagId) {
      const { data: links } = await supabase
        .from("question_tag_links")
        .select("question_id")
        .eq("tag_id", tagId);
      tagFilteredIds = (links || []).map((l) => l.question_id);
      if (tagFilteredIds.length === 0) {
        return NextResponse.json({ questions: [], total: 0, page, page_size: pageSize });
      }
    }

    let query = supabase
      .from("questions")
      .select("*, knowledge_topics(id, title)", { count: "exact" });

    // Fetch by specific IDs (for task-linked questions)
    if (ids.length > 0) {
      query = query.in("id", ids);
    } else {
      if (tagFilteredIds) {
        query = query.in("id", tagFilteredIds);
      }
      if (topicId) {
        query = query.eq("topic_id", topicId);
      }
      if (type) {
        query = query.eq("type", type);
      }
      if (difficulty) {
        query = query.eq("difficulty", parseInt(difficulty));
      }
    }

    query = query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data: questions, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch tags for each question
    if (questions && questions.length > 0) {
      const qIds = questions.map((q) => q.id);
      const { data: tagLinks } = await supabase
        .from("question_tag_links")
        .select("question_id, tag_id, question_tags(id, name, slug, category_id, question_tag_categories(id, name, slug))")
        .in("question_id", qIds);

      const tagsByQuestion: Record<string, typeof tagLinks> = {};
      for (const link of tagLinks || []) {
        if (!tagsByQuestion[link.question_id]) tagsByQuestion[link.question_id] = [];
        tagsByQuestion[link.question_id]!.push(link);
      }

      for (const q of questions) {
        (q as Record<string, unknown>).tags = (tagsByQuestion[q.id] || [])
          .map((l) => l.question_tags)
          .filter(Boolean);
      }
    }

    return NextResponse.json({
      questions,
      total: count || 0,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    console.error("获取题目列表失败:", error);
    return NextResponse.json({ error: "获取题目列表失败" }, { status: 500 });
  }
}

// POST /api/questions - 手动创建题目
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "teacher"].includes(profile.role)) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const body = await request.json();
    const { topic_id, type, content, difficulty, tag_ids } = body;

    if (!type || !content || !content.stem || !content.answer) {
      return NextResponse.json(
        { error: "缺少必填字段：type, content.stem, content.answer" },
        { status: 400 }
      );
    }

    // topic_id is now optional when using tag system
    if (!topic_id && (!tag_ids || tag_ids.length === 0)) {
      return NextResponse.json(
        { error: "请选择至少一个知识点标签或传统知识点" },
        { status: 400 }
      );
    }

    const { data: question, error } = await supabase
      .from("questions")
      .insert({
        topic_id: topic_id || null,
        type,
        content,
        difficulty: difficulty || 3,
        source_type: "manual",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create tag links if tag_ids provided
    if (tag_ids && tag_ids.length > 0 && question) {
      const tagLinks = tag_ids.map((tagId: string) => ({
        question_id: question.id,
        tag_id: tagId,
      }));
      await supabase.from("question_tag_links").insert(tagLinks);
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("创建题目失败:", error);
    return NextResponse.json({ error: "创建题目失败" }, { status: 500 });
  }
}
