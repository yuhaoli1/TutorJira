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

// POST /api/tasks/check-answers - use AI to batch-check whether student answers are correct
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { answers } = (await request.json()) as { answers: AnswerToCheck[] };
    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: "No answers to check" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      // fallback: simple string comparison
      const results = answers.map((a) => ({
        question_id: a.question_id,
        is_correct: simpleFallbackCompare(a.student_answer, a.correct_answer),
      }));
      return NextResponse.json({ results });
    }

    // Multiple-choice questions are compared directly, no AI needed
    const choiceAnswers = answers.filter((a) => a.type === "choice");
    const nonChoiceAnswers = answers.filter((a) => a.type !== "choice");

    const choiceResults = choiceAnswers.map((a) => ({
      question_id: a.question_id,
      is_correct: simpleFallbackCompare(a.student_answer, a.correct_answer),
    }));

    // Non-multiple-choice questions use AI for grading
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
              content: `You are an elementary-school math answer grading assistant. Your job is to determine whether the student's answer is correct.
Notes:
- Answers may be expressed differently but mean the same thing (e.g. "12 rabbits, 23 chickens" and "23 chickens, 12 rabbits" are both correct)
- Equivalent mathematical expressions are also correct (e.g. "1/2" and "0.5")
- Different units but the same numeric value are correct (e.g. "12 items" and "12")
- Answers in a different order but with complete content are also correct
- For multiple choice, just compare the option letter
- If the student answer is empty, mark it as incorrect
You must strictly return the result in JSON format and output nothing else.`,
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
    console.error("Answer check failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Answer check failed" },
      { status: 500 },
    );
  }
}

function buildCheckPrompt(answers: AnswerToCheck[]): string {
  const items = answers
    .map(
      (a, i) => `Question ${i + 1}:
Stem: ${a.stem}
Reference answer: ${a.correct_answer}
Student answer: ${a.student_answer}`,
    )
    .join("\n\n");

  return `Determine whether the student's answer is correct for each question below, and return a JSON array in the format:
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

// Simple fallback comparison (strips whitespace/punctuation, order-independent)
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
  // Order-independent
  const split = (s: string) =>
    s
      .split(/[,，、；;]/)
      .map((x) => x.trim().toLowerCase().replace(/\s+/g, ""))
      .filter(Boolean)
      .sort()
      .join("|");
  return split(student) === split(correct);
}
