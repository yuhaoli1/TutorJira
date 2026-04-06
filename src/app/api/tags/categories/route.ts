import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/tags/categories — 获取所有标签维度（可附带标签列表）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeTags = searchParams.get("include_tags") === "true";

    if (includeTags) {
      const { data, error } = await supabase
        .from("question_tag_categories")
        .select("*, question_tags(*)")
        .order("sort_order");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Sort tags within each category
      const sorted = (data || []).map((cat) => ({
        ...cat,
        question_tags: (cat.question_tags || []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
        ),
      }));

      return NextResponse.json({ categories: sorted });
    }

    const { data, error } = await supabase
      .from("question_tag_categories")
      .select("*")
      .order("sort_order");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ categories: data });
  } catch {
    return NextResponse.json({ error: "获取标签维度失败" }, { status: 500 });
  }
}

// POST /api/tags/categories — 创建标签维度
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { name, slug, description, allow_multiple, sort_order } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "name 和 slug 必填" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("question_tag_categories")
      .insert({ name, slug, description, allow_multiple, sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ category: data });
  } catch {
    return NextResponse.json({ error: "创建标签维度失败" }, { status: 500 });
  }
}
