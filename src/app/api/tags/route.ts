import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/tags — fetch tag list
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const categorySlug = searchParams.get("category_slug");
    const parentId = searchParams.get("parent_id");

    let query = supabase
      .from("question_tags")
      .select("*, question_tag_categories(id, name, slug, allow_multiple)")
      .order("sort_order");

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    } else if (categorySlug) {
      // Filter by category slug via subquery
      const { data: cat } = await supabase
        .from("question_tag_categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();
      if (cat) query = query.eq("category_id", cat.id);
    }

    if (parentId === "null") {
      query = query.is("parent_id", null);
    } else if (parentId) {
      query = query.eq("parent_id", parentId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tags: data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// POST /api/tags — create tag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { category_id, name, slug, parent_id, sort_order, metadata } = body;

    if (!category_id || !name) {
      return NextResponse.json({ error: "category_id and name are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("question_tags")
      .insert({
        category_id,
        name,
        slug: slug || null,
        parent_id: parent_id || null,
        sort_order: sort_order ?? 0,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tag: data });
  } catch {
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

// DELETE /api/tags?id=xxx — delete tag
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabase.from("question_tags").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
