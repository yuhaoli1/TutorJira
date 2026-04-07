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

// POST /api/tasks/extract-answers — recognize student answers from a photo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const questionsJson = formData.get("questions") as string | null;

    if (!image || !questionsJson) {
      return NextResponse.json({ error: "Missing image or question info" }, { status: 400 });
    }

    // Validate image
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
    }
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size must not exceed 10MB" }, { status: 400 });
    }

    const questions: QuestionInfo[] = JSON.parse(questionsJson);

    // Convert image to base64
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = image.type;

    const apiKey = process.env.DOUBAO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is not configured" }, { status: 500 });
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
      console.error("Doubao answer extraction failed:", errorText);
      return NextResponse.json(
        { error: `AI extraction failed: ${response.status}` },
        { status: 500 },
      );
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    // Parse JSON returned by AI
    const answers = parseExtractedAnswers(rawText, questions);

    return NextResponse.json({ answers });
  } catch (error) {
    console.error("Answer extraction failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Answer extraction failed" },
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
      console.error("Failed to extract JSON from AI response:", rawText);
      return questions.map((q) => ({ index: q.index, answer: "", is_correct: false }));
    }
    const parsed = JSON.parse(jsonMatch[0]) as { index: number; answer: string; is_correct?: boolean }[];

    // Ensure every question has a result
    return questions.map((q) => {
      const found = parsed.find((r) => r.index === q.index);
      return {
        index: q.index,
        answer: found?.answer ? String(found.answer) : "",
        is_correct: found?.is_correct ?? false,
      };
    });
  } catch (e) {
    console.error("Failed to parse answer extraction result:", e);
    return questions.map((q) => ({ index: q.index, answer: "", is_correct: false }));
  }
}
