import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

// POST /api/questions/chat - question bank AI chat
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { message, history } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    // Fetch question bank summary (uses tag system, with row limits)
    const [questionsResult, tagLinksResult, tagsResult] = await Promise.all([
      supabase.from("questions").select("id, content, type, difficulty").limit(500),
      supabase.from("question_tag_links").select("question_id, tag_id").limit(2000),
      supabase.from("question_tags").select("id, name, slug, parent_id, category_id, question_tag_categories(slug)"),
    ]);

    const questions = questionsResult.data || [];
    const tagLinks = tagLinksResult.data || [];
    const allTags = tagsResult.data || [];

    // Build tag lookup
    const knowledgeTags = allTags.filter((t) => (t.question_tag_categories as unknown as { slug: string } | null)?.slug === "knowledge_point");
    const rootKnowledgeTags = knowledgeTags.filter((t) => !t.parent_id);
    const childKnowledgeTags = knowledgeTags.filter((t) => t.parent_id);

    // Map question -> tag IDs
    const qTagMap: Record<string, string[]> = {};
    for (const link of tagLinks) {
      if (!qTagMap[link.question_id]) qTagMap[link.question_id] = [];
      qTagMap[link.question_id].push(link.tag_id);
    }

    // Build topic summary from knowledge tags
    const topicSummary = rootKnowledgeTags
      .map((parent) => {
        const children = childKnowledgeTags.filter((t) => t.parent_id === parent.id);
        const allIds = [parent.id, ...children.map((c) => c.id)];
        const qCount = questions.filter((q) => (qTagMap[q.id] || []).some((tid) => allIds.includes(tid))).length;
        return `- ${parent.name} (${qCount} questions)${children.length > 0 ? `\n  Subtopics: ${children.map((c) => c.name).join(", ")}` : ""}`;
      })
      .join("\n");

    // Search for relevant questions
    const relevantQuestions = findRelevantQuestions(message, questions, knowledgeTags, qTagMap, 10);
    const questionsContext = relevantQuestions
      .map((q, i) => {
        const content = q.content as { stem?: string; options?: string[]; answer?: string; explanation?: string };
        const qTags = (qTagMap[q.id] || []).map((tid) => allTags.find((t) => t.id === tid)?.name).filter(Boolean);
        return `Question ${i + 1} [${q.type}] [difficulty ${q.difficulty}] [${qTags.join(", ") || "uncategorized"}]
Stem: ${content.stem || ""}
${content.options ? `Options: ${content.options.join(" | ")}` : ""}
Answer: ${content.answer || "none"}
${content.explanation ? `Explanation: ${content.explanation}` : ""}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a professional math question bank AI assistant, serving an elementary-school Math Olympiad tutoring institution. You can:
1. Search for and recommend questions from the question bank
2. Generate variant questions based on existing questions (change numbers and scenarios, keep the same type and difficulty)
3. Filter questions by knowledge point, difficulty, and question type
4. Answer statistical questions about the contents of the question bank

Current question bank overview:
A total of ${questions.length} questions, covering the following knowledge points:
${topicSummary}

${relevantQuestions.length > 0 ? `Questions possibly relevant to the user's question:\n${questionsContext}` : ""}

Reply rules:
- Answer in English
- If the user asks for a question or to find one, prioritize showing original questions from the bank
- If the user asks for variants, first display the original question, then generate variants based on it (keep the same knowledge point and difficulty, change specific numbers or scenarios)
- Display questions in a clear format, labeled with type and difficulty
- If no relevant questions are in the bank, tell the user and offer suggestions`;

    // Call DeepSeek
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is not configured" }, { status: 500 });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: { role: string; content: string }) => ({
        role: h.role,
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        max_tokens: 4096,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI call failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I could not generate a reply.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI chat failed" },
      { status: 500 }
    );
  }
}

// Simple keyword matching to find relevant questions
function findRelevantQuestions(
  message: string,
  questions: { id: string; content: unknown; type: string; difficulty: number }[],
  knowledgeTags: { id: string; name: string; parent_id: string | null }[],
  qTagMap: Record<string, string[]>,
  limit: number
) {
  // Find knowledge-point tags mentioned in the message
  const matchedTagIds = new Set<string>();
  for (const tag of knowledgeTags) {
    const cleanName = tag.name.replace(/^Lesson \d+:\s*/, "");
    if (message.includes(cleanName) || message.includes(tag.name)) {
      matchedTagIds.add(tag.id);
      // Also include child tags
      for (const child of knowledgeTags.filter((t) => t.parent_id === tag.id)) {
        matchedTagIds.add(child.id);
      }
    }
  }

  // Check difficulty requirement
  const difficultyMatch = message.match(/difficulty\s*(\d)/i);
  const targetDifficulty = difficultyMatch ? parseInt(difficultyMatch[1]) : null;

  // Check question type requirement
  let targetType: string | null = null;
  if (message.includes("multiple choice") || message.includes("choice")) targetType = "choice";
  if (message.includes("fill in the blank") || message.includes("fill")) targetType = "fill_blank";
  if (message.includes("solution") || message.includes("solve")) targetType = "solution";

  let filtered = questions;

  if (matchedTagIds.size > 0) {
    filtered = filtered.filter((q) => (qTagMap[q.id] || []).some((tid) => matchedTagIds.has(tid)));
  }
  if (targetDifficulty) {
    filtered = filtered.filter((q) => q.difficulty >= targetDifficulty);
  }
  if (targetType) {
    filtered = filtered.filter((q) => q.type === targetType);
  }

  // If no matches, pick some at random
  if (filtered.length === 0 && questions.length > 0) {
    filtered = [...questions].sort(() => Math.random() - 0.5);
  }

  return filtered.slice(0, limit);
}
