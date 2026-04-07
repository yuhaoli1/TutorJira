import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/questions/[id] - edit question
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "teacher"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.content !== undefined) updateData.content = body.content;

    // Derive legacy fields from tags if tag_ids provided
    if (body.tag_ids && body.tag_ids.length > 0) {
      const { data: tagDetails } = await supabase
        .from("question_tags")
        .select("slug, question_tag_categories(slug)")
        .in("id", body.tag_ids);

      for (const tag of tagDetails || []) {
        const catSlug = (tag.question_tag_categories as unknown as { slug: string } | null)?.slug;
        if (catSlug === "question_type" && tag.slug) updateData.type = tag.slug;
        if (catSlug === "difficulty" && tag.slug) updateData.difficulty = parseInt(tag.slug) || 3;
      }

      // Replace all tag links
      await supabase.from("question_tag_links").delete().eq("question_id", id);
      const tagLinks = body.tag_ids.map((tagId: string) => ({
        question_id: id,
        tag_id: tagId,
      }));
      await supabase.from("question_tag_links").insert(tagLinks);
    }

    if (Object.keys(updateData).length > 0) {
      const { data: question, error } = await supabase
        .from("questions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ question });
    }

    // If only tags changed, fetch and return
    const { data: question, error } = await supabase
      .from("questions")
      .select()
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Failed to update question:", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

// DELETE /api/questions/[id] - delete question
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "teacher"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete question:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
