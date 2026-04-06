import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/questions/[id]/tags — 获取题目的所有标签
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("question_tag_links")
      .select("tag_id, question_tags(*, question_tag_categories(id, name, slug, allow_multiple))")
      .eq("question_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tags = (data || []).map((link) => link.question_tags).filter(Boolean);
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ error: "获取题目标签失败" }, { status: 500 });
  }
}

// PUT /api/questions/[id]/tags — 替换题目的所有标签
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tag_ids } = await request.json();

    if (!Array.isArray(tag_ids)) {
      return NextResponse.json({ error: "tag_ids 必须为数组" }, { status: 400 });
    }

    // 删除旧关联
    await supabase.from("question_tag_links").delete().eq("question_id", id);

    // 插入新关联
    if (tag_ids.length > 0) {
      const rows = tag_ids.map((tag_id: string) => ({ question_id: id, tag_id }));
      const { error } = await supabase.from("question_tag_links").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "更新题目标签失败" }, { status: 500 });
  }
}
