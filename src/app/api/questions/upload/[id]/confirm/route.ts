import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/questions/upload/[id]/confirm - 确认保存题目
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 获取上传记录
    const { data: upload, error: fetchError } = await supabase
      .from("question_uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json({ error: "上传记录不存在" }, { status: 404 });
    }

    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "请提供题目数组" },
        { status: 400 }
      );
    }

    // 批量插入题目
    const insertData = questions.map((q: {
      topic_id?: string;
      type: string;
      stem: string;
      options?: string[];
      answer: string;
      explanation?: string;
      difficulty: number;
      tag_ids?: string[];
    }) => ({
      type: q.type as "choice" | "fill_blank" | "solution",
      content: {
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      },
      difficulty: q.difficulty || 3,
      source_type: "ai_upload",
      source_file_url: upload.file_url,
      created_by: user.id,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("questions")
      .insert(insertData)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: "保存题目失败: " + insertError.message },
        { status: 500 }
      );
    }

    // Create tag links for each inserted question
    if (inserted) {
      const allTagLinks: { question_id: string; tag_id: string }[] = [];
      for (let i = 0; i < inserted.length; i++) {
        const q = questions[i];
        const tagIds: string[] = q.tag_ids || [];
        for (const tagId of tagIds) {
          allTagLinks.push({ question_id: inserted[i].id, tag_id: tagId });
        }
      }
      if (allTagLinks.length > 0) {
        await supabase.from("question_tag_links").insert(allTagLinks);
      }
    }

    // 更新上传记录的题目数量
    await supabase
      .from("question_uploads")
      .update({ question_count: inserted?.length || 0 })
      .eq("id", id);

    return NextResponse.json({
      message: "题目保存成功",
      count: inserted?.length || 0,
      questions: inserted,
    });
  } catch (error) {
    console.error("保存题目失败:", error);
    return NextResponse.json({ error: "保存题目失败" }, { status: 500 });
  }
}
