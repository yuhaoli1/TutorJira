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

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("获取做题记录失败:", error);
    return NextResponse.json({ error: "获取做题记录失败" }, { status: 500 });
  }
}
