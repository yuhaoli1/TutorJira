import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Sample question data keyed by subtopic title. Currently empty — every topic
// is skipped — until a Common Core Math 5–6 sample set is authored.
const SAMPLE_QUESTIONS: Record<string, {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
}> = {};

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all knowledge topics (children only - the ones with parent_id)
    const { data: topics, error: topicError } = await supabase
      .from("knowledge_topics")
      .select("id, title, parent_id")
      .not("parent_id", "is", null);

    if (topicError || !topics) {
      return NextResponse.json({ error: "Failed to fetch topics: " + topicError?.message }, { status: 500 });
    }

    // Also get a teacher/admin user to set as created_by
    const { data: admin } = await supabase
      .from("users")
      .select("id")
      .in("role", ["admin", "teacher"])
      .limit(1)
      .single();

    if (!admin) {
      return NextResponse.json({ error: "No admin/teacher user found" }, { status: 500 });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const topic of topics) {
      const question = SAMPLE_QUESTIONS[topic.title];
      if (!question) {
        skipped++;
        continue;
      }

      // Check if a question already exists for this topic
      const { data: existing } = await supabase
        .from("questions")
        .select("id")
        .eq("topic_id", topic.id)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { data: newQ, error: insertError } = await supabase
        .from("questions")
        .insert({
          topic_id: topic.id,
          type: question.type,
          content: {
            stem: question.stem,
            options: question.options,
            answer: question.answer,
            explanation: question.explanation,
          },
          difficulty: question.difficulty,
          source_type: "manual",
          created_by: admin.id,
        })
        .select("id")
        .single();

      if (insertError) {
        errors.push(`${topic.title}: ${insertError.message}`);
      } else if (newQ) {
        inserted++;
        // Also create tag links for the knowledge point
        const { data: kpTag } = await supabase
          .from("question_tags")
          .select("id")
          .eq("metadata->>legacy_topic_id", topic.id)
          .limit(1)
          .single();
        if (kpTag) {
          await supabase.from("question_tag_links").insert({ question_id: newQ.id, tag_id: kpTag.id });
        }
        // Tag for type
        const { data: typeTag } = await supabase
          .from("question_tags")
          .select("id")
          .eq("slug", question.type)
          .limit(1)
          .single();
        if (typeTag) {
          await supabase.from("question_tag_links").insert({ question_id: newQ.id, tag_id: typeTag.id });
        }
        // Tag for difficulty
        const { data: diffTag } = await supabase
          .from("question_tags")
          .select("id")
          .eq("slug", String(question.difficulty))
          .limit(1)
          .single();
        if (diffTag) {
          await supabase.from("question_tag_links").insert({ question_id: newQ.id, tag_id: diffTag.id });
        }
      }
    }

    return NextResponse.json({
      message: `Inserted ${inserted} sample questions, skipped ${skipped} knowledge topics`,
      inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Seed questions error:", error);
    return NextResponse.json({ error: "Failed to seed questions" }, { status: 500 });
  }
}
