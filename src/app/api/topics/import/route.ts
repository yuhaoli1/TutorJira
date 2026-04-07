import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MATH_TOPICS } from "@/lib/topics-data";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user permissions
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

    // Supports query params ?subject=Math Olympiad and ?mode=sync
    const url = new URL(request.url);
    const subject = url.searchParams.get("subject") || "Math Olympiad";
    const mode = url.searchParams.get("mode") || "create"; // create | sync

    // Currently only Math Olympiad is supported; topics-data for other subjects can be added later
    const topicsMap: Record<string, typeof MATH_TOPICS> = {
      "Math Olympiad": MATH_TOPICS,
    };

    const topicsData = topicsMap[subject];
    if (!topicsData) {
      return NextResponse.json(
        { error: `Unsupported subject: ${subject}, available: ${Object.keys(topicsMap).join(", ")}` },
        { status: 400 }
      );
    }

    if (mode === "sync") {
      // Sync mode: compare with existing data, add new topics and update existing ones (no deletes)
      return await syncTopics(supabase, topicsData, subject);
    }

    // Create mode: check if data already exists
    const { count } = await supabase
      .from("knowledge_topics")
      .select("*", { count: "exact", head: true })
      .eq("subject", subject);

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `${subject} knowledge topics already exist (${count} entries), use ?mode=sync to update`,
          existing_count: count
        },
        { status: 409 }
      );
    }

    const totalInserted = await insertTopics(supabase, topicsData, subject);

    return NextResponse.json({
      message: `${subject} knowledge topics imported successfully`,
      total_inserted: totalInserted,
    });
  } catch (error) {
    console.error("Knowledge topic import failed:", error);
    return NextResponse.json(
      { error: "Knowledge topic import failed" },
      { status: 500 }
    );
  }
}

async function insertTopics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicsData: typeof MATH_TOPICS,
  subject: string
): Promise<number> {
  let totalInserted = 0;

  for (const topic of topicsData) {
    const { data: parent, error: parentError } = await supabase
      .from("knowledge_topics")
      .insert({
        title: `Lesson ${topic.sortOrder}: ${topic.title}`,
        subject,
        difficulty: 3,
        sort_order: topic.sortOrder,
        parent_id: null,
      })
      .select("id")
      .single();

    if (parentError) {
      console.error("Failed to insert parent knowledge topic:", parentError);
      continue;
    }
    totalInserted++;

    for (let i = 0; i < topic.subtopics.length; i++) {
      const { error: childError } = await supabase
        .from("knowledge_topics")
        .insert({
          title: topic.subtopics[i],
          subject,
          difficulty: 3,
          sort_order: i + 1,
          parent_id: parent.id,
        });

      if (childError) {
        console.error("Failed to insert child knowledge topic:", childError);
        continue;
      }
      totalInserted++;
    }
  }

  return totalInserted;
}

async function syncTopics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicsData: typeof MATH_TOPICS,
  subject: string
) {
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  // Fetch existing knowledge topics
  const { data: existing } = await supabase
    .from("knowledge_topics")
    .select("*")
    .eq("subject", subject);

  const existingByTitle = new Map(
    (existing || []).map(t => [t.title, t])
  );

  for (const topic of topicsData) {
    const parentTitle = `Lesson ${topic.sortOrder}: ${topic.title}`;
    const existingParent = existingByTitle.get(parentTitle);

    let parentId: string;

    if (existingParent) {
      // Update sort order
      if (existingParent.sort_order !== topic.sortOrder) {
        await supabase
          .from("knowledge_topics")
          .update({ sort_order: topic.sortOrder })
          .eq("id", existingParent.id);
        updated++;
      } else {
        unchanged++;
      }
      parentId = existingParent.id;
    } else {
      // Insert new
      const { data: parent } = await supabase
        .from("knowledge_topics")
        .insert({
          title: parentTitle,
          subject,
          difficulty: 3,
          sort_order: topic.sortOrder,
          parent_id: null,
        })
        .select("id")
        .single();

      if (!parent) continue;
      parentId = parent.id;
      added++;
    }

    // Handle child knowledge topics
    for (let i = 0; i < topic.subtopics.length; i++) {
      const existingChild = existingByTitle.get(topic.subtopics[i]);
      if (existingChild) {
        unchanged++;
      } else {
        const { error } = await supabase
          .from("knowledge_topics")
          .insert({
            title: topic.subtopics[i],
            subject,
            difficulty: 3,
            sort_order: i + 1,
            parent_id: parentId,
          });
        if (!error) added++;
      }
    }
  }

  return NextResponse.json({
    message: `${subject} knowledge topics sync completed`,
    added,
    updated,
    unchanged,
  });
}
