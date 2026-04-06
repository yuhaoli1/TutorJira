import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/questions/attempts - 提交答案
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // Find the student record linked to this user
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "未找到学生记录" }, { status: 404 });
    }

    const body = await request.json();
    const { question_id, answer, is_correct, time_spent_seconds } = body;

    if (!question_id || answer === undefined || is_correct === undefined) {
      return NextResponse.json(
        { error: "缺少必填字段：question_id, answer, is_correct" },
        { status: 400 }
      );
    }

    const { data: attempt, error } = await supabase
      .from("question_attempts")
      .insert({
        question_id,
        student_id: student.id,
        answer: String(answer),
        is_correct,
        time_spent_seconds: time_spent_seconds || null,
      })
      .select()
      .single();

    if (error) {
      console.error("提交答案失败:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("提交答案失败:", error);
    return NextResponse.json({ error: "提交答案失败" }, { status: 500 });
  }
}

// GET /api/questions/attempts - 获取做题记录
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "未找到学生记录" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const wrongOnly = searchParams.get("wrong_only") === "true";
    const topicId = searchParams.get("topic_id");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("question_attempts")
      .select("*, questions(*, knowledge_topics(id, title))")
      .eq("student_id", student.id)
      .order("attempted_at", { ascending: false })
      .limit(limit);

    if (wrongOnly) {
      query = query.eq("is_correct", false);
    }

    if (topicId) {
      query = query.eq("questions.topic_id", topicId);
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error("获取做题记录失败:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 为错题查找来源任务（ticket_number + 任务标题）
    if (wrongOnly && attempts && attempts.length > 0) {
      const questionIds = [...new Set(attempts.map((a: { question_id: string }) => a.question_id))];
      const { data: sources } = await supabase
        .from("task_submission_answers")
        .select("question_id, task_assignments(ticket_number, tasks(title))")
        .in("question_id", questionIds)
        .eq("is_correct", false)
        .order("submitted_at", { ascending: false });

      if (sources) {
        // 每个 question_id 取第一个（最近的）来源
        const sourceMap = new Map<string, { ticket_number: string; task_title: string }>();
        for (const s of sources) {
          if (!sourceMap.has(s.question_id) && s.task_assignments) {
            const ta = s.task_assignments as unknown as { ticket_number: string; tasks: { title: string } | null };
            if (ta.ticket_number) {
              sourceMap.set(s.question_id, {
                ticket_number: ta.ticket_number,
                task_title: ta.tasks?.title || "",
              });
            }
          }
        }
        // 注入来源信息到每条 attempt
        for (const a of attempts) {
          const src = sourceMap.get(a.question_id);
          if (src) (a as Record<string, unknown>).source = src;
        }
      }
    }

    // Fetch tags for each question
    if (attempts && attempts.length > 0) {
      const qIds = [...new Set(attempts.map((a: { question_id: string }) => a.question_id))];
      const { data: tagLinks } = await supabase
        .from("question_tag_links")
        .select("question_id, question_tags(id, name, slug, category_id, question_tag_categories(id, name, slug))")
        .in("question_id", qIds);

      if (tagLinks) {
        const tagMap: Record<string, unknown[]> = {};
        for (const link of tagLinks) {
          if (!tagMap[link.question_id]) tagMap[link.question_id] = [];
          if (link.question_tags) tagMap[link.question_id].push(link.question_tags);
        }
        for (const a of attempts) {
          const q = (a as Record<string, unknown>).questions as Record<string, unknown> | null;
          if (q) q.tags = tagMap[a.question_id] || [];
        }
      }
    }

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("获取做题记录失败:", error);
    return NextResponse.json({ error: "获取做题记录失败" }, { status: 500 });
  }
}
