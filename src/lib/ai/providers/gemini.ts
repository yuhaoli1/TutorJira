import type { AIProvider, AIExtractionRequest, AIExtractionResponse, ExtractedQuestion } from "../types";
import {
  QUESTION_EXTRACTION_SYSTEM_PROMPT,
  QUESTION_EXTRACTION_USER_PROMPT_IMAGE,
  QUESTION_EXTRACTION_USER_PROMPT_TEXT,
} from "../prompts";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    this.model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY 环境变量未设置");
    }
  }

  async extractQuestions(request: AIExtractionRequest): Promise<AIExtractionResponse> {
    const contents = this.buildContents(request);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: QUESTION_EXTRACTION_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const questions = this.parseQuestions(rawText);
    return { questions, rawResponse: rawText };
  }

  private buildContents(request: AIExtractionRequest) {
    if (request.imageBase64 && request.imageMimeType) {
      return [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: request.imageMimeType,
                data: request.imageBase64,
              },
            },
            { text: QUESTION_EXTRACTION_USER_PROMPT_IMAGE },
          ],
        },
      ];
    }

    if (request.textContent) {
      return [
        {
          role: "user",
          parts: [{ text: QUESTION_EXTRACTION_USER_PROMPT_TEXT(request.textContent) }],
        },
      ];
    }

    throw new Error("必须提供图片或文本内容");
  }

  private parseQuestions(rawText: string): ExtractedQuestion[] {
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("无法从AI响应中提取JSON:", rawText);
        return [];
      }
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((q: Record<string, unknown>) => ({
        stem: String(q.stem || ""),
        type: (["choice", "fill_blank", "solution"].includes(q.type as string)
          ? q.type
          : "solution") as ExtractedQuestion["type"],
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        answer: String(q.answer || "待填写"),
        explanation: q.explanation ? String(q.explanation) : undefined,
        difficulty: Math.min(5, Math.max(1, Number(q.difficulty) || 3)),
      }));
    } catch (e) {
      console.error("解析AI响应失败:", e);
      return [];
    }
  }
}
