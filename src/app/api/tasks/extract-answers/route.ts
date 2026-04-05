import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ANSWER_EXTRACTION_SYSTEM_PROMPT,
  ANSWER_EXTRACTION_USER_PROMPT,
} from "@/lib/ai/prompts";

const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";

interface QuestionInfo {
  index: number;
  stem: string;
  type: string;
  options?: string[];
  correct_answer?: string;
}

// POST /api/tasks/extract-answers — 从照片中识别学生答案
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const questionsJson = formData.get("questions") as string | null;

    if (!image || !questionsJson) {
      return NextResponse.json({ error: "缺少图片或题目信息" }, { status: 400 });
    }

    // 验证图片
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "只支持图片文件" }, { status: 400 });
    }
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "图片大小不能超过10MB" }, { status: 400 });
    }

    const questions: QuestionInfo[] = JSON.parse(questionsJson);

    // 图片转 base64
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = image.type;

    const apiKey = process.env.DOUBAO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI 服务未配置" }, { status: 500 });
    }

    const model = process.env.DOUBAO_MODEL || "doubao-1.5-vision-pro-250328";

    const response = await fetch(`${DOUBAO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0,
        messages: [
          { role: "system", content: ANSWER_EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              {
                type: "text",
                text: ANSWER_EXTRACTION_USER_PROMPT(questions),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("豆包答案识别失败:", errorText);
      return NextResponse.json(
        { error: `AI 识别失败: ${response.status}` },
        { status: 500 },
      );
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    // 解析 AI 返回的 JSON
    const answers = parseExtractedAnswers(rawText, questions);

    return NextResponse.json({ answers });
  } catch (error) {
    console.error("答案识别失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "答案识别失败" },
      { status: 500 },
    );
  }
}

function parseExtractedAnswers(
  rawText: string,
  questions: QuestionInfo[],
): { index: number; answer: string; is_correct: boolean }[] {
  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("无法从AI响应中提取JSON:", rawText);
      return questions.map((q) => ({ index: q.index, answer: "", is_correct: false }));
    }
    const parsed = JSON.parse(jsonMatch[0]) as { index: number; answer: string; is_correct?: boolean }[];

    // 确保每道题都有结果
    return questions.map((q) => {
      const found = parsed.find((r) => r.index === q.index);
      return {
        index: q.index,
        answer: found?.answer ? String(found.answer) : "",
        is_correct: found?.is_correct ?? false,
      };
    });
  } catch (e) {
    console.error("解析答案识别结果失败:", e);
    return questions.map((q) => ({ index: q.index, answer: "", is_correct: false }));
  }
}
