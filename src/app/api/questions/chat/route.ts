import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

// POST /api/questions/chat - 题库 AI 对话
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { message, history } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    // 获取题库摘要信息（使用标签系统，限制数据量）
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
        return `- ${parent.name}（${qCount}题）${children.length > 0 ? `\n  子知识点: ${children.map((c) => c.name).join("、")}` : ""}`;
      })
      .join("\n");

    // 搜索相关题目
    const relevantQuestions = findRelevantQuestions(message, questions, knowledgeTags, qTagMap, 10);
    const questionsContext = relevantQuestions
      .map((q, i) => {
        const content = q.content as { stem?: string; options?: string[]; answer?: string; explanation?: string };
        const qTags = (qTagMap[q.id] || []).map((tid) => allTags.find((t) => t.id === tid)?.name).filter(Boolean);
        return `题目${i + 1} [${q.type}] [难度${q.difficulty}] [${qTags.join(", ") || "未分类"}]
题干: ${content.stem || ""}
${content.options ? `选项: ${content.options.join(" | ")}` : ""}
答案: ${content.answer || "无"}
${content.explanation ? `解析: ${content.explanation}` : ""}`;
      })
      .join("\n\n");

    const systemPrompt = `你是一个专业的数学题库AI助手，服务于小学奥数辅导机构。你可以：
1. 从题库中查找和推荐题目
2. 基于题库中的原题生成变体题（改变数字、情境，保持同类型同难度）
3. 按知识点、难度、题型筛选题目
4. 回答关于题库内容的统计问题

当前题库概况：
共 ${questions.length} 道题目，涵盖以下知识点：
${topicSummary}

${relevantQuestions.length > 0 ? `与用户问题可能相关的题目：\n${questionsContext}` : ""}

回复规则：
- 用中文回答
- 如果用户要求出题或找题，优先从题库中找原题展示
- 如果用户要求变体题，先展示原题，再基于原题生成变体（保持知识点和难度一致，改变具体数字或情境）
- 题目展示格式清晰，标注题型和难度
- 如果题库中没有相关题目，告知用户并提供建议`;

    // 调用 DeepSeek
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI 服务未配置" }, { status: 500 });
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
      throw new Error(`AI 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "抱歉，我没能生成回复。";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI 对话失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 对话失败" },
      { status: 500 }
    );
  }
}

// 简单的关键词匹配找相关题目
function findRelevantQuestions(
  message: string,
  questions: { id: string; content: unknown; type: string; difficulty: number }[],
  knowledgeTags: { id: string; name: string; parent_id: string | null }[],
  qTagMap: Record<string, string[]>,
  limit: number
) {
  // 找到消息中提到的知识点标签
  const matchedTagIds = new Set<string>();
  for (const tag of knowledgeTags) {
    const cleanName = tag.name.replace(/^第\d+讲[：:]/, "");
    if (message.includes(cleanName) || message.includes(tag.name)) {
      matchedTagIds.add(tag.id);
      // 也加入子标签
      for (const child of knowledgeTags.filter((t) => t.parent_id === tag.id)) {
        matchedTagIds.add(child.id);
      }
    }
  }

  // 检查难度要求
  const difficultyMatch = message.match(/难度\s*(\d)/);
  const targetDifficulty = difficultyMatch ? parseInt(difficultyMatch[1]) : null;

  // 检查题型要求
  let targetType: string | null = null;
  if (message.includes("选择题") || message.includes("选择")) targetType = "choice";
  if (message.includes("填空题") || message.includes("填空")) targetType = "fill_blank";
  if (message.includes("解答题") || message.includes("解答")) targetType = "solution";

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

  // 如果没有匹配，随机取一些
  if (filtered.length === 0 && questions.length > 0) {
    filtered = [...questions].sort(() => Math.random() - 0.5);
  }

  return filtered.slice(0, limit);
}
