import type { AIProvider, AIExtractionRequest, AIExtractionResponse, ExtractedQuestion } from "../types";
import {
  QUESTION_EXTRACTION_SYSTEM_PROMPT,
  QUESTION_EXTRACTION_USER_PROMPT_IMAGE,
  QUESTION_EXTRACTION_USER_PROMPT_TEXT,
} from "../prompts";

export class QwenProvider implements AIProvider {
  name = "qwen";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
    this.model = process.env.QWEN_MODEL || "qwen-vl-max";
    this.baseUrl = process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    if (!this.apiKey) {
      throw new Error("QWEN_API_KEY 或 DASHSCOPE_API_KEY 环境变量未设置");
    }
  }

  async extractQuestions(request: AIExtractionRequest): Promise<AIExtractionResponse> {
    const messages = this.buildMessages(request);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: QUESTION_EXTRACTION_SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`通义千问 API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    const questions = this.parseQuestions(rawText);
    return { questions, rawResponse: rawText };
  }

  private buildMessages(request: AIExtractionRequest) {
    if (request.imageBase64 && request.imageMimeType) {
      return [
        {
          role: "user" as const,
          content: [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${request.imageMimeType};base64,${request.imageBase64}`,
              },
            },
            {
              type: "text" as const,
              text: QUESTION_EXTRACTION_USER_PROMPT_IMAGE,
            },
          ],
        },
      ];
    }

    if (request.textContent) {
      return [
        {
          role: "user" as const,
          content: QUESTION_EXTRACTION_USER_PROMPT_TEXT(request.textContent),
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
