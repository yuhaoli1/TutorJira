import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

interface AnswerToCheck {
  question_id: string;
  student_answer: string;
  correct_answer: string;
  stem: string;
  type: string;
}

// POST /api/tasks/check-answers - 用 AI 批量判断学生答案是否正确
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { answers } = (await request.json()) as { answers: AnswerToCheck[] };
    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: "没有需要检查的答案" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      // fallback: 简单字符串比较
      const results = answers.map((a) => ({
        question_id: a.question_id,
        is_correct: simpleFallbackCompare(a.student_answer, a.correct_answer),
      }));
      return NextResponse.json({ results });
    }

    // 选择题直接比较，不需要 AI
    const choiceAnswers = answers.filter((a) => a.type === "choice");
    const nonChoiceAnswers = answers.filter((a) => a.type !== "choice");

    const choiceResults = choiceAnswers.map((a) => ({
      question_id: a.question_id,
      is_correct: simpleFallbackCompare(a.student_answer, a.correct_answer),
    }));

    // 非选择题用 AI 判断
    let aiResults: { question_id: string; is_correct: boolean }[] = [];

    if (nonChoiceAnswers.length > 0) {
      const prompt = buildCheckPrompt(nonChoiceAnswers);

      const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          max_tokens: 2048,
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `你是一个小学数学答案判断助手。你的任务是判断学生的答案是否正确。
注意：
- 答案的表达方式可能不同但含义相同（例如"兔12只，鸡23只"和"鸡23只，兔12只"都算正确）
- 数学表达式等价也算正确（例如"1/2"和"0.5"）
- 单位不同但数值正确也算正确（例如"12只"和"12"）
- 答案顺序不同但内容完整也算正确
- 选择题只需比较选项字母
- 如果学生答案为空，直接判为错误
你必须严格按照 JSON 格式返回结果，不要输出任何其他内容。`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        console.error("DeepSeek check-answers failed:", await response.text());
        // fallback
        aiResults = nonChoiceAnswers.map((a) => ({
          question_id: a.question_id,
          is_correct: simpleFallbackCompare(a.student_answer, a.correct_answer),
        }));
      } else {
        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content || "";
        aiResults = parseAIResults(rawText, nonChoiceAnswers);
      }
    }

    return NextResponse.json({ results: [...choiceResults, ...aiResults] });
  } catch (error) {
    console.error("答案检查失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "答案检查失败" },
      { status: 500 },
    );
  }
}

function buildCheckPrompt(answers: AnswerToCheck[]): string {
  const items = answers
    .map(
      (a, i) => `题目${i + 1}:
题干: ${a.stem}
标准答案: ${a.correct_answer}
学生答案: ${a.student_answer}`,
    )
    .join("\n\n");

  return `请判断以下每道题学生的答案是否正确，返回 JSON 数组格式：
[{"index": 0, "is_correct": true/false}, ...]

${items}`;
}

function parseAIResults(
  rawText: string,
  answers: AnswerToCheck[],
): { question_id: string; is_correct: boolean }[] {
  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return answers.map((a) => ({
        question_id: a.question_id,
        is_correct: simpleFallbackCompare(a.student_answer, a.correct_answer),
      }));
    }
    const parsed = JSON.parse(jsonMatch[0]) as { index: number; is_correct: boolean }[];
    return answers.map((a, i) => ({
      question_id: a.question_id,
      is_correct: parsed.find((r) => r.index === i)?.is_correct ?? simpleFallbackCompare(a.student_answer, a.correct_answer),
    }));
  } catch {
    return answers.map((a) => ({
      question_id: a.question_id,
      is_correct: simpleFallbackCompare(a.student_answer, a.correct_answer),
    }));
  }
}

// 简单 fallback 比较（去空格标点后比较，支持顺序无关）
function simpleFallbackCompare(student: string, correct: string): boolean {
  const normalize = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[，。！？、；：""''（）【】]/g, "");
  const a = normalize(student);
  const b = normalize(correct);
  if (a === b) return true;
  // 顺序无关
  const split = (s: string) =>
    s
      .split(/[,，、；;]/)
      .map((x) => x.trim().toLowerCase().replace(/\s+/g, ""))
      .filter(Boolean)
      .sort()
      .join("|");
  return split(student) === split(correct);
}
